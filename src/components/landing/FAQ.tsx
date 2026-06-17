import { useState } from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  {
    q: "What's actually in Zentry Qor?",
    a: "A growing vault of premium asset packs — overlays, LUTs, hook libraries, templates — plus nine AI tools tuned for short-form: captions, hooks, scripts, thumbnails, hashtags, trends, planner, brand bio, and video ideas.",
  },
  {
    q: "What does the free tier get me?",
    a: "3 asset downloads per day, 3 AI text runs per day, and access to every free asset in the vault. Enough to see if the workflow fits.",
  },
  {
    q: "What's on Premium?",
    a: "$12.99/month or $129/year. Unlimited downloads from the full vault and 1,000 AI credits per day (text tools cost 10 credits, thumbnail images cost 30).",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — one click in Billing. You keep Premium until the end of the current period. No retention emails, no dark patterns.",
  },
  {
    q: "Is my work safe?",
    a: "Your downloads, saves, and AI inputs stay on your account. We do not sell your data or train models on what you type into the tools.",
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
                    <Plus className="h-4 w-4 text-muted-foreground icon-fx" />
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
