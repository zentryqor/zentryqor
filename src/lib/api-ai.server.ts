import { supabaseAdmin } from "@/integrations/supabase/client.server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const TEXT_COST = 10;
export const IMAGE_COST = 30;
const FREE_DAILY_CREDITS = 150;
const PREMIUM_DAILY_CREDITS = 1000;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

async function userIsPremium(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.rpc("is_premium", { _user_id: userId });
  return !!data;
}

async function getState(userId: string) {
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

export async function spendCredits(userId: string, cost: number) {
  const state = await getState(userId);
  if (!state.isPremium) {
    const err: any = new Error("Premium membership required to use the API.");
    err.status = 403;
    throw err;
  }
  if (state.used + cost > state.limit) {
    const err: any = new Error(
      `Not enough credits. Need ${cost}, have ${state.remaining} left today (limit ${state.limit}/day).`,
    );
    err.status = 429;
    throw err;
  }
  if (state.rowId) {
    await supabaseAdmin
      .from("ai_credit_usage")
      .update({ used: state.used + cost, updated_at: new Date().toISOString() })
      .eq("id", state.rowId);
  } else {
    await supabaseAdmin.from("ai_credit_usage").insert({ user_id: userId, day: state.day, used: cost });
  }
  return { limit: state.limit, used: state.used + cost, remaining: Math.max(0, state.limit - state.used - cost) };
}

export async function refundCredits(userId: string, cost: number) {
  const day = todayUtc();
  const { data } = await supabaseAdmin
    .from("ai_credit_usage")
    .select("id, used")
    .eq("user_id", userId)
    .eq("day", day)
    .maybeSingle();
  if (!data) return;
  await supabaseAdmin
    .from("ai_credit_usage")
    .update({ used: Math.max(0, data.used - cost) })
    .eq("id", data.id);
}

export async function callOpenRouterText(prompt: string, system: string | undefined) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");
  const messages = [
    ...(system ? [{ role: "system", content: system }] : []),
    { role: "user", content: prompt },
  ];
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://zentryqor.lovable.app",
      "X-Title": "Zentry Qor API",
    },
    body: JSON.stringify({ model: "openai/gpt-oss-120b:free", messages }),
  });
  if (!res.ok) {
    const t = await res.text();
    const err: any = new Error(`Upstream ${res.status}: ${t.slice(0, 200)}`);
    err.status = 502;
    throw err;
  }
  const json = await res.json();
  return (json.choices?.[0]?.message?.content ?? "") as string;
}

export async function callImageGen(prompt: string, aspectRatio: "16:9" | "9:16" | "4:3" | "3:4") {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
  const sizeMap: Record<string, string> = {
    "16:9": "1536x1024",
    "9:16": "1024x1536",
    "4:3": "1536x1024",
    "3:4": "1024x1536",
  };
  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-image-1-mini",
      prompt,
      size: sizeMap[aspectRatio],
      quality: "low",
      n: 1,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    const err: any = new Error(`Image ${res.status}: ${t.slice(0, 200)}`);
    err.status = res.status === 429 ? 429 : 502;
    throw err;
  }
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned");
  return `data:image/png;base64,${b64}` as string;
}
