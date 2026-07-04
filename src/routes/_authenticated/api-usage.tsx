import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";
import { ProfileMenu } from "@/components/ProfileMenu";
import { listApiUsage } from "@/lib/api-keys.functions";

export const Route = createFileRoute("/_authenticated/api-usage")({
  head: () => ({
    meta: [
      { title: "API Usage — Zentry Qor" },
      { name: "description", content: "See recent API requests, credit cost, latency, and response status." },
    ],
  }),
  component: ApiUsagePage,
});

function ApiUsagePage() {
  const fetchUsage = useServerFn(listApiUsage);
  const usageQuery = useQuery({ queryKey: ["api-usage"], queryFn: () => fetchUsage(), refetchInterval: 15000 });

  const stats = usageQuery.data?.stats;
  const rows = usageQuery.data?.recent ?? [];

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
              Recent requests made with your API keys, including credit cost, latency, and response status.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard label="Requests (7d)" value={stats?.total ?? 0} />
          <StatCard label="Successful" value={stats?.success ?? 0} tone="green" />
          <StatCard label="Errors" value={stats?.errors ?? 0} tone="red" />
          <StatCard label="Credits spent" value={stats?.creditsSpent ?? 0} />
        </div>

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
