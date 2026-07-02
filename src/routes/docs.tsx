import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { BookOpen, Download, Sparkles, CreditCard, Shield } from "lucide-react";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs — Zentry Qor" },
      { name: "description", content: "Guides for the Zentry Qor vault, AI tools, downloads, and billing." },
      { property: "og:title", content: "Docs — Zentry Qor" },
      { property: "og:description", content: "Guides for the Zentry Qor vault, AI tools, downloads, and billing." },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  const sections = [
    {
      icon: BookOpen,
      title: "Getting started",
      body: "Create an account, pick your niche and platforms during onboarding, and land on the dashboard. Everything in Zentry Qor works from there — the vault, the AI tools, and your saved library.",
    },
    {
      icon: Download,
      title: "The asset vault",
      body: "Browse packs, click any asset to preview it, and hit Download to save the file. Free accounts get 3 downloads per day; Premium is unlimited. Saved assets live under Saved in your profile menu.",
    },
    {
      icon: Sparkles,
      title: "AI tools & credits",
      body: "Nine tools tuned for short-form: captions, hooks, scripts, thumbnails, hashtags, trends, planner, brand bio, video ideas. Free: 3 text runs / day. Premium: 1,000 credits / day (text = 10, thumbnails = 30). Credits reset at midnight UTC.",
    },
    {
      icon: CreditCard,
      title: "Billing",
      body: "Upgrade from the Billing page. $12.99/month or $129/year. Cancel anytime — you keep Premium until the end of the current period. All payments are processed by Paddle.",
    },
    {
      icon: Shield,
      title: "Privacy & security",
      body: "Your downloads, saves, and AI inputs are tied to your account and never sold or used to train models. See the Privacy and Terms pages for the full policy.",
    },
  ];
  return (
    <PageShell
      eyebrow="Docs"
      title={<>Everything you need to <span className="text-aurora italic font-medium">ship.</span></>}
      description="Short guides for the vault, AI tools, downloads, and billing. Read what you need and get back to creating."
    >
      <div className="grid gap-4">
        {sections.map((s) => (
          <div key={s.title} className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <s.icon className="h-4 w-4 text-accent" />
              </div>
              <h2 className="text-lg font-semibold">{s.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 text-center text-sm text-muted-foreground">
        Still stuck? <Link to="/contact" className="text-accent hover:underline">Contact us</Link> or check the{" "}
        <Link to="/help" className="text-accent hover:underline">Help Center</Link>.
      </div>
    </PageShell>
  );
}
