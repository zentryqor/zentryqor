import { createFileRoute, Link } from "@tanstack/react-router";
import { FAQS } from "@/lib/guide-ugc-faqs";
import { PageShell } from "@/components/PageShell";
import { Camera, Wand2, FileVideo, TrendingUp, CheckCircle2 } from "lucide-react";

const CANONICAL = "https://zentryqor.lovable.app/guides/ugc-essentials";
const TITLE = "How to become a UGC creator in 2026 — Zentry Qor";
const DESCRIPTION =
  "A practical guide to becoming a paid UGC creator in 2026: portfolio, pricing, gear, hooks, and the workflow top creators use to ship daily.";


export const Route = createFileRoute("/guides/ugc-essentials")({
  head: () => ({
    meta: [
      { title: TITLE },
      {
        name: "description",
        content: DESCRIPTION,
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "article" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "How to become a UGC creator in 2026",
          description: DESCRIPTION,
          author: { "@type": "Organization", name: "Zentry Qor" },
          publisher: {
            "@type": "Organization",
            name: "Zentry Qor",
            logo: {
              "@type": "ImageObject",
              url: "https://zentryqor.lovable.app/favicon.ico",
            },
          },
          mainEntityOfPage: CANONICAL,
          datePublished: "2026-06-09",
          dateModified: "2026-06-09",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: UgcEssentialsPage,
});

function UgcEssentialsPage() {
  const steps = [
    {
      icon: Camera,
      title: "1. Build a 3-video portfolio in a weekend",
      body: "Pick three products you already own — skincare, a snack, a gadget. Film a unboxing, a problem/solution, and a testimonial. Brands buy proof of execution, not follower counts. A clean Notion or Framer page beats a Linktree.",
    },
    {
      icon: Wand2,
      title: "2. Write hooks the algorithm rewards",
      body: "The first 1.5 seconds decide whether your video gets shown to 1,000 or 100,000 people. Use a hook generator to draft 20 angles per brief, then film the top 3. Pattern interrupts, specific numbers, and contrarian claims still win in 2026.",
    },
    {
      icon: FileVideo,
      title: "3. Ship on a daily cadence",
      body: "One ready-to-pitch deliverable per day for 30 days is more valuable than one polished video per week. A central asset vault — hooks, b-roll, music, captions — is what makes daily output possible without burning out.",
    },
    {
      icon: TrendingUp,
      title: "4. Pitch, price, and repeat",
      body: "Send 10 cold pitches per week with a 30-second Loom. Quote per deliverable, not per hour. Add usage rights as a separate line item (2x base for paid social, 4x for whitelisting). Re-pitch every brand 6 weeks later.",
    },
  ];

  const checklist = [
    "Portfolio site with 3 spec ads (Notion, Framer, or Carrd)",
    "Hook bank: 50 proven openers stored and tagged",
    "Asset vault: b-roll, transitions, music, SFX organized by niche",
    "Rate card: per-video, with-usage, exclusivity tiers",
    "Pitch template: 4 sentences, ends with a CTA to book a 15-min call",
    "Tracking sheet: brand, status, last touch, next follow-up",
  ];

  return (
    <PageShell
      eyebrow="UGC Guide"
      title={
        <>
          How to become a <span className="text-aurora italic font-medium">UGC creator</span> in 2026
        </>
      }
      description="The honest playbook: what UGC actually is, how to build a portfolio in a weekend, what to charge, and the workflow top creators use to ship a deliverable a day without burning out."
    >
      <article className="space-y-12">
        <section className="glass rounded-2xl p-8 space-y-4 text-[15px] text-muted-foreground leading-relaxed">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">What is UGC, really?</h2>
          <p>
            UGC — user-generated content — is video, photo, and written content created by everyday
            people that brands license or commission for their own channels. It outperforms studio
            ads on TikTok, Instagram Reels, and YouTube Shorts because it feels native, not produced.
          </p>
          <p>
            You don't need a following. You're paid for the deliverable, not the distribution.
            A 12-year-old with a phone and a clean portfolio can outearn a 200k-follower creator
            who never sends pitches.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">The 4-step workflow</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {steps.map((s) => (
              <div key={s.title} className="glass rounded-2xl p-6">
                <s.icon className="h-5 w-5 text-accent icon-fx mb-3" />
                <h3 className="text-sm font-semibold tracking-tight mb-2 text-foreground">
                  {s.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="glass rounded-2xl p-8 space-y-4">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">
            The first-30-days checklist
          </h2>
          <ul className="space-y-2.5">
            {checklist.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[15px] text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass-strong rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
            Skip the tab graveyard.
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-6">
            Zentry Qor gives you a hook generator, a curated vault of premium asset packs, and a workspace
            tuned for daily UGC output — all under one subscription.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-medium magnetic glow-primary"
          >
            Start shipping daily
          </Link>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">FAQ</h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="glass rounded-2xl p-5 group">
                <summary className="text-sm font-semibold text-foreground cursor-pointer list-none flex justify-between items-center">
                  {f.q}
                  <span className="text-muted-foreground group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="text-sm text-muted-foreground leading-relaxed mt-3">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </article>
    </PageShell>
  );
}
