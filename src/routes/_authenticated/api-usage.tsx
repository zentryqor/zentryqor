import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowLeft, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { AppHeader } from "@/components/AppHeader";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { ProfileMenu } from "@/components/ProfileMenu";
import { listApiUsage } from "@/lib/api-keys.functions";

export const Route = createFileRoute("/_authenticated/api-usage")({
  head: () => ({
    meta: [
      { title: "API Usage — Zentry Qor" },
      { name: "description", content: "See recent API requests, credit cost, latency, charts and cost projections." },
    ],
  }),
  component: ApiUsagePage,
});

function ApiUsagePage() {
  const fetchUsage = useServerFn(listApiUsage);
  const usageQuery = useQuery({ queryKey: ["api-usage"], queryFn: () => fetchUsage(), refetchInterval: 15000 });

  const stats = usageQuery.data?.stats;
  const rows = usageQuery.data?.recent ?? [];
  const series = usageQuery.data?.series ?? [];
  const breakdown = usageQuery.data?.breakdown ?? [];
  const projection = usageQuery.data?.projection;

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
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">API usage</h1>
            <p className="text-muted-foreground mt-1 max-w-xl">
              Track credits over time, per-endpoint activity, and cost projections for the month.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Requests (7d)" value={stats?.total ?? 0} />
          <StatCard label="Successful" value={stats?.success ?? 0} tone="green" />
          <StatCard label="Errors" value={stats?.errors ?? 0} tone="red" />
          <StatCard label="Credits (7d)" value={stats?.creditsSpent ?? 0} />
        </div>

        {projection && (
          <section className="glass-strong rounded-2xl p-5 mb-6 flex flex-wrap items-center gap-4">
            <TrendingUp className="w-5 h-5 text-emerald-300 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium">Monthly projection</div>
              <div className="text-sm text-muted-foreground">
                {projection.mtdCredits.toLocaleString()} credits used in {projection.daysElapsed} of {projection.daysInMonth} days.
                At this pace you'll spend <span className="text-foreground font-semibold">{projection.projectedMonth.toLocaleString()}</span> credits this month.
              </div>
            </div>
          </section>
        )}

        <section className="glass-strong rounded-2xl p-4 sm:p-5 mb-6">
          <h2 className="font-medium mb-4">Credits over time (30 days)</h2>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <LineChart data={series} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={11}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "rgba(20,20,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#fff" }}
                />
                <Line type="monotone" dataKey="credits" stroke="#34d399" strokeWidth={2} dot={false} name="Credits" />
                <Line type="monotone" dataKey="requests" stroke="#60a5fa" strokeWidth={2} dot={false} name="Requests" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-strong rounded-2xl p-4 sm:p-5 mb-8">
          <h2 className="font-medium mb-4">Per-endpoint breakdown (30 days)</h2>
          {breakdown.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No requests yet.</div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer>
                <BarChart data={breakdown} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="endpoint" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: "rgba(20,20,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="requests" fill="#60a5fa" name="Requests" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="credits" fill="#34d399" name="Credits" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="glass-strong rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-medium">Recent requests</h2>
            <span className="text-xs text-muted-foreground">Last 100 · updates every 15s</span>
          </div>

          {usageQuery.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No API requests yet. Head to{" "}
                <Link to="/api-docs" className="underline hover:text-foreground">
                  API docs
                </Link>{" "}
                to try it out.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground bg-white/[0.02]">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">When</th>
                    <th className="text-left px-4 py-2.5 font-medium">Endpoint</th>
                    <th className="text-left px-4 py-2.5 font-medium">Status</th>
                    <th className="text-right px-4 py-2.5 font-medium">Credits</th>
                    <th className="text-right px-4 py-2.5 font-medium">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((r) => {
                    const ok = r.status >= 200 && r.status < 300;
                    return (
                      <tr key={r.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          <span className="rounded bg-white/10 px-1.5 py-0.5 mr-2">{r.method}</span>
                          {r.endpoint}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${
                              ok
                                ? "bg-emerald-500/10 text-emerald-300"
                                : "bg-red-500/10 text-red-300"
                            }`}
                            title={r.error_message ?? undefined}
                          >
                            {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{r.credits_cost}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                          {r.latency_ms != null ? `${r.latency_ms} ms` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "green" | "red" }) {
  const color =
    tone === "green" ? "text-emerald-300" : tone === "red" ? "text-red-300" : "text-foreground";
  return (
    <div className="glass-strong rounded-2xl p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{value.toLocaleString()}</div>
    </div>
  );
}
