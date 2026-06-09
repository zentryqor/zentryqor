import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { ScrollStory } from "@/components/landing/ScrollStory";
import { VaultPreview } from "@/components/landing/VaultPreview";
import { Pricing } from "@/components/landing/Pricing";
import { Testimonials } from "@/components/landing/Testimonials";
import { FAQ } from "@/components/landing/FAQ";
import { CtaFooter } from "@/components/landing/CtaFooter";
import { MobileStickyCTA } from "@/components/landing/MobileStickyCTA";
import { GlassDivider } from "@/components/motion/GlassDivider";

const HOME_FAQS = [
  { q: "What's actually in Zentry Qor?", a: "A vault of 3,200+ premium asset packs, nine AI tools tuned for short-form, a workspace for projects and moodboards, analytics, and a community of working creators." },
  { q: "What does the free tier get me?", a: "30 downloads a month, watermarked previews, and 3 AI runs a day." },
  { q: "Can I cancel anytime?", a: "Yes — one click in Billing. You keep Premium until the end of the period." },
  { q: "Is my work safe?", a: "Encrypted in transit and at rest. We do not train models on your private projects." },
  { q: "Teams?", a: "Team workspaces are in private beta. Join the waitlist from your profile after signup." },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zentry Qor — Ship like a studio." },
      {
        name: "description",
        content:
          "The creator OS: 3,200+ premium asset packs, AI tools that ship, and a workspace built for daily output. One subscription. Zero context-switching.",
      },
      {
        property: "og:title",
        content: "Zentry Qor — Ship like a studio.",
      },
      {
        property: "og:description",
        content:
          "The creator OS: 3,200+ premium asset packs, AI tools that ship, and a workspace built for daily output.",
      },
      { property: "og:url", content: "https://zentryqor.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://zentryqor.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: HOME_FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />
      <main>
        <Hero />
        <GlassDivider className="max-w-6xl mx-auto" />
        <Features />
        <ScrollStory />
        <GlassDivider className="max-w-6xl mx-auto" />
        <VaultPreview />
        <GlassDivider className="max-w-6xl mx-auto" />
        <Pricing />
        <GlassDivider className="max-w-6xl mx-auto" />
        <Testimonials />
        <FAQ />
        <CtaFooter />
        <div className="md:hidden h-20" aria-hidden />
      </main>
      <MobileStickyCTA />
    </div>
  );
}
