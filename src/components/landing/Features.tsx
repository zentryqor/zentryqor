import { Sparkles, LayoutGrid, Wand2, LineChart, Library, Users, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { TiltCard } from "@/components/motion/TiltCard";
import { Reveal } from "@/components/motion/Reveal";
import { Typewriter } from "@/components/motion/Typewriter";
import { CountUp } from "@/components/motion/CountUp";
import { MotionIcon } from "@/components/motion/MotionIcon";


export function Features() {
  return (
    <section id="features" className="py-28 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <Reveal className="max-w-2xl mb-14">
          <div className="text-xs uppercase tracking-[0.22em] text-accent mb-3">
            Built different
          </div>
          <h2 className="text-4xl sm:text-6xl font-semibold tracking-[-0.035em] text-gradient leading-[1.02]">
            Every tool a serious
            <br />
            creator needs.{" "}
            <span className="text-muted-foreground italic font-medium">Nothing they don't.</span>
          </h2>
        </Reveal>

        {/* Bento grid — 6 cols, asymmetric on md+, natural stacking on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-6 md:auto-rows-[180px] gap-3">
          {/* Vault — large hero card (4 cols, 2 rows on md+) */}
          <TiltCard
            maxTilt={4}
            className="md:col-span-4 md:row-span-2 group rounded-3xl glass overflow-hidden cursor-default relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative h-full p-6 md:p-7 flex flex-col gap-5 md:gap-0">
              <div className="flex items-center justify-between">
                <MotionIcon className="h-11 w-11 rounded-xl bg-elevated border border-border icon-fx-glow icon-fx-shimmer">
                  <Library className="h-5 w-5 text-accent icon-fx" />
                </MotionIcon>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors icon-fx" />
              </div>
              <div className="md:mt-auto">
                <h3 className="text-2xl font-semibold tracking-tight">
                  Creator Vault
                </h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
                  Thousands of premium packs — LUTs, overlays, hook libraries,
                  templates. Curated weekly, not dumped monthly.
                </p>
              </div>

              {/* Floating asset thumbnails — desktop only */}
              <div className="absolute right-6 top-16 hidden md:flex gap-3 -rotate-6">
                {[
                  "from-primary/40 to-accent/20",
                  "from-accent/40 to-primary/20",
                  "from-primary/30 to-foreground/5",
                ].map((g, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: 0 }}
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 4 + i,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.4,
                    }}
                    className={`w-28 h-36 rounded-2xl bg-gradient-to-br ${g} border border-border/60 shadow-elegant`}
                  >
                    <div className="h-full w-full ring-grid opacity-30 rounded-2xl" />
                  </motion.div>
                ))}
              </div>

              <div className="md:mt-4 flex items-center gap-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <span>
                  <CountUp to={3200} suffix="+" className="text-foreground font-semibold not-italic normal-case tracking-normal text-base" /> assets
                </span>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span>Updated weekly</span>
              </div>
            </div>
          </TiltCard>

          {/* AI Tools — wide (2 cols, 1 row) */}
          <TiltCard
            maxTilt={6}
            className="md:col-span-2 group rounded-3xl glass overflow-hidden cursor-default relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative h-full p-6 flex flex-col">
              <MotionIcon className="h-10 w-10 rounded-xl bg-elevated border border-border icon-fx-glow icon-fx-shimmer">
                <Wand2 className="h-4 w-4 text-accent icon-fx" />
              </MotionIcon>
              <h3 className="text-lg font-semibold tracking-tight mt-4">AI that ships</h3>
              <div className="text-[12px] text-muted-foreground mt-2 min-h-[3em] leading-snug">
                <Typewriter
                  lines={[
                    "Generating viral hooks…",
                    "Writing 30-sec script…",
                    "Finding hot trends…",
                  ]}
                />
              </div>
            </div>
          </TiltCard>

          {/* Analytics — wide */}
          <TiltCard
            maxTilt={6}
            className="md:col-span-2 group rounded-3xl glass overflow-hidden cursor-default relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative h-full p-6 flex flex-col">
              <div className="flex items-start justify-between">
                <MotionIcon className="h-10 w-10 rounded-xl bg-elevated border border-border icon-fx-glow icon-fx-shimmer">
                  <LineChart className="h-4 w-4 text-accent icon-fx" />
                </MotionIcon>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    7d
                  </div>
                  <div className="text-sm font-semibold text-success">+34%</div>
                </div>
              </div>
              <h3 className="text-lg font-semibold tracking-tight mt-4">Analytics</h3>
              {/* Mini chart */}
              <svg viewBox="0 0 120 40" className="w-full h-10 md:mt-auto">
                <motion.path
                  d="M0,32 L15,28 L30,30 L45,18 L60,22 L75,10 L90,14 L105,6 L120,8"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.6, ease: "easeOut" }}
                />
                <motion.path
                  d="M0,32 L15,28 L30,30 L45,18 L60,22 L75,10 L90,14 L105,6 L120,8 L120,40 L0,40 Z"
                  fill="url(#g1)"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.4 }}
                />
                <defs>
                  <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </TiltCard>

          {/* Workspace — small */}
          <TiltCard
            maxTilt={8}
            className="md:col-span-2 group rounded-3xl glass overflow-hidden cursor-default relative"
          >
            <div className="relative h-full p-6 flex flex-col">
              <MotionIcon className="h-10 w-10 rounded-xl bg-elevated border border-border icon-fx-glow icon-fx-shimmer">
                <LayoutGrid className="h-4 w-4 text-accent icon-fx" />
              </MotionIcon>
              <h3 className="text-lg font-semibold tracking-tight md:mt-auto">Workspace</h3>
              <p className="text-xs text-muted-foreground mt-1.5">
                Moodboards, projects, drag-and-drop. Built for flow state.
              </p>
            </div>
          </TiltCard>

          {/* Community — small */}
          <TiltCard
            maxTilt={8}
            className="md:col-span-2 group rounded-3xl glass overflow-hidden cursor-default relative"
          >
            <div className="relative h-full p-6 flex flex-col">
              <MotionIcon className="h-10 w-10 rounded-xl bg-elevated border border-border icon-fx-glow icon-fx-shimmer">
                <Users className="h-4 w-4 text-accent icon-fx" />
              </MotionIcon>
              <h3 className="text-lg font-semibold tracking-tight md:mt-auto">Community</h3>
              <p className="text-xs text-muted-foreground mt-1.5">
                Real feedback. Weekly challenges. Zero hustle-bros.
              </p>
            </div>
          </TiltCard>

          {/* Personalized — small */}
          <TiltCard
            maxTilt={8}
            className="md:col-span-2 group rounded-3xl glass overflow-hidden cursor-default relative"
          >
            <div className="relative h-full p-6 flex flex-col">
              <MotionIcon className="h-10 w-10 rounded-xl bg-elevated border border-border icon-fx-glow icon-fx-shimmer">
                <Sparkles className="h-4 w-4 text-accent icon-fx" />
              </MotionIcon>
              <h3 className="text-lg font-semibold tracking-tight md:mt-auto">
                Tuned to you
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5">
                Recommendations that learn your niche, your platform, your taste.
              </p>
            </div>
          </TiltCard>
        </div>
      </div>
    </section>
  );
}
