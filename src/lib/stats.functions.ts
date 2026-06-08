import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DashboardStats = {
  downloads: number;
  downloadsToday: number;
  downloadsDelta: number;
  saved: number;
  savedDelta: number;
  aiRuns: number;
  aiRunsDelta: number;
  streak: number;
  sparkline: number[];
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

    const [dlAll, dl14, savesAll, saves14, ai14, thumb14] = await Promise.all([
      supabase
        .from("asset_downloads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("asset_downloads")
        .select("created_at")
        .eq("user_id", userId)
        .gte("created_at", start14.toISOString()),
      supabase
        .from("asset_saves")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("asset_saves")
        .select("created_at")
        .eq("user_id", userId)
        .gte("created_at", start14.toISOString()),
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

    const downloadsTotal = dlAll.count ?? 0;
    const saved = savesAll.count ?? 0;

    const dlRows = (dl14.data ?? []) as { created_at: string }[];
    const dl7 = dlRows.filter((r) => new Date(r.created_at) >= start7).length;
    const dlPrev = dlRows.length - dl7;

    const todayStr = now.toISOString().slice(0, 10);
    const downloadsToday = dlRows.filter((r) => r.created_at.slice(0, 10) === todayStr).length;

    const saveRows = (saves14.data ?? []) as { created_at: string }[];
    const sv7 = saveRows.filter((r) => new Date(r.created_at) >= start7).length;
    const svPrev = saveRows.length - sv7;

    const aiRows = (ai14.data ?? []) as { day: string; used: number }[];
    const tbRows = (thumb14.data ?? []) as { day: string; count: number }[];

    const sevenAgo = start7.toISOString().slice(0, 10);
    const ai7 = aiRows.filter((r) => r.day >= sevenAgo).reduce((s, r) => s + (r.used ?? 0), 0)
      + tbRows.filter((r) => r.day >= sevenAgo).reduce((s, r) => s + (r.count ?? 0), 0);
    const aiPrev = aiRows.filter((r) => r.day < sevenAgo).reduce((s, r) => s + (r.used ?? 0), 0)
      + tbRows.filter((r) => r.day < sevenAgo).reduce((s, r) => s + (r.count ?? 0), 0);
    const aiTotal = ai7 + aiPrev;

    // Sparkline: per-day downloads over last 7 days
    const sparkline: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + day);
      const c = dlRows.filter((r) => {
        const t = new Date(r.created_at).getTime();
        return t >= dayStart.getTime() && t < dayEnd.getTime();
      }).length;
      sparkline.push(c);
    }

    const activeDays = new Set<string>();
    dlRows.forEach((r) => activeDays.add(new Date(r.created_at).toISOString().slice(0, 10)));
    saveRows.forEach((r) => activeDays.add(new Date(r.created_at).toISOString().slice(0, 10)));
    aiRows.forEach((r) => r.used > 0 && activeDays.add(r.day));
    tbRows.forEach((r) => r.count > 0 && activeDays.add(r.day));

    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(now.getTime() - i * day).toISOString().slice(0, 10);
      if (activeDays.has(d)) streak++;
      else if (i > 0) break;
      else continue;
    }

    return {
      downloads: downloadsTotal,
      downloadsDelta: pctDelta(dl7, dlPrev),
      saved,
      savedDelta: pctDelta(sv7, svPrev),
      aiRuns: aiTotal,
      aiRunsDelta: pctDelta(ai7, aiPrev),
      streak,
      sparkline,
    };
  });
