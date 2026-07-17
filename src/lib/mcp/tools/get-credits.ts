import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const FREE = 150;
const PREMIUM = 1000;

export default defineTool({
  name: "get_credits",
  title: "Get AI credit balance",
  description: "Returns the signed-in Zentry Qor user's remaining AI credits, daily limit, and plan (free or premium).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const day = new Date().toISOString().slice(0, 10);

    const [{ data: sub }, { data: usage }, { data: profile }] = await Promise.all([
      supabase.from("subscriptions").select("status, current_period_end").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("ai_credit_usage").select("used").eq("user_id", userId).eq("day", day).maybeSingle(),
      supabase.from("profiles").select("bonus_credits").eq("id", userId).maybeSingle(),
    ]);

    const now = Date.now();
    const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;
    const isPremium = !!sub && (
      (["active", "trialing", "past_due"].includes(sub.status) && (!periodEnd || periodEnd > now)) ||
      (sub.status === "canceled" && periodEnd !== null && periodEnd > now)
    );
    const limit = isPremium ? PREMIUM : FREE;
    const used = usage?.used ?? 0;
    const bonus = (profile as { bonus_credits?: number } | null)?.bonus_credits ?? 0;
    const remaining = Math.max(0, limit - used) + bonus;

    const summary = {
      plan: isPremium ? "premium" : "free",
      daily_limit: limit,
      used_today: used,
      bonus_credits: bonus,
      remaining,
      cost_per_text: 10,
      cost_per_image: 30,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
