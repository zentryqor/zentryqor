import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SERVICES = [
  "web",
  "api",
  "auth",
  "ai-text",
  "ai-image",
  "database",
] as const;

export type ServiceStatus = {
  service: string;
  currentStatus: "up" | "down" | "degraded" | "unknown";
  uptimePct: number;
  latencyMs: number | null;
  history: { day: string; status: "up" | "down" | "degraded" | "none" }[];
};

export const getStatusData = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await (supabase as any)
    .from("status_checks")
    .select("service, status, latency_ms, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20000);

  const rows = (data ?? []) as {
    service: string;
    status: "up" | "down" | "degraded";
    latency_ms: number | null;
    created_at: string;
  }[];

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const days: string[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const services: ServiceStatus[] = SERVICES.map((svc) => {
    const svcRows = rows.filter((r) => r.service === svc);
    const latest = svcRows[0];
    const byDay: Record<string, { up: number; total: number }> = {};
    for (const d of days) byDay[d] = { up: 0, total: 0 };
    for (const r of svcRows) {
      const k = r.created_at.slice(0, 10);
      if (byDay[k]) {
        byDay[k].total += 1;
        if (r.status === "up") byDay[k].up += 1;
      }
    }
    const totalUp = svcRows.filter((r) => r.status === "up").length;
    const uptimePct = svcRows.length > 0 ? (totalUp / svcRows.length) * 100 : 100;
    const latencies = svcRows.filter((r) => r.latency_ms != null).map((r) => r.latency_ms!);
    const avgLatency =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : null;

    return {
      service: svc,
      currentStatus: (latest?.status as ServiceStatus["currentStatus"]) ?? "unknown",
      uptimePct: Number(uptimePct.toFixed(3)),
      latencyMs: avgLatency,
      history: days.map((d) => {
        const b = byDay[d];
        if (b.total === 0) return { day: d, status: "none" as const };
        const ratio = b.up / b.total;
        if (ratio >= 0.99) return { day: d, status: "up" as const };
        if (ratio >= 0.9) return { day: d, status: "degraded" as const };
        return { day: d, status: "down" as const };
      }),
    };
  });

  const overall: "up" | "degraded" | "down" = services.some((s) => s.currentStatus === "down")
    ? "down"
    : services.some((s) => s.currentStatus === "degraded")
      ? "degraded"
      : "up";

  return { services, overall, updatedAt: new Date().toISOString() };
});
