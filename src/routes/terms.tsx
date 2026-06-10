import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Zentry Qor" },
      { name: "description", content: "Read the Terms of Service that govern your use of the Zentry Qor platform and services." },
      { property: "og:title", content: "Terms of Service — Zentry Qor" },
      { property: "og:description", content: "Read the Terms of Service that govern your use of the Zentry Qor platform and services." },
      { property: "og:url", content: "https://zentryqor.lovable.app/terms" },
    ],
    links: [{ rel: "canonical", href: "https://zentryqor.lovable.app/terms" }],
  }),
  component: TermsPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function TermsPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title={<>Terms of <span className="text-aurora italic font-medium">Service.</span></>}
      description="Last updated June 7, 2026. By using Zentry Qor, you agree to these terms."
    >
      <div className="glass rounded-2xl p-8 space-y-8">
        <Section title="1. Who we are">
          <p>Zentry Qor (the "Service") is operated by Zentry Qor Ltd. ("we", "us"). By accessing or using the Service, you agree to be bound by these Terms.</p>
        </Section>
        <Section title="2. Your account">
          <p>You must provide accurate information, keep your credentials confidential, and be responsible for activity under your account. You must be of legal age in your jurisdiction or have authority to bind your organization.</p>
        </Section>
        <Section title="3. Acceptable use">
          <p>You agree not to misuse the Service, including: unlawful use, fraud or spam, IP infringement, distributing malware, scraping, probing, or interfering with security or other users.</p>
        </Section>
        <Section title="4. AI features">
          <p>You are responsible for your prompts and for verifying that outputs are accurate and that you hold the necessary rights to any input content. Outputs may be inaccurate and are not a substitute for professional advice. We may filter, restrict, or remove content and may suspend accounts for repeated or serious violations.</p>
        </Section>
        <Section title="5. Intellectual property">
          <p>We retain all rights, title, and interest in the Service, including software, documentation, and branding. You retain ownership of your content and grant us a limited license to host and process it solely to provide the Service.</p>
        </Section>
        <Section title="6. Payments, subscriptions & refunds">
          <p>Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns. Subscriptions renew automatically until cancelled. For payment, billing, tax, cancellation, and refund mechanics, see Paddle's <a className="text-accent underline" href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noreferrer">Buyer Terms</a>.</p>
          <p>We offer a <strong>30-day money-back guarantee</strong> on all purchases. See our full <a className="text-accent underline" href="/refund">Refund Policy</a> for details on how to request a refund.</p>
        </Section>
        <Section title="7. Service level">
          <p>We do not guarantee that the Service will be uninterrupted or error-free. To the fullest extent permitted by law, we disclaim all implied warranties, including merchantability and fitness for a particular purpose.</p>
        </Section>
        <Section title="8. Liability">
          <p>Our aggregate liability is capped at the fees you paid in the prior 12 months. We exclude liability for indirect, consequential, or special damages, except where excluded by law (such as fraud, death, or personal injury).</p>
        </Section>
        <Section title="9. Suspension & termination">
          <p>We may suspend or terminate access for material breach, non-payment, security or fraud risk, or repeated policy violations. On termination, you may export your data within 30 days; afterwards it will be deleted.</p>
        </Section>
        <Section title="10. Governing law">
          <p>These Terms are governed by the laws of England and Wales. Disputes will be resolved in the competent courts of London, UK.</p>
        </Section>
        <Section title="11. Changes">
          <p>We may update these Terms. Material changes will be notified by email or in-app at least 14 days before they take effect.</p>
        </Section>
        <Section title="12. Contact">
          <p>Questions? Email <a className="text-accent" href="mailto:legal@zentryqor.com">legal@zentryqor.com</a>.</p>
        </Section>
      </div>
    </PageShell>
  );
}
