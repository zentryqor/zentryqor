import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DashboardStats = {
  downloads: number;
  downloadsDelta: number; // % vs previous 7d
  saved: number;
  savedDelta: number;
  aiRuns: number;
  aiRunsDelta: number;
  streak: number;
  sparkline: number[]; // last 7 days activity counts
};

function pctDelta(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardStats> => {
    const { supabase, userId } = context;

    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    const start7 = new Date(now.getTime() - 7 * day);
    const start14 = new Date(now.getTime() - 14 * day);

    const [activityAll, activity14, ai14, thumb14] = await Promise.all([
      supabase.from("vault_activity").select("id,last_viewed_at", { count: "exact" }).eq("user_id", userId),
      supabase
        .from("vault_activity")
        .select("last_viewed_at")
        .eq("user_id", userId)
        .gte("last_viewed_at", start14.toISOString()),
      supabase
        .from("ai_credit_usage")
        .select("day,used")
        .eq("user_id", userId)
        .gte("day", start14.toISOString().slice(0, 10)),
      supabase
        .from("thumbnail_usage")
        .select("day,count")
        .eq("user_id", userId)
        .gte("day", start14.toISOString().slice(0, 10)),
    ]);

    const saved = activityAll.count ?? 0;

    // Downloads = vault_activity rows (proxy for engagements)
    const acts = (activity14.data ?? []) as { last_viewed_at: string }[];
    const dl7 = acts.filter((a) => new Date(a.last_viewed_at) >= start7).length;
    const dlPrev = acts.length - dl7;

    const savedPrev = saved - dl7; // approximate: prev total = current - this week new

    // AI runs = ai_credit_usage.used + thumbnail_usage.count
    const aiRows = (ai14.data ?? []) as { day: string; used: number }[];
    const tbRows = (thumb14.data ?? []) as { day: string; count: number }[];

    const sevenAgo = start7.toISOString().slice(0, 10);
    const ai7 = aiRows.filter((r) => r.day >= sevenAgo).reduce((s, r) => s + (r.used ?? 0), 0)
      + tbRows.filter((r) => r.day >= sevenAgo).reduce((s, r) => s + (r.count ?? 0), 0);
    const aiPrev = aiRows.filter((r) => r.day < sevenAgo).reduce((s, r) => s + (r.used ?? 0), 0)
      + tbRows.filter((r) => r.day < sevenAgo).reduce((s, r) => s + (r.count ?? 0), 0);
    const aiTotal = ai7 + aiPrev;

    // Sparkline: per-day activity count over last 7 days
    const sparkline: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + day);
      const c = acts.filter((a) => {
        const t = new Date(a.last_viewed_at).getTime();
        return t >= dayStart.getTime() && t < dayEnd.getTime();
      }).length;
      sparkline.push(c);
    }

    // Streak: consecutive days (ending today or yesterday) with any activity
    const activeDays = new Set<string>();
    acts.forEach((a) => activeDays.add(new Date(a.last_viewed_at).toISOString().slice(0, 10)));
    aiRows.forEach((r) => r.used > 0 && activeDays.add(r.day));
    tbRows.forEach((r) => r.count > 0 && activeDays.add(r.day));

    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(now.getTime() - i * day).toISOString().slice(0, 10);
      if (activeDays.has(d)) streak++;
      else if (i > 0) break;
      else continue; // allow today empty
    }

    return {
      downloads: dl7 + dlPrev,
      downloadsDelta: pctDelta(dl7, dlPrev),
      saved,
      savedDelta: pctDelta(dl7, Math.max(0, savedPrev)),
      aiRuns: aiTotal,
      aiRunsDelta: pctDelta(ai7, aiPrev),
      streak,
      sparkline,
    };
  });
