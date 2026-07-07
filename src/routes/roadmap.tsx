import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { CheckCircle2, Loader2, Circle } from "lucide-react";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "Roadmap — Zentry Qor" },
      { name: "description", content: "What we're building next at Zentry Qor — shipped, in progress, and planned." },
      { property: "og:title", content: "Roadmap — Zentry Qor" },
      { property: "og:description", content: "What we're building next at Zentry Qor." },
    ],
  }),
  component: RoadmapPage,
});

const items = [
  { status: "shipped", title: "AI Studio v2", body: "Nine tools tuned for short-form with 1000 credits/day on Premium." },
  { status: "shipped", title: "Floating glass header", body: "Premium nav across every authenticated page." },
  { status: "shipped", title: "Public API", body: "Programmatic /text, /image, and /credits endpoints via API keys at /api-docs." },
  { status: "progress", title: "Team workspaces", body: "Shared vaults, roles, and seat-based billing. Private beta now." },
  { status: "progress", title: "Mobile app (iOS)", body: "Vault browsing, AI runs, and quick publish from your phone." },
  { status: "planned", title: "Brand kits", body: "Auto-apply your fonts, colors, and watermark across every export." },
  { status: "planned", title: "Native Poster", body: "Queue posts to TikTok, Reels, and Shorts from inside the workspace." },
];

const meta: Record<string, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  shipped: { label: "Shipped", icon: CheckCircle2, cls: "text-emerald-400" },
  progress: { label: "In progress", icon: Loader2, cls: "text-accent" },
  planned: { label: "Planned", icon: Circle, cls: "text-muted-foreground" },
};

function RoadmapPage() {
  return (
    <PageShell
      eyebrow="Roadmap"
      title={<>What's <span className="text-aurora italic font-medium">next.</span></>}
      description="A live look at what we're building. Suggest features inside the app — every Premium user gets a vote."
    >
      <div className="space-y-3">
        {items.map((it) => {
          const m = meta[it.status];
          const Icon = m.icon;
          return (
            <div key={it.title} className="glass rounded-2xl p-5 flex gap-4 items-start">
              <Icon className={`h-5 w-5 mt-0.5 shrink-0 icon-fx ${m.cls} ${it.status === "progress" ? "animate-spin [animation-duration:3s]" : ""}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-[15px] font-semibold tracking-tight">{it.title}</h3>
                  <span className={`text-[10px] uppercase tracking-wider ${m.cls}`}>{m.label}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{it.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
