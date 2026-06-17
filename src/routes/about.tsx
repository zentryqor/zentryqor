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
    { icon: Compass, title: "What it is", body: "A premium asset vault plus nine AI tools for short-form content — captions, hooks, scripts, thumbnails, hashtags, trends, planner, brand bio, and video ideas." },
    { icon: Sparkles, title: "How it works", body: "Browse or search the vault, save anything to your library, download what you need, and run AI tools that each tell you their credit cost up front." },
    { icon: Heart, title: "What we won't do", body: "No upsells inside features. No watermarks on Premium. No training models on your inputs. No surprise overage charges — credits reset daily." },
  ];
  return (
    <PageShell
      eyebrow="About"
      title={<>Built for people <span className="text-aurora italic font-medium">who ship.</span></>}
      description="Zentry Qor is a small product with a clear job: replace the half-dozen tabs you open to publish one piece of short-form content."
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
        <h2 className="text-xl font-semibold text-foreground tracking-tight">Why we built it</h2>
        <p>Publishing a single short-form video shouldn't require a stock site, a hook database, an AI caption tool, a thumbnail generator, and a planner — each with their own login and bill.</p>
        <p>Zentry Qor folds them into one workspace. Free tier is generous enough to try the loop end-to-end. Premium is one price, with all features unlocked and credits that reset every day.</p>
        <p>If a feature doesn't help you ship faster, it doesn't make it in.</p>
      </div>
    </PageShell>
  );
}
