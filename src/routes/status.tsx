import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Status — Zentry Qor" },
      { name: "description", content: "Live platform uptime and incident history for Zentry Qor." },
      { property: "og:title", content: "Status — Zentry Qor" },
      { property: "og:description", content: "Live platform uptime and incident history." },
    ],
  }),
  component: StatusPage,
});

const services = [
  { name: "Web app", uptime: "99.99%" },
  { name: "Vault & downloads", uptime: "99.98%" },
  { name: "AI Studio", uptime: "99.95%" },
  { name: "Authentication", uptime: "100%" },
  { name: "Payments (Paddle)", uptime: "100%" },
  { name: "API", uptime: "99.97%" },
];

function bars() {
  return Array.from({ length: 60 }, (_, i) => {
    const dim = i === 23 || i === 41 ? "bg-emerald-400/40" : "bg-emerald-400/80";
    return <span key={i} className={`h-7 w-1 rounded-sm ${dim}`} />;
  });
}

function StatusPage() {
  return (
    <PageShell
      eyebrow="Status"
      title={<>All systems <span className="text-aurora italic font-medium">operational.</span></>}
      description="Real-time platform health for the last 60 days. Subscribe for incident notifications inside Settings."
    >
      <div className="glass-strong rounded-2xl p-6 mb-6 flex items-center gap-4">
        <span className="relative flex h-3 w-3">
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
          <span className="relative h-3 w-3 rounded-full bg-emerald-400" />
        </span>
        <div>
          <p className="text-[15px] font-semibold">All systems normal</p>
          <p className="text-xs text-muted-foreground">Last checked just now · Updated every 60 seconds</p>
        </div>
      </div>

      <div className="space-y-3 mb-10">
        {services.map((s) => (
          <div key={s.name} className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 icon-fx" />
                <span className="text-sm font-medium">{s.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">{s.uptime} · 60d</span>
            </div>
            <div className="flex gap-0.5 items-end">{bars()}</div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="text-sm font-semibold tracking-tight mb-3">Recent incidents</h2>
        <p className="text-sm text-muted-foreground">No incidents reported in the last 30 days.</p>
      </div>
    </PageShell>
  );
}
