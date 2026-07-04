import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Gauge, Zap, Info } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { ProfileMenu } from "@/components/ProfileMenu";
import { getRateLimitStatus } from "@/lib/api-keys.functions";

export const Route = createFileRoute("/_authenticated/api-limits")({
  head: () => ({
    meta: [
      { title: "API Rate Limits — Zentry Qor" },
      { name: "description", content: "View your current API rate limits, burst allowance, and retry guidance." },
    ],
  }),
  component: ApiLimitsPage,
});

function ApiLimitsPage() {
  const fetchLimits = useServerFn(getRateLimitStatus);
  const q = useQuery({ queryKey: ["rate-limits"], queryFn: () => fetchLimits(), refetchInterval: 10000 });

  const tier = q.data?.tier;
  const usage = q.data?.usage;

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <AnimatedOrbs />
      <AppHeader right={<ProfileMenu />} />

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-28 pb-24">
        <Link to="/api-keys" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to API keys
        </Link>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl glass-strong flex items-center justify-center shrink-0">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Rate limits</h1>
            <p className="text-muted-foreground mt-1 max-w-xl">
              Live view of your current tier limits, burst allowance, and how much of your budget you've used.
            </p>
          </div>
        </div>

        <section className="glass-strong rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Your tier</div>
              <div className="text-2xl font-semibold mt-1">{tier?.name ?? "…"}</div>
            </div>
            {tier?.name !== "Premium" && (
              <Link to="/billing" className="rounded-xl bg-white text-black px-4 py-2 text-sm font-medium hover:bg-white/90">
                Upgrade
              </Link>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <UsageBar
              label="Requests this minute"
              used={usage?.lastMinute ?? 0}
              limit={tier?.perMinute ?? 0}
              resetLabel="Resets every minute"
            />
            <UsageBar
              label="Requests today"
              used={usage?.lastDay ?? 0}
              limit={tier?.perDay ?? 0}
              resetLabel="Resets at 00:00 UTC"
            />
          </div>
        </section>

        <section className="grid sm:grid-cols-2 gap-4 mb-6">
          <InfoCard
            icon={<Zap className="w-5 h-5" />}
            title="Burst allowance"
            value={tier?.burst ? `+${tier.burst} requests` : "—"}
            hint="Short spikes above your per-minute limit are absorbed by burst capacity."
          />
          <InfoCard
            icon={<Gauge className="w-5 h-5" />}
            title="Daily credits"
            value={tier?.dailyCredits ? `${tier.dailyCredits.toLocaleString()} / day` : "—"}
            hint="Credits reset every day at 00:00 UTC. Each request costs credits based on the endpoint."
          />
        </section>

        <section className="glass-strong rounded-2xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <Info className="w-5 h-5 mt-0.5 text-muted-foreground" />
            <div>
              <h2 className="font-medium">Retry guidance</h2>
              <p className="text-sm text-muted-foreground mt-1">
                When you exceed a limit, the API returns <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono">429 Too Many Requests</code> with a{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono">Retry-After</code> header. Use exponential backoff and honor the header.
              </p>
            </div>
          </div>

          <pre className="text-xs font-mono bg-black/40 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap break-all">
{`async function callWithRetry(url, options, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, options);
    if (res.status !== 429) return res;
    const retryAfter = Number(res.headers.get("retry-after") ?? 1);
    const backoff = Math.min(retryAfter * 1000, 2 ** attempt * 1000);
    await new Promise((r) => setTimeout(r, backoff));
  }
  throw new Error("Rate limit exceeded after retries");
}`}
          </pre>
        </section>
      </main>
    </div>
  );
}

function UsageBar({ label, used, limit, resetLabel }: { label: string; used: number; limit: number; resetLabel: string }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const tone = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="rounded-xl bg-white/[0.03] p-4">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-mono">{used.toLocaleString()} / {limit > 0 ? limit.toLocaleString() : "—"}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-muted-foreground mt-2">{resetLabel}</div>
    </div>
  );
}

function InfoCard({ icon, title, value, hint }: { icon: React.ReactNode; title: string; value: string; hint: string }) {
  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">{icon}{title}</div>
      <div className="text-xl font-semibold mt-2">{value}</div>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{hint}</p>
    </div>
  );
}
