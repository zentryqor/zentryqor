import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AAI = "https://api.assemblyai.com/v2";
const CAPTION_COST = 50;
const FREE_DAILY_CREDITS = 150;
const PREMIUM_DAILY_CREDITS = 1000;

function keyOrThrow() {
  const k = process.env.ASSEMBLYAI_API_KEY;
  if (!k) throw new Error("AssemblyAI is not configured on this server.");
  return k;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

async function userIsPremium(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return false;
  const now = Date.now();
  const periodEnd = data.current_period_end ? new Date(data.current_period_end).getTime() : null;
  if (["active", "trialing", "past_due"].includes(data.status) && (!periodEnd || periodEnd > now)) return true;
  if (data.status === "canceled" && periodEnd && periodEnd > now) return true;
  return false;
}

async function spendCredits(supabase: any, userId: string, cost: number) {
  const isPremium = await userIsPremium(supabase, userId);
  const limit = isPremium ? PREMIUM_DAILY_CREDITS : FREE_DAILY_CREDITS;
  const day = todayUtc();
  const { data: usage } = await supabase
    .from("ai_credit_usage")
    .select("id, used")
    .eq("user_id", userId)
    .eq("day", day)
    .maybeSingle();
  const { data: profile } = await supabase
    .from("profiles")
    .select("bonus_credits")
    .eq("id", userId)
    .maybeSingle();
  const used: number = usage?.used ?? 0;
  const bonus: number = profile?.bonus_credits ?? 0;
  const dailyRemaining = Math.max(0, limit - used);
  const remaining = dailyRemaining + bonus;
  if (remaining < cost) {
    throw new Error(
      `Not enough credits. Caption generation costs ${cost} credits but you only have ${remaining} left (${isPremium ? "Premium" : "Free"} plan${bonus > 0 ? ` + ${bonus} bonus` : ""}).`,
    );
  }
  const fromDaily = Math.min(dailyRemaining, cost);
  const fromBonus = cost - fromDaily;
  if (fromDaily > 0) {
    if (usage?.id) {
      await supabase
        .from("ai_credit_usage")
        .update({ used: used + fromDaily, updated_at: new Date().toISOString() })
        .eq("id", usage.id);
    } else {
      await supabase.from("ai_credit_usage").insert({ user_id: userId, day, used: fromDaily });
    }
  }
  if (fromBonus > 0) {
    await supabase.rpc("consume_bonus_credits", { _user_id: userId, _amount: fromBonus });
  }
  return { fromDaily, day };
}

async function refundDailyCredits(supabase: any, userId: string, amount: number, day: string) {
  if (amount <= 0) return;
  const { data } = await supabase
    .from("ai_credit_usage")
    .select("id, used")
    .eq("user_id", userId)
    .eq("day", day)
    .maybeSingle();
  if (!data) return;
  await supabase
    .from("ai_credit_usage")
    .update({ used: Math.max(0, data.used - amount) })
    .eq("id", data.id);
}

/**
 * Uploads a base64-encoded audio/video blob to AssemblyAI and starts a
 * transcription job with word-level timestamps. Costs 50 credits.
 */
export const startTranscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        base64: z.string().min(100),
        contentType: z.string().default("video/mp4"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const spend = await spendCredits(context.supabase, context.userId, CAPTION_COST);
    try {
      const key = keyOrThrow();
      const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));

      const uploadRes = await fetch(`${AAI}/upload`, {
        method: "POST",
        headers: {
          authorization: key,
          "content-type": "application/octet-stream",
        },
        body: bytes,
      });
      if (!uploadRes.ok) {
        throw new Error(`Upload failed: ${uploadRes.status} ${await uploadRes.text().catch(() => "")}`);
      }
      const { upload_url } = (await uploadRes.json()) as { upload_url: string };

      const jobRes = await fetch(`${AAI}/transcript`, {
        method: "POST",
        headers: { authorization: key, "content-type": "application/json" },
        body: JSON.stringify({
          audio_url: upload_url,
          punctuate: true,
          format_text: true,
        }),
      });
      if (!jobRes.ok) {
        throw new Error(`Transcript start failed: ${jobRes.status} ${await jobRes.text().catch(() => "")}`);
      }
      const job = (await jobRes.json()) as { id: string };
      return { id: job.id, cost: CAPTION_COST };
    } catch (e) {
      await refundDailyCredits(context.supabase, context.userId, spend.fromDaily, spend.day);
      throw e;
    }
  });

export type CaptionWord = { text: string; start: number; end: number };

export const pollTranscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().min(4) }).parse(input))
  .handler(async ({ data }) => {
    const key = keyOrThrow();
    const res = await fetch(`${AAI}/transcript/${data.id}`, {
      headers: { authorization: key },
    });
    if (!res.ok) throw new Error(`Poll failed: ${res.status}`);
    const j = (await res.json()) as {
      status: "queued" | "processing" | "completed" | "error";
      error?: string;
      text?: string;
      words?: Array<{ text: string; start: number; end: number }>;
    };
    if (j.status === "error") throw new Error(j.error ?? "Transcription failed");
    return {
      status: j.status,
      text: j.text ?? "",
      words: (j.words ?? []) as CaptionWord[],
    };
  });

export type TimedSentence = { text: string; start: number; end: number };

/**
 * Returns sentence-level segments with start/end timings for a finished
 * AssemblyAI transcript. Used by the Speech Timestamps tool.
 */
export const pollSentences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().min(4) }).parse(input))
  .handler(async ({ data }) => {
    const key = keyOrThrow();
    const statusRes = await fetch(`${AAI}/transcript/${data.id}`, {
      headers: { authorization: key },
    });
    if (!statusRes.ok) throw new Error(`Poll failed: ${statusRes.status}`);
    const status = (await statusRes.json()) as {
      status: "queued" | "processing" | "completed" | "error";
      error?: string;
      text?: string;
    };
    if (status.status === "error") throw new Error(status.error ?? "Transcription failed");
    if (status.status !== "completed") {
      return { status: status.status, text: "", sentences: [] as TimedSentence[] };
    }

    const res = await fetch(`${AAI}/transcript/${data.id}/sentences`, {
      headers: { authorization: key },
    });
    if (!res.ok) throw new Error(`Sentences failed: ${res.status}`);
    const j = (await res.json()) as {
      sentences?: Array<{ text: string; start: number; end: number }>;
    };
    return {
      status: "completed" as const,
      text: status.text ?? "",
      sentences: (j.sentences ?? []).map((s) => ({
        text: s.text,
        start: s.start,
        end: s.end,
      })),
    };
  });
