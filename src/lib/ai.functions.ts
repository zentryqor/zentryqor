import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const FREE_DAILY_CREDITS = 150;
const PREMIUM_DAILY_CREDITS = 1000;
const TEXT_COST = 10;
const IMAGE_COST = 30;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

async function userIsPremium(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
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

async function getCreditsState(userId: string) {
  const isPremium = await userIsPremium(userId);
  const limit = isPremium ? PREMIUM_DAILY_CREDITS : FREE_DAILY_CREDITS;
  const day = todayUtc();
  const { data } = await supabaseAdmin
    .from("ai_credit_usage")
    .select("id, used")
    .eq("user_id", userId)
    .eq("day", day)
    .maybeSingle();
  const used = data?.used ?? 0;
  return { isPremium, limit, used, remaining: Math.max(0, limit - used), day, rowId: data?.id ?? null };
}

async function spendCredits(userId: string, cost: number) {
  const state = await getCreditsState(userId);
  if (state.used + cost > state.limit) {
    throw new Error(
      `Not enough credits. You need ${cost} credits but only have ${state.remaining} left today (${state.limit}/day on the ${state.isPremium ? "Premium" : "Free"} plan).`,
    );
  }
  if (state.rowId) {
    await supabaseAdmin
      .from("ai_credit_usage")
      .update({ used: state.used + cost, updated_at: new Date().toISOString() })
      .eq("id", state.rowId);
  } else {
    await supabaseAdmin
      .from("ai_credit_usage")
      .insert({ user_id: userId, day: state.day, used: cost });
  }
  return { isPremium: state.isPremium, limit: state.limit, used: state.used + cost };
}

async function callOpenRouter(model: string, messages: Array<{ role: string; content: any }>, modalities?: string[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

  const body: Record<string, unknown> = { model, messages };
  if (modalities) body.modalities = modalities;

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://zentryqor.lovable.app",
      "X-Title": "Zentry Qor",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

export const getAiCredits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const state = await getCreditsState(context.userId);
    return {
      used: state.used,
      limit: state.limit,
      remaining: state.remaining,
      isPremium: state.isPremium,
      costs: { text: TEXT_COST, image: IMAGE_COST },
    };
  });

export const generateAiText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        prompt: z.string().min(1).max(8000),
        system: z.string().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const usage = await spendCredits(context.userId, TEXT_COST);
    try {
      const messages = [
        ...(data.system ? [{ role: "system", content: data.system }] : []),
        { role: "user", content: data.prompt },
      ];
      const json = await callOpenRouter("openai/gpt-oss-120b:free", messages);
      const text: string = json.choices?.[0]?.message?.content ?? "";
      return { text, usage };
    } catch (e) {
      // Refund credits on failure
      await supabaseAdmin
        .from("ai_credit_usage")
        .update({ used: Math.max(0, usage.used - TEXT_COST) })
        .eq("user_id", context.userId)
        .eq("day", todayUtc());
      throw e;
    }
  });

export const generateAiImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        prompt: z.string().min(1).max(2000),
        aspectRatio: z.enum(["16:9", "9:16", "4:3", "3:4"]).default("16:9"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const usage = await spendCredits(context.userId, IMAGE_COST);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const sizeMap: Record<string, string> = {
      "16:9": "1536x1024",
      "9:16": "1024x1536",
      "4:3": "1536x1024",
      "3:4": "1024x1536",
    };
    const size = sizeMap[data.aspectRatio];

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-image-1-mini",
          prompt: data.prompt,
          size,
          quality: "low",
          n: 1,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        if (res.status === 429) throw new Error("Rate limit exceeded. Please try again shortly.");
        if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to your workspace.");
        throw new Error(`Image gen ${res.status}: ${text.slice(0, 300)}`);
      }

      const json = await res.json();
      const b64: string | undefined = json.data?.[0]?.b64_json;
      if (!b64) throw new Error("No image returned");

      return { image: `data:image/png;base64,${b64}`, usage };
    } catch (e) {
      await supabaseAdmin
        .from("ai_credit_usage")
        .update({ used: Math.max(0, usage.used - IMAGE_COST) })
        .eq("user_id", context.userId)
        .eq("day", todayUtc());
      throw e;
    }
  });

// Backwards-compat shim — older clients may still call this; report as credits.
export const getThumbnailUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const state = await getCreditsState(context.userId);
    return { used: state.used, limit: state.limit, isPremium: state.isPremium };
  });
