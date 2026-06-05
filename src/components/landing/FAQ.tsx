import { useState } from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  {
    q: "What's actually in Zentry Qor?",
    a: "A vault of 3,200+ premium asset packs, nine AI tools tuned for short-form, a workspace for projects and moodboards, analytics, and a community of working creators. One subscription, one tab.",
  },
  {
    q: "What does the free tier get me?",
    a: "30 downloads a month, watermarked previews, and 3 AI runs a day. Enough to see if the system fits your workflow.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — one click in Billing. You keep Premium until the end of the period. No retention emails, no dark patterns.",
  },
  {
    q: "Student discount?",
    a: "40% off for verified students. Sign up with your .edu address, then email support — we apply it within a day.",
  },
  {
    q: "Is my work safe?",
    a: "Encrypted in transit and at rest. We do not train models on your private projects. Ever.",
  },
  {
    q: "Teams?",
    a: "Team workspaces are in private beta. Join the waitlist from your profile after signup.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-28 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <div className="text-xs uppercase tracking-[0.22em] text-accent mb-3">FAQ</div>
          <h2 className="text-4xl sm:text-6xl font-semibold tracking-[-0.035em] text-gradient leading-[1.02]">
            Questions,
            <span className="text-aurora italic font-medium"> answered.</span>
          </h2>
        </motion.div>


        <div className="space-y-2">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={f.q}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
                className="glass rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between text-left px-5 py-4 hover:bg-elevated/40 transition-colors"
                >
                  <span className="text-[15px] font-medium tracking-tight">{f.q}</span>
                  <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
