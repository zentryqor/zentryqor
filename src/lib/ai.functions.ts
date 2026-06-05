import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const FREE_DAILY_THUMBNAIL_LIMIT = 3;

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

export const generateAiText = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        prompt: z.string().min(1).max(8000),
        system: z.string().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const messages = [
      ...(data.system ? [{ role: "system", content: data.system }] : []),
      { role: "user", content: data.prompt },
    ];
    const json = await callOpenRouter("openai/gpt-oss-120b:free", messages);
    const text: string = json.choices?.[0]?.message?.content ?? "";
    return { text };
  });

async function userIsPremium(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("status, current_period_end, cancel_at_period_end")
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

export const getThumbnailUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const isPremium = await userIsPremium(userId);
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabaseAdmin
      .from("thumbnail_usage")
      .select("count")
      .eq("user_id", userId)
      .eq("day", today)
      .maybeSingle();
    const used = data?.count ?? 0;
    return { used, limit: FREE_DAILY_THUMBNAIL_LIMIT, isPremium };
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
    const { userId } = context;
    const isPremium = await userIsPremium(userId);
    const today = new Date().toISOString().slice(0, 10);

    if (!isPremium) {
      const { data: row } = await supabaseAdmin
        .from("thumbnail_usage")
        .select("count")
        .eq("user_id", userId)
        .eq("day", today)
        .maybeSingle();
      const used = row?.count ?? 0;
      if (used >= FREE_DAILY_THUMBNAIL_LIMIT) {
        throw new Error(
          `Free plan limit reached (${FREE_DAILY_THUMBNAIL_LIMIT} thumbnails/day). Upgrade to Premium for unlimited generations.`,
        );
      }
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const promptWithAspect = `${data.prompt}\n\nImage aspect ratio: ${data.aspectRatio}. Compose the image to fully fill a ${data.aspectRatio} frame.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: promptWithAspect }],
        modalities: ["image", "text"],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Rate limit exceeded. Please try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to your workspace.");
      throw new Error(`Image gen ${res.status}: ${text.slice(0, 300)}`);
    }

    const json = await res.json();
    const message = json.choices?.[0]?.message;
    const images: string[] = (message?.images ?? [])
      .map((img: any) => img?.image_url?.url)
      .filter(Boolean);

    if (images.length === 0) {
      throw new Error("No image returned");
    }

    // Record usage (only really matters for free users, but track all)
    const { data: existing } = await supabaseAdmin
      .from("thumbnail_usage")
      .select("id, count")
      .eq("user_id", userId)
      .eq("day", today)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("thumbnail_usage")
        .update({ count: existing.count + 1, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin
        .from("thumbnail_usage")
        .insert({ user_id: userId, day: today, count: 1 });
    }

    const newUsed = (existing?.count ?? 0) + 1;
    return {
      image: images[0],
      usage: { used: newUsed, limit: FREE_DAILY_THUMBNAIL_LIMIT, isPremium },
    };
  });
