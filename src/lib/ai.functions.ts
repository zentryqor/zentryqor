import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAppwriteAuth } from "@/integrations/appwrite/auth-middleware";

const FREE_DAILY_CREDITS = 150;
const PREMIUM_DAILY_CREDITS = 1000;
const TEXT_COST = 10;
const IMAGE_COST = 30;

type SupaClient = any;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

async function userIsPremium(supabase: SupaClient, userId: string): Promise<boolean> {
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

async function getCreditsState(supabase: SupaClient, userId: string) {
  const isPremium = await userIsPremium(supabase, userId);
  const limit = isPremium ? PREMIUM_DAILY_CREDITS : FREE_DAILY_CREDITS;
  const day = todayUtc();
  const { data } = await supabase
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
  const used = data?.used ?? 0;
  const bonus: number = profile?.bonus_credits ?? 0;
  const dailyRemaining = Math.max(0, limit - used);
  return {
    isPremium,
    limit,
    used,
    bonus,
    remaining: dailyRemaining + bonus,
    day,
    rowId: data?.id ?? null,
  };
}

async function spendCredits(supabase: SupaClient, userId: string, cost: number) {
  const state = await getCreditsState(supabase, userId);
  if (state.remaining < cost) {
    throw new Error(
      `Not enough credits. You need ${cost} credits but only have ${state.remaining} left (${state.isPremium ? "Premium" : "Free"} plan${state.bonus > 0 ? ` + ${state.bonus} bonus` : ""}).`,
    );
  }
  const dailyRoom = Math.max(0, state.limit - state.used);
  const fromDaily = Math.min(dailyRoom, cost);
  const fromBonus = cost - fromDaily;

  if (fromDaily > 0) {
    if (state.rowId) {
      const { data: updated, error } = await supabase
        .from("ai_credit_usage")
        .update({ used: state.used + fromDaily, updated_at: new Date().toISOString() })
        .eq("id", state.rowId)
        .select("id");
      if (error) throw new Error(`Could not record credit usage: ${error.message}`);
      if (!updated || updated.length === 0) throw new Error("Could not record credit usage.");
    } else {
      const { error } = await supabase
        .from("ai_credit_usage")
        .insert({ user_id: userId, day: state.day, used: fromDaily });
      if (error) throw new Error(`Could not record credit usage: ${error.message}`);
    }
  }
  if (fromBonus > 0) {
    const { error } = await supabase.rpc("consume_bonus_credits", {
      _user_id: userId,
      _amount: fromBonus,
    });
    if (error) throw new Error(`Could not record credit usage: ${error.message}`);
  }


  supabase.rpc("award_referral_bonus", { _referee: userId }).then(
    () => {},
    () => {},
  );

  return { isPremium: state.isPremium, limit: state.limit, used: state.used + fromDaily };
}

async function callLovableAiText(messages: Array<{ role: string; content: any }>) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://zentryqor.lovable.app",
      "X-Title": "Zentry Qor",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages,
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.9,
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("AI is busy right now — please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

export const getAiCredits = createServerFn({ method: "GET" })
  .middleware([requireAppwriteAuth])
  .handler(async ({ context }) => {
    const state = await getCreditsState(context.supabase, context.userId);
    return {
      used: state.used,
      limit: state.limit,
      remaining: state.remaining,
      isPremium: state.isPremium,
      costs: { text: TEXT_COST, image: IMAGE_COST },
    };
  });

export const generateAiText = createServerFn({ method: "POST" })
  .middleware([requireAppwriteAuth])
  .inputValidator((input) =>
    z
      .object({
        prompt: z.string().min(1).max(8000),
        system: z.string().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { enforceRateLimit } = await import("@/lib/security.server");
    await enforceRateLimit(`ai-text:${context.userId}`, 20, 60, "Too many AI text requests");
    const usage = await spendCredits(context.supabase, context.userId, TEXT_COST);
    try {
      const messages = [
        ...(data.system ? [{ role: "system", content: data.system }] : []),
        { role: "user", content: data.prompt },
      ];
      const json = await callLovableAiText(messages);
      const text: string = json.choices?.[0]?.message?.content ?? "";
      try { await context.supabase.rpc("award_referral_bonus", { _referee: context.userId }); } catch {}
      return { text, usage };
    } catch (e) {
      await context.supabase
        .from("ai_credit_usage")
        .update({ used: Math.max(0, usage.used - TEXT_COST) })
        .eq("user_id", context.userId)
        .eq("day", todayUtc());
      throw e;
    }
  });

export const generateAiImage = createServerFn({ method: "POST" })
  .middleware([requireAppwriteAuth])
  .inputValidator((input) =>
    z
      .object({
        prompt: z.string().min(1).max(2000),
        aspectRatio: z.enum(["16:9", "9:16", "4:3", "3:4"]).default("16:9"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { enforceRateLimit } = await import("@/lib/security.server");
    await enforceRateLimit(`ai-image:${context.userId}`, 10, 60, "Too many AI image requests");
    const usage = await spendCredits(context.supabase, context.userId, IMAGE_COST);

    try {
      const { generateGoogleImageDataUrl } = await import("@/lib/google-image.server");
      const image = await generateGoogleImageDataUrl({ prompt: data.prompt, aspectRatio: data.aspectRatio });

      try { await context.supabase.rpc("award_referral_bonus", { _referee: context.userId }); } catch {}
      return { image, usage };
    } catch (e: any) {
      await context.supabase
        .from("ai_credit_usage")
        .update({ used: Math.max(0, usage.used - IMAGE_COST) })
        .eq("user_id", context.userId)
        .eq("day", todayUtc());
      return { image: null, error: e?.message ?? "Image generation failed", usage };
    }
  });

// Backwards-compat shim — older clients may still call this; report as credits.
export const getThumbnailUsage = createServerFn({ method: "GET" })
  .middleware([requireAppwriteAuth])
  .handler(async ({ context }) => {
    const state = await getCreditsState(context.supabase, context.userId);
    return { used: state.used, limit: state.limit, isPremium: state.isPremium };
  });
