import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog — Zentry Qor" },
      { name: "description", content: "Every update, fix, and new feature shipped to Zentry Qor." },
      { property: "og:title", content: "Changelog — Zentry Qor" },
      { property: "og:description", content: "Every update shipped to Zentry Qor." },
    ],
  }),
  component: ChangelogPage,
});

const entries = [
  {
    date: "Jun 7, 2026",
    tag: "Polish",
    title: "Cinematic icon motion across the site",
    body: "Premium spring lift, ambient glow, and subtle pulse on every icon. Disabled automatically for prefers-reduced-motion.",
  },
  {
    date: "Jun 5, 2026",
    tag: "Design",
    title: "Unified floating glass header",
    body: "Every authenticated page now shares the same floating pill nav as the landing site.",
  },
  {
    date: "Jun 3, 2026",
    tag: "Billing",
    title: "Premium gets 1000 AI credits/day",
    body: "Bumped the daily AI allowance. Removed the 14-day trial in favor of a generous free tier.",
  },
  {
    date: "May 28, 2026",
    tag: "Vault",
    title: "+220 packs added",
    body: "Editorial film grain, glitch text presets, Y2K UI kit, and a stack of motion-design templates.",
  },
  {
    date: "May 14, 2026",
    tag: "AI",
    title: "Caption Studio v2",
    body: "New tone presets (deadpan, hype, editorial) and a 3x faster batch mode.",
  },
];

function ChangelogPage() {
  return (
    <PageShell
      eyebrow="Changelog"
      title={<>Shipped <span className="text-aurora italic font-medium">recently.</span></>}
      description="What's new in Zentry Qor. Subscribe to release notes inside Settings to get a weekly digest."
    >
      <div className="space-y-6">
        {entries.map((e) => (
          <div key={e.title} className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{e.date}</span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-elevated text-accent">{e.tag}</span>
            </div>
            <h3 className="text-[17px] font-semibold tracking-tight mb-1.5">{e.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{e.body}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
