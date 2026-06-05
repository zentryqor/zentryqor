import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";

const free = [
  "Limited daily downloads",
  "Watermarked previews",
  "Basic creator tools",
  "Limited vault access",
];

const premium = [
  "Unlimited downloads",
  "Full vault access — premium packs",
  "All AI tools, no limits",
  "Exclusive drops & early access",
  "Priority support",
  "No watermarks, ever",
];

export function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-28 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <div className="text-xs uppercase tracking-[0.2em] text-accent mb-3">Pricing</div>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-gradient leading-[1.05]">
            One price. Everything unlocked.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start free. Upgrade when you're ready to take it seriously.
          </p>
        </motion.div>

        {/* Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center mb-10"
        >
          <div className="glass-strong rounded-full p-1 flex items-center relative text-xs select-none">
            <motion.div
              layout
              layoutId="pricing-toggle-pill"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute top-1 bottom-1 rounded-full bg-foreground"
              style={{
                left: annual ? "50%" : "4px",
                right: annual ? "4px" : "50%",
                width: annual ? "calc(50% - 4px)" : "calc(50% - 4px)",
              }}
            />
            <button
              onClick={() => setAnnual(false)}
              className={`relative z-10 px-5 h-8 rounded-full text-xs font-medium transition-colors duration-200 ${
                !annual ? "text-background" : "text-muted-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`relative z-10 px-5 h-8 rounded-full text-xs font-medium transition-colors duration-200 flex items-center gap-1.5 ${
                annual ? "text-background" : "text-muted-foreground"
              }`}
            >
              Annual
              <span
                className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full transition-colors duration-200 ${
                  annual ? "bg-background/20 text-background" : "bg-primary/20 text-accent"
                }`}
              >
                –17%
              </span>
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="grid md:grid-cols-2 gap-4"
        >
          {/* Free */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="glass rounded-3xl p-7 flex flex-col"
          >
            <div className="text-sm font-medium text-muted-foreground">Free</div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-5xl font-semibold tracking-tight">$0</span>
              <span className="text-muted-foreground text-sm">/forever</span>
            </div>
            <p className="text-sm text-muted-foreground mt-3">For exploring the ecosystem.</p>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
              <Link to="/auth" className="mt-7 h-11 rounded-xl glass-strong text-sm font-medium magnetic flex items-center justify-center">
                Start free
              </Link>
            </motion.div>

            <ul className="mt-7 space-y-3">
              {free.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 text-muted-foreground/60" />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Premium */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative rounded-3xl p-7 flex flex-col bg-gradient-to-b from-elevated to-surface border border-border overflow-hidden"
          >
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
            <div className="absolute -bottom-32 -left-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  Premium
                </div>
                <div className="text-[10px] uppercase tracking-wider glass-strong rounded-full px-2.5 py-1">
                  Most popular
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={annual ? "annual-price" : "monthly-price"}
                    initial={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="text-5xl font-semibold tracking-tight text-gradient-brand"
                  >
                    {annual ? "$129" : "$12.99"}
                  </motion.span>
                </AnimatePresence>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={annual ? "annual-period" : "monthly-period"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-muted-foreground text-sm"
                  >
                    {annual ? "/year" : "/month"}
                  </motion.span>
                </AnimatePresence>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                {annual && (
                  <motion.div
                    key="annual-note"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1 text-xs text-muted-foreground">
                      ~$10.75/month — 2 months free
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="text-sm text-muted-foreground mt-3">Everything. Unlocked. Forever-iterating.</p>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                <Link
                  to="/auth"
                  search={{ redirect: "/billing" }}
                  className="mt-7 w-full h-11 rounded-xl bg-foreground text-background text-sm font-medium magnetic glow-primary flex items-center justify-center"
                >
                  Upgrade to Premium
                </Link>
              </motion.div>

              <ul className="mt-7 space-y-3">
                {premium.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <div className="h-4 w-4 mt-0.5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 text-accent" />
                    </div>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
