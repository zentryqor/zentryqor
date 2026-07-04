import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, AlertTriangle, XCircle, Circle } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { getStatusData } from "@/lib/status.functions";

const SERVICE_LABELS: Record<string, string> = {
  web: "Web app",
  api: "Public API",
  auth: "Authentication",
  "ai-text": "AI Studio (text)",
  "ai-image": "AI Studio (image)",
  database: "Database",
};

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Status — Zentry Qor" },
      { name: "description", content: "Live health of Zentry Qor services: web, API, auth, AI text, AI image, and database." },
      { property: "og:title", content: "Status — Zentry Qor" },
      { property: "og:description", content: "Live platform uptime, health, and incident history." },
    ],
  }),
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery({
      queryKey: ["status-data"],
      queryFn: () => getStatusData(),
    });
  },
  component: StatusPage,
});

function StatusPage() {
  const fetchStatus = useServerFn(getStatusData);
  const q = useQuery({
    queryKey: ["status-data"],
    queryFn: () => fetchStatus(),
    refetchInterval: 60000,
  });

  const data = q.data;
  const overall = data?.overall ?? "up";

  return (
    <PageShell
      eyebrow="Status"
      title="Platform status"
      description="Live health of Zentry Qor services. Updates every minute."
    >
      <div>


        <div
          className={`rounded-2xl p-6 mb-8 flex items-center gap-4 ${
            overall === "up"
              ? "bg-emerald-500/10 border border-emerald-500/20"
              : overall === "degraded"
                ? "bg-amber-500/10 border border-amber-500/20"
                : "bg-red-500/10 border border-red-500/20"
          }`}
        >
          <StatusIcon status={overall} large />
          <div>
            <div className="text-lg font-semibold">
              {overall === "up" ? "All systems operational" : overall === "degraded" ? "Some services degraded" : "Service disruption"}
            </div>
            {data?.updatedAt && (
              <div className="text-xs text-muted-foreground mt-1">
                Last checked {new Date(data.updatedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        <div className="glass-strong rounded-2xl overflow-hidden">
          {(data?.services ?? []).map((svc, i) => (
            <div
              key={svc.service}
              className={`p-5 ${i > 0 ? "border-t border-white/5" : ""}`}
            >
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <StatusIcon status={svc.currentStatus} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{SERVICE_LABELS[svc.service] ?? svc.service}</div>
                    <div className="text-xs text-muted-foreground">
                      {svc.uptimePct.toFixed(2)}% uptime · 90 days
                      {svc.latencyMs != null && ` · ${svc.latencyMs}ms avg`}
                    </div>
                  </div>
                </div>
                <span className={`text-xs uppercase tracking-wider ${statusColor(svc.currentStatus)}`}>
                  {svc.currentStatus}
                </span>
              </div>
              <div className="flex gap-[2px] items-end h-8">
                {svc.history.map((d) => (
                  <div
                    key={d.day}
                    title={`${d.day}: ${d.status}`}
                    className={`flex-1 rounded-sm h-full ${
                      d.status === "up"
                        ? "bg-emerald-400/80"
                        : d.status === "degraded"
                          ? "bg-amber-400/80"
                          : d.status === "down"
                            ? "bg-red-500/80"
                            : "bg-white/5"
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                <span>90 days ago</span>
                <span>Today</span>
              </div>
            </div>
          ))}
          {!data && (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading status…</div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-8">
          Health checks run every 5 minutes. History covers the last 90 days.
        </p>
      </div>
    </PageShell>
  );
}

function StatusIcon({ status, large }: { status: string; large?: boolean }) {
  const size = large ? "w-6 h-6" : "w-5 h-5";
  if (status === "up") return <CheckCircle2 className={`${size} text-emerald-400`} />;
  if (status === "degraded") return <AlertTriangle className={`${size} text-amber-400`} />;
  if (status === "down") return <XCircle className={`${size} text-red-400`} />;
  return <Circle className={`${size} text-muted-foreground`} />;
}

function statusColor(status: string) {
  if (status === "up") return "text-emerald-300";
  if (status === "degraded") return "text-amber-300";
  if (status === "down") return "text-red-300";
  return "text-muted-foreground";
}
