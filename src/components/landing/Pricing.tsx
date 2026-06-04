import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import { Reveal, StaggerGroup, StaggerItem, Magnetic } from "@/components/motion/primitives";

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
    <section id="pricing" className="py-28 px-4 relative">
      <div className="max-w-5xl mx-auto">
        <Reveal className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs uppercase tracking-[0.2em] text-accent mb-3">Pricing</div>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-gradient leading-[1.05]">
            One price. Everything unlocked.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start free. Upgrade when you're ready to take it seriously.
          </p>
        </Reveal>

        {/* Toggle */}
        <Reveal delay={0.1} className="flex justify-center mb-10">
          <LayoutGroup>
            <div className="glass-strong rounded-full p-1 flex items-center gap-1 text-xs relative">
              {(["monthly", "annual"] as const).map((k) => {
                const active = (k === "annual") === annual;
                return (
                  <button
                    key={k}
                    onClick={() => setAnnual(k === "annual")}
                    className={`relative px-4 h-8 rounded-full transition-colors flex items-center gap-1.5 ${active ? "text-background" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {active && (
                      <motion.span
                        layoutId="pricing-pill"
                        transition={{ type: "spring", stiffness: 320, damping: 28 }}
                        className="absolute inset-0 rounded-full bg-foreground"
                      />
                    )}
                    <span className="relative capitalize">{k}</span>
                    {k === "annual" && (
                      <span className={`relative text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full ${active ? "bg-background/20 text-background" : "bg-primary/20 text-accent"}`}>
                        –17%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        </Reveal>

        <StaggerGroup className="grid md:grid-cols-2 gap-4 items-stretch" staggerChildren={0.12}>
          {/* Free */}
          <StaggerItem>
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 240, damping: 20 }}
              className="glass rounded-3xl p-7 flex flex-col h-full"
            >
              <div className="text-sm font-medium text-muted-foreground">Free</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-semibold tracking-tight">$0</span>
                <span className="text-muted-foreground text-sm">/forever</span>
              </div>
              <p className="text-sm text-muted-foreground mt-3">For exploring the ecosystem.</p>

              <Magnetic strength={8} className="mt-7">
                <Link to="/auth" className="h-11 rounded-xl glass-strong text-sm font-medium flex items-center justify-center hover:bg-foreground/5 transition-colors">
                  Start free
                </Link>
              </Magnetic>

              <ul className="mt-7 space-y-3">
                {free.map((f, i) => (
                  <motion.li
                    key={f}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
                    className="flex items-start gap-2.5 text-sm text-muted-foreground"
                  >
                    <Check className="h-4 w-4 mt-0.5 text-muted-foreground/60" />
                    {f}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </StaggerItem>

          {/* Premium */}
          <StaggerItem>
            <motion.div
              whileHover={{ y: -8 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="relative rounded-3xl p-7 flex flex-col bg-gradient-to-b from-elevated to-surface border border-border overflow-hidden md:-translate-y-2 h-full"
            >
              <motion.div
                className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/30 blur-3xl"
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute -bottom-32 -left-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl"
                animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    Premium
                  </div>
                  <motion.div
                    animate={{ boxShadow: ["0 0 0 0 oklch(0.78 0.13 230 / 0.0)", "0 0 24px 2px oklch(0.78 0.13 230 / 0.35)", "0 0 0 0 oklch(0.78 0.13 230 / 0.0)"] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                    className="text-[10px] uppercase tracking-wider glass-strong rounded-full px-2.5 py-1"
                  >
                    Most popular
                  </motion.div>
                </div>

                <div className="mt-4 flex items-baseline gap-1 min-h-[58px]">
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={annual ? "y" : "m"}
                      initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -12, filter: "blur(8px)" }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="text-5xl font-semibold tracking-tight text-gradient-brand inline-flex items-baseline gap-1"
                    >
                      {annual ? "$129" : "$12.99"}
                      <span className="text-muted-foreground text-sm font-normal">{annual ? "/year" : "/month"}</span>
                    </motion.span>
                  </AnimatePresence>
                </div>
                <AnimatePresence>
                  {annual && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-xs text-muted-foreground overflow-hidden"
                    >
                      ~$10.75/month — 2 months free
                    </motion.div>
                  )}
                </AnimatePresence>
                <p className="text-sm text-muted-foreground mt-3">Everything. Unlocked. Forever-iterating.</p>

                <Magnetic strength={12} className="mt-7">
                  <Link
                    to="/auth"
                    search={{ redirect: "/billing" }}
                    className="w-full h-11 rounded-xl bg-foreground text-background text-sm font-medium glow-primary flex items-center justify-center relative overflow-hidden"
                  >
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0"
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                    />
                    <span className="relative">Upgrade to Premium</span>
                  </Link>
                </Magnetic>

                <ul className="mt-7 space-y-3">
                  {premium.map((f, i) => (
                    <motion.li
                      key={f}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.15 + i * 0.05 }}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      <div className="h-4 w-4 mt-0.5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Check className="h-2.5 w-2.5 text-accent" />
                      </div>
                      <span>{f}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </StaggerItem>
        </StaggerGroup>
      </div>
    </section>
  );
}
