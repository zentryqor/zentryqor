import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { BookOpen, CreditCard, Sparkles, Shield, LifeBuoy, Plus } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Center — Zentry Qor" },
      { name: "description", content: "FAQs, guides, and support for Zentry Qor." },
      { property: "og:title", content: "Help Center — Zentry Qor" },
      { property: "og:description", content: "FAQs, guides, and support." },
    ],
  }),
  component: HelpPage,
});

const topics = [
  { icon: BookOpen, title: "Getting started", body: "Set up your workspace in under 5 minutes." },
  { icon: Sparkles, title: "AI Studio", body: "How credits, models, and tools work." },
  { icon: CreditCard, title: "Billing", body: "Subscriptions, refunds, and invoices." },
  { icon: Shield, title: "Account & security", body: "Passwords, 2FA, and data exports." },
];

const faqs = [
  { q: "How do AI credits work?", a: "Premium gets 1000 credits per day. Credits reset every 24 hours and do not roll over. Each tool lists its cost before you run it." },
  { q: "Can I cancel anytime?", a: "Yes — one click in Billing. You keep Premium until the end of the period." },
  { q: "Do you offer refunds?", a: "We offer a 30-day money-back guarantee. Refunds are processed by our payment provider, Paddle, at paddle.net." },
  { q: "Is my work private?", a: "Yes. Your projects are encrypted in transit and at rest. We never train models on your private content." },
  { q: "How do I contact support?", a: "Email zentryqor@gmail.com or use the contact form. We reply within one business day." },
];

function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <PageShell
      eyebrow="Help Center"
      title={<>How can we <span className="text-aurora italic font-medium">help?</span></>}
      description="Browse common topics or jump into the FAQ. Still stuck? Contact support directly."
    >
      <div className="grid sm:grid-cols-2 gap-3 mb-12">
        {topics.map((t) => (
          <div key={t.title} className="glass rounded-2xl p-5 flex gap-4 items-start">
            <t.icon className="h-5 w-5 text-accent icon-fx mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold tracking-tight mb-1">{t.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.body}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-semibold tracking-tight mb-4">Frequently asked</h2>
      <div className="space-y-2 mb-10">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className="glass rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between text-left px-5 py-4 hover:bg-elevated/40 transition-colors"
              >
                <span className="text-[15px] font-medium tracking-tight">{f.q}</span>
                <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.25 }}>
                  <Plus className="h-4 w-4 text-muted-foreground icon-fx" />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="glass-strong rounded-2xl p-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <LifeBuoy className="h-5 w-5 text-accent icon-fx" />
          <div>
            <p className="text-sm font-semibold">Still need help?</p>
            <p className="text-xs text-muted-foreground">Our team replies within one business day.</p>
          </div>
        </div>
        <Link to="/contact" className="h-10 px-5 rounded-xl bg-foreground text-background text-sm font-semibold inline-flex items-center">
          Contact support
        </Link>
      </div>
    </PageShell>
  );
}
