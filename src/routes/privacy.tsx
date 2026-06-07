import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Zentry Qor" },
      { name: "description", content: "How Zentry Qor collects, uses, and protects your data." },
      { property: "og:title", content: "Privacy Policy — Zentry Qor" },
      { property: "og:description", content: "How Zentry Qor collects, uses, and protects your data." },
    ],
  }),
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title={<>Privacy <span className="text-aurora italic font-medium">Notice.</span></>}
      description="Last updated June 7, 2026. This notice explains what data we collect and why."
    >
      <div className="glass rounded-2xl p-8 space-y-8">
        <Section title="1. Who is the controller">
          <p>Zentry Qor Ltd. ("we") is the data controller for personal data collected through the Service.</p>
        </Section>
        <Section title="2. Data we collect">
          <ul className="list-disc pl-5 space-y-1">
            <li>Account data: name, email, password hash, profile preferences.</li>
            <li>Usage data: actions, downloads, AI runs, device and browser info, IP address.</li>
            <li>Content: assets you upload, AI prompts, projects you create.</li>
            <li>Support data: messages you send to our support team.</li>
          </ul>
        </Section>
        <Section title="3. How we use it">
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide the Service and your account (contract performance).</li>
            <li>Improve the product and prevent abuse (legitimate interests).</li>
            <li>Send service emails and, with consent, product updates.</li>
            <li>Comply with legal obligations (tax, fraud prevention).</li>
          </ul>
          <p>We do not train AI models on your private content.</p>
        </Section>
        <Section title="4. Who we share data with">
          <ul className="list-disc pl-5 space-y-1">
            <li>Subprocessors: cloud hosting, analytics, support tooling, transactional email.</li>
            <li>Paddle.com, our Merchant of Record, for payments, subscriptions, tax, and invoicing.</li>
            <li>Professional advisors (legal, accounting) when required.</li>
            <li>Authorities where required by law.</li>
          </ul>
        </Section>
        <Section title="5. International transfers">
          <p>If data is transferred outside the UK/EEA, we rely on Standard Contractual Clauses or adequacy decisions to protect it.</p>
        </Section>
        <Section title="6. Retention">
          <p>We keep account data while your account is active and for up to 12 months after closure, unless a longer period is required by law. You can request earlier deletion at any time.</p>
        </Section>
        <Section title="7. Your rights">
          <p>Subject to applicable law, you have rights to access, rectify, delete, restrict, port, and object to processing of your data, and to withdraw consent. You can also complain to a supervisory authority. We respond within one month.</p>
        </Section>
        <Section title="8. Security">
          <p>We use encryption in transit and at rest, strict access controls, and regular reviews. No system is perfectly secure — please use a strong, unique password.</p>
        </Section>
        <Section title="9. Cookies">
          <p>We use essential cookies for authentication and a limited set of analytics cookies. You can manage preferences from the cookie banner.</p>
        </Section>
        <Section title="10. Contact">
          <p>Privacy questions? Email <a className="text-accent" href="mailto:privacy@zentryqor.com">privacy@zentryqor.com</a>.</p>
        </Section>
      </div>
    </PageShell>
  );
}
