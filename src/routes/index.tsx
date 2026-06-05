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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zentry Qor — Stop juggling nine apps. Ship like a studio." },
      {
        name: "description",
        content:
          "The creator OS: 3,200+ premium asset packs, AI tools that ship, and a workspace built for daily output. One subscription. Zero context-switching.",
      },
      {
        property: "og:title",
        content: "Zentry Qor — Stop juggling nine apps. Ship like a studio.",
      },
      {
        property: "og:description",
        content:
          "The creator OS: 3,200+ premium asset packs, AI tools that ship, and a workspace built for daily output.",
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
