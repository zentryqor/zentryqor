import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Zentry Qor" },
      { name: "description", content: "Zentry Qor's 30-day money-back guarantee and how to request a refund through Paddle." },
      { property: "og:title", content: "Refund Policy — Zentry Qor" },
      { property: "og:description", content: "30-day money-back guarantee. Refunds are processed by Paddle, our Merchant of Record." },
      { property: "og:url", content: "https://zentryqor.lovable.app/refund" },
    ],
    links: [{ rel: "canonical", href: "https://zentryqor.lovable.app/refund" }],
  }),
  component: RefundPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function RefundPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title={<>Refund <span className="text-aurora italic font-medium">Policy.</span></>}
      description="Last updated June 10, 2026. Zentry Qor offers a 30-day money-back guarantee on all purchases."
    >
      <div className="glass rounded-2xl p-8 space-y-8">
        <Section title="30-day money-back guarantee">
          <p>
            We want you to be happy with Zentry Qor. If you're not satisfied with your purchase, you can request a full refund within <strong>30 days</strong> of your order date — for any reason.
          </p>
        </Section>
        <Section title="How to request a refund">
          <p>
            Refunds are processed by our payment provider and Merchant of Record, Paddle. To request a refund:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Visit <a className="text-accent underline" href="https://paddle.net" target="_blank" rel="noreferrer">paddle.net</a> and look up your order using the email address you used at checkout, or</li>
            <li>Email us at <a className="text-accent" href="mailto:zentryqor@gmail.com">zentryqor@gmail.com</a> and we'll help arrange the refund with Paddle.</li>
          </ul>
          <p>Approved refunds are returned to your original payment method, typically within 5–10 business days depending on your bank.</p>
        </Section>
        <Section title="Subscriptions">
          <p>
            You can cancel an active subscription at any time through the customer portal accessible from your account, or via Paddle. Cancelling stops future renewals. For refunds on a recent renewal, contact us within the 30-day window above.
          </p>
        </Section>
        <Section title="Merchant of Record">
          <p>
            Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns. See Paddle's <a className="text-accent underline" href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noreferrer">Refund Policy</a> and <a className="text-accent underline" href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noreferrer">Buyer Terms</a> for additional details.
          </p>
        </Section>
        <Section title="Contact">
          <p>
            Questions about a refund? Email <a className="text-accent" href="mailto:zentryqor@gmail.com">zentryqor@gmail.com</a>.
          </p>
        </Section>
      </div>
    </PageShell>
  );
}
