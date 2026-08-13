const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

export const CHAT_COST = 10;
const FREE_DAILY_CREDITS = 150;
const PREMIUM_DAILY_CREDITS = 1000;

export type ChatModelKey = "zentry-qor-flash" | "zentry-qor-basic" | "zentry-qor-pro";

const MODEL_TUNING: Record<ChatModelKey, { temperature: number; maxTokens: number }> = {
  "zentry-qor-flash": { temperature: 0.7, maxTokens: 700 },
  "zentry-qor-basic": { temperature: 0.5, maxTokens: 1000 },
  "zentry-qor-pro": { temperature: 0.85, maxTokens: 1800 },
};

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

async function isPremium(supabase: any, userId: string) {
  const { data } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return false;
  const now = Date.now();
  const end = data.current_period_end ? new Date(data.current_period_end).getTime() : null;
  if (["active", "trialing", "past_due"].includes(data.status) && (!end || end > now)) return true;
  return data.status === "canceled" && !!end && end > now;
}

export async function spendChatCredits(supabase: any, userId: string) {
  const premium = await isPremium(supabase, userId);
  const limit = premium ? PREMIUM_DAILY_CREDITS : FREE_DAILY_CREDITS;
  const day = todayUtc();
  const { data: row } = await supabase
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
  const used: number = row?.used ?? 0;
  const bonus: number = profile?.bonus_credits ?? 0;
  const dailyRoom = Math.max(0, limit - used);
  if (dailyRoom + bonus < CHAT_COST) {
    throw new Error(
      `Not enough credits. Chat costs ${CHAT_COST} credits but you have ${dailyRoom + bonus} left.`,
    );
  }
  const fromDaily = Math.min(dailyRoom, CHAT_COST);
  const fromBonus = CHAT_COST - fromDaily;
  if (fromDaily > 0) {
    if (row?.id) {
      await supabase
        .from("ai_credit_usage")
        .update({ used: used + fromDaily, updated_at: new Date().toISOString() })
        .eq("id", row.id);
    } else {
      await supabase.from("ai_credit_usage").insert({ user_id: userId, day, used: fromDaily });
    }
  }
  if (fromBonus > 0) {
    await supabase.rpc("consume_bonus_credits", { _user_id: userId, _amount: fromBonus });
  }
  return { used: used + fromDaily, limit, isPremium: premium };
}

export async function refundChatCredits(supabase: any, userId: string) {
  const day = todayUtc();
  const { data } = await supabase
    .from("ai_credit_usage")
    .select("id, used")
    .eq("user_id", userId)
    .eq("day", day)
    .maybeSingle();
  if (!data) return;
  await supabase
    .from("ai_credit_usage")
    .update({ used: Math.max(0, data.used - CHAT_COST) })
    .eq("id", data.id);
}

export async function runChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  model: ChatModelKey,
) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");
  const tuning = MODEL_TUNING[model] ?? MODEL_TUNING["zentry-qor-flash"];

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: tuning.temperature,
      max_tokens: tuning.maxTokens,
      top_p: 0.9,
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("AI is busy right now — try again in a moment.");
    throw new Error(`AI ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  return (json.choices?.[0]?.message?.content ?? "") as string;
}
