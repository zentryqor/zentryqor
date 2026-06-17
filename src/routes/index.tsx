import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { ScrollStory } from "@/components/landing/ScrollStory";
import { VaultPreview } from "@/components/landing/VaultPreview";
import { Pricing } from "@/components/landing/Pricing";

import { FAQ } from "@/components/landing/FAQ";
import { CtaFooter } from "@/components/landing/CtaFooter";
import { MobileStickyCTA } from "@/components/landing/MobileStickyCTA";
import { ColorfulBackground } from "@/components/landing/ColorfulBackground";
import { GlassDivider } from "@/components/motion/GlassDivider";

const HOME_FAQS = [
  { q: "What's actually in Zentry Qor?", a: "A growing vault of premium asset packs (overlays, LUTs, hook libraries, templates) and nine AI tools tuned for short-form: captions, hooks, scripts, thumbnails, hashtags, trends, planner, brand bio, and video ideas." },
  { q: "What does the free tier get me?", a: "3 downloads per day, 3 AI text runs per day, and access to every free asset in the vault." },
  { q: "What do I get on Premium?", a: "Unlimited downloads from the full vault and 1,000 AI credits per day (text tools cost 10, thumbnail images cost 30). $12.99/month or $129/year." },
  { q: "Can I cancel anytime?", a: "Yes — one click in Billing. You keep Premium until the end of the current period, no questions asked." },
  { q: "Is my work private?", a: "Your downloads, saves, and AI inputs are tied to your account and never sold or used to train models." },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zentry Qor — Ship like a studio." },
      {
        name: "description",
        content:
          "A premium asset vault and nine AI tools for short-form creators — captions, hooks, scripts, thumbnails, and more. One subscription. One tab.",
      },
      {
        property: "og:title",
        content: "Zentry Qor — Ship like a studio.",
      },
      {
        property: "og:description",
        content:
          "A premium asset vault and nine AI tools for short-form creators. One subscription. One tab.",
      },
      { property: "og:url", content: "https://zentryqor.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://zentryqor.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Zentry Qor",
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Web",
          url: "https://zentryqor.lovable.app/",
          description:
            "A premium asset vault and nine AI tools for short-form creators — captions, hooks, scripts, thumbnails, hashtags, and more.",
          offers: [
            { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
            { "@type": "Offer", name: "Premium Monthly", price: "12.99", priceCurrency: "USD" },
            { "@type": "Offer", name: "Premium Annual", price: "129", priceCurrency: "USD" },
          ],
        }),
      },
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
    <div className="relative min-h-screen text-foreground overflow-x-hidden">
      <ColorfulBackground />
      <Nav />
      <main className="relative z-10">
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
