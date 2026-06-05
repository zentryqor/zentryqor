import { useState } from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  { q: "What exactly is Zentry Qor?", a: "A premium operating system for creators — vault, AI tools, workspace, analytics, and community in one polished app." },
  { q: "What's included in the free tier?", a: "Limited daily downloads, watermarked previews, basic creator tools, and limited vault access. Enough to get a feel for the ecosystem." },
  { q: "Can I cancel anytime?", a: "Yes. Cancel in one click — you keep premium access until the end of your billing period." },
  { q: "Do you offer a student discount?", a: "Yes, verified students get 40% off. Email support after signup with your .edu address." },
  { q: "Is my data secure?", a: "Encryption in transit and at rest. We don't train models on your private content. Ever." },
  { q: "Do you support teams?", a: "Team workspaces are in private beta. Join the waitlist from your profile after signup." },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-28 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <div className="text-xs uppercase tracking-[0.2em] text-accent mb-3">FAQ</div>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-gradient leading-[1.05]">
            Questions, answered.
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
