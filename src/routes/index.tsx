import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { Features } from "@/components/landing/Features";
import { VaultPreview } from "@/components/landing/VaultPreview";
import { Pricing } from "@/components/landing/Pricing";
import { Testimonials } from "@/components/landing/Testimonials";
import { FAQ } from "@/components/landing/FAQ";
import { CtaFooter } from "@/components/landing/CtaFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zentry Qor — Your Ultimate Creator Operating System" },
      { name: "description", content: "One premium ecosystem for creators to create, organize, and grow faster. Vault, AI tools, analytics — built for serious creators." },
      { property: "og:title", content: "Zentry Qor — Your Ultimate Creator Operating System" },
      { property: "og:description", content: "One premium ecosystem for creators to create, organize, and grow faster." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <SocialProof />
        <Features />
        <VaultPreview />
        <Pricing />
        <Testimonials />
        <FAQ />
        <CtaFooter />
      </main>
    </div>
  );
}
