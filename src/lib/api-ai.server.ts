import { supabaseAdmin } from "@/integrations/supabase/client.server";

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

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
  const { data: profile } = await (supabaseAdmin as any)
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

export async function spendCredits(userId: string, cost: number) {
  const state = await getState(userId);
  if (!state.isPremium) {
    const err: any = new Error("Premium membership required to use the API.");
    err.status = 403;
    throw err;
  }
  if (state.remaining < cost) {
    const err: any = new Error(
      `Not enough credits. Need ${cost}, have ${state.remaining} left (${state.limit}/day + ${state.bonus} bonus).`,
    );
    err.status = 429;
    throw err;
  }
  const dailyRoom = Math.max(0, state.limit - state.used);
  const fromDaily = Math.min(dailyRoom, cost);
  const fromBonus = cost - fromDaily;

  if (fromDaily > 0) {
    if (state.rowId) {
      await supabaseAdmin
        .from("ai_credit_usage")
        .update({ used: state.used + fromDaily, updated_at: new Date().toISOString() })
        .eq("id", state.rowId);
    } else {
      await supabaseAdmin.from("ai_credit_usage").insert({ user_id: userId, day: state.day, used: fromDaily });
    }
  }
  if (fromBonus > 0) {
    await supabaseAdmin.rpc("consume_bonus_credits" as any, { _user_id: userId, _amount: fromBonus });
  }

  supabaseAdmin.rpc("award_referral_bonus" as any, { _referee: userId }).then(() => {}, () => {});

  return { limit: state.limit, used: state.used + fromDaily, remaining: state.remaining - cost };
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
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY not configured");
  const messages = [
    ...(system ? [{ role: "system", content: system }] : []),
    { role: "user", content: prompt },
  ];
  const res = await fetch(NVIDIA_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "z-ai/glm-5.2", messages }),
  });
  if (!res.ok) {
    const t = await res.text();
    const err: any = new Error(`Upstream ${res.status}: ${t.slice(0, 200)}`);
    err.status = res.status === 429 ? 429 : 502;
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
