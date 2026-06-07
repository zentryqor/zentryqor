import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { Sparkles, Compass, Heart } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Zentry Qor" },
      { name: "description", content: "Our mission and the story behind Zentry Qor — the creator OS built for people who ship." },
      { property: "og:title", content: "About — Zentry Qor" },
      { property: "og:description", content: "Our mission and the story behind Zentry Qor." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const pillars = [
    { icon: Compass, title: "Mission", body: "Replace the tab graveyard. Give creators one calm workspace where assets, AI, and analytics live together." },
    { icon: Sparkles, title: "Product", body: "3,200+ premium asset packs, nine AI tools tuned for short-form, and a workspace built for daily output — under one subscription." },
    { icon: Heart, title: "Principles", body: "Craft over hype. Speed over surface area. Respect for your time, your money, and your work." },
  ];
  return (
    <PageShell
      eyebrow="About"
      title={<>Built for people <span className="text-aurora italic font-medium">who ship.</span></>}
      description="Zentry Qor started as a private toolkit between three creators tired of juggling nine apps to publish one reel. Today, 24,000+ creators use it as their daily home."
    >
      <div className="grid sm:grid-cols-3 gap-4 mb-12">
        {pillars.map((p) => (
          <div key={p.title} className="glass rounded-2xl p-6">
            <p.icon className="h-5 w-5 text-accent icon-fx mb-3" />
            <h3 className="text-sm font-semibold tracking-tight mb-2">{p.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
          </div>
        ))}
      </div>
      <div className="glass rounded-2xl p-8 space-y-4 text-[15px] text-muted-foreground leading-relaxed">
        <h2 className="text-xl font-semibold text-foreground tracking-tight">Our story</h2>
        <p>We built the first version in a Notion doc and a Dropbox folder. It was ugly. It worked. Friends asked for access. Then their friends. Then strangers.</p>
        <p>Two years later, Zentry Qor is a full creator OS — but the rule hasn't changed: every feature has to earn its place. If it doesn't help you publish faster, it doesn't ship.</p>
        <p>We're a small, profitable team. No outside investors. No growth-at-all-costs playbook. Just a product we'd pay for ourselves.</p>
      </div>
    </PageShell>
  );
}
