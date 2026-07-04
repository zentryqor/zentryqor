import { createFileRoute } from "@tanstack/react-router";

// Called by pg_cron every ~5 minutes to record health snapshots.
// Also usable as a public liveness endpoint.
export const Route = createFileRoute("/api/public/v1/health")({
  server: {
    handlers: {
      GET: async () => runHealthChecks(false),
      POST: async () => runHealthChecks(true),
    },
  },
});

async function runHealthChecks(persist: boolean) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const checks: Array<{ service: string; status: "up" | "down" | "degraded"; latency_ms: number | null; message: string | null }> = [];

  async function timed(service: string, fn: () => Promise<{ ok: boolean; degraded?: boolean; message?: string }>) {
    const t0 = Date.now();
    try {
      const r = await fn();
      const latency = Date.now() - t0;
      checks.push({
        service,
        status: r.ok ? (r.degraded || latency > 3000 ? "degraded" : "up") : "down",
        latency_ms: latency,
        message: r.message ?? null,
      });
    } catch (e) {
      checks.push({
        service,
        status: "down",
        latency_ms: Date.now() - t0,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  await Promise.all([
    timed("web", async () => ({ ok: true })),
    timed("database", async () => {
      const { error } = await supabaseAdmin.from("assets").select("id", { head: true, count: "exact" }).limit(1);
      return { ok: !error, message: error?.message };
    }),
    timed("auth", async () => {
      const url = `${process.env.SUPABASE_URL}/auth/v1/health`;
      const r = await fetch(url, { headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY ?? "" } });
      return { ok: r.ok };
    }),
    timed("api", async () => ({ ok: true })),
    timed("ai-text", async () => {
      const key = process.env.LOVABLE_API_KEY;
      if (!key) return { ok: false, message: "missing key" };
      const r = await fetch("https://ai.gateway.lovable.dev/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      return { ok: r.ok || r.status === 401 };
    }),
    timed("ai-image", async () => {
      const key = process.env.LOVABLE_API_KEY;
      if (!key) return { ok: false, message: "missing key" };
      const r = await fetch("https://ai.gateway.lovable.dev/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      return { ok: r.ok || r.status === 401 };
    }),
  ]);

  if (persist) {
    await (supabaseAdmin as any).from("status_checks").insert(checks);
  }

  const overall = checks.some((c) => c.status === "down")
    ? "down"
    : checks.some((c) => c.status === "degraded")
      ? "degraded"
      : "up";

  return new Response(JSON.stringify({ overall, checks, timestamp: new Date().toISOString() }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
