import { ArrowUpRight, Sparkles, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { AnimatedOrbs } from "./AnimatedOrbs";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { TiltCard } from "@/components/motion/TiltCard";
import { CountUp } from "@/components/motion/CountUp";
import { Typewriter } from "@/components/motion/Typewriter";
import { useIsMobile } from "@/hooks/use-mobile";

const marqueeWords = [
  "Creators",
  "Editors",
  "Designers",
  "Filmmakers",
  "Streamers",
  "Producers",
  "Studios",
  "Founders",
  "Photographers",
  "Writers",
];

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const isMobile = useIsMobile();
  const disableParallax = reduce || isMobile;
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const orbY = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const headlineY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const previewY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const marqueeX = useTransform(scrollYProgress, [0, 1], [0, -180]);

  return (
    <section
      ref={ref}
      className="relative pt-28 sm:pt-36 pb-24 px-4 overflow-hidden"
    >
      {/* Background atmosphere */}
      <div className="absolute inset-0 ring-grid opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <motion.div style={disableParallax ? undefined : { y: orbY }} className="absolute inset-0">
        <AnimatedOrbs />
      </motion.div>
      <div className="absolute inset-0 noise opacity-40" />

      {/* Eyebrow */}
      <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex items-center justify-between gap-4 mb-10 flex-wrap"
        >
          <div className="inline-flex items-center gap-2 glass rounded-full px-3.5 py-1.5 text-xs text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            <span>v1 — shipping daily for creators</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
            <Zap className="h-3 w-3 text-accent" /> 24,000+ creators
          </div>
        </motion.div>

        {/* Asymmetric headline grid */}
        <motion.div
          style={disableParallax ? undefined : { y: headlineY }}
          className="grid grid-cols-12 gap-6 sm:gap-10 items-end"
        >
          <div className="col-span-12 lg:col-span-8">
            <motion.h1
              initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="text-[44px] sm:text-[72px] md:text-[104px] font-semibold tracking-[-0.045em] leading-[0.92] text-gradient"
            >
              Stop juggling
              <br />
              nine apps.
              <br />
              <span className="text-aurora italic font-medium">Ship like a studio.</span>
            </motion.h1>
          </div>

          <div className="col-span-12 lg:col-span-4 lg:pb-4">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-[15px] sm:text-base text-muted-foreground leading-relaxed max-w-md"
            >
              Zentry Qor is the creator OS — a vault of premium assets, AI tools that
              actually move the needle, and a workspace built for serious output.
              <span className="block mt-3 text-foreground/80 font-medium">
                One workspace. One subscription. Zero context-switching.
              </span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-6 flex flex-col sm:flex-row gap-3"
            >
              <MagneticButton
                as={Link as any}
                to="/auth"
                className="group inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-foreground text-background text-sm font-semibold glow-primary w-full sm:w-auto"
              >
                Start free
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </MagneticButton>
              <MagneticButton
                as="a"
                href="#pricing"
                strength={10}
                className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl glass text-sm font-medium w-full sm:w-auto"
              >
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                See pricing
              </MagneticButton>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="mt-4 text-[11px] text-muted-foreground uppercase tracking-[0.18em]"
            >
              No card required · Cancel anytime
            </motion.p>
          </div>
        </motion.div>

        {/* Marquee strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 1.2, delay: 0.8 }}
          style={disableParallax ? undefined : { x: marqueeX }}
          className="relative mt-16 mb-4 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)]"
        >
          <div className="flex gap-12 animate-marquee whitespace-nowrap text-5xl sm:text-7xl font-semibold tracking-[-0.04em] text-foreground/10">
            {[...marqueeWords, ...marqueeWords].map((w, i) => (
              <span key={`${w}-${i}`} className="flex items-center gap-12">
                {w}
                <span className="h-2 w-2 rounded-full bg-accent/40" />
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Product preview — TiltCard */}
      <motion.div
        style={disableParallax ? undefined : { y: previewY }}
        initial={{ opacity: 0, y: 60, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-6xl mt-12"
      >
        <div className="absolute -inset-x-10 top-10 h-[400px] bg-gradient-to-b from-primary/30 to-transparent blur-3xl opacity-50" />

        <TiltCard
          maxTilt={5}
          className="relative glass-strong rounded-3xl p-2 shadow-[0_60px_160px_-30px_oklch(0_0_0/0.8)]"
        >
          <div className="rounded-[20px] bg-surface overflow-hidden border border-border">
            {/* Mock app chrome */}
            <div className="flex items-center gap-2 px-4 h-10 border-b border-border bg-elevated/60">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="mx-auto text-[11px] text-muted-foreground">
                zentryqor.app / dashboard
              </div>
            </div>

            <div className="grid grid-cols-12 gap-px bg-border min-h-[480px]">
              {/* Sidebar */}
              <aside className="col-span-3 hidden md:flex flex-col gap-1 bg-surface p-4">
                {[
                  "Dashboard",
                  "Creator Vault",
                  "AI Tools",
                  "Explore",
                  "Workspace",
                  "Community",
                  "Analytics",
                ].map((label, i) => (
                  <div
                    key={label}
                    className={`px-3 py-2 rounded-lg text-[13px] flex items-center gap-2 ${
                      i === 0 ? "bg-elevated text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        i === 0 ? "bg-accent" : "bg-muted-foreground/40"
                      }`}
                    />
                    {label}
                  </div>
                ))}
              </aside>

              {/* Main */}
              <main className="col-span-12 md:col-span-9 bg-background p-5 sm:p-7 relative overflow-hidden">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-xs text-muted-foreground">Tuesday, June 4</div>
                    <div className="text-lg font-semibold tracking-tight">
                      Good morning, Alex
                    </div>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { l: "Downloads", v: 1284, d: "+12%", spark: true },
                    { l: "Saved", v: 342, d: "+4%" },
                    { l: "AI runs", v: 89, d: "+27%" },
                    { l: "Streak", v: 14, suffix: "d", d: "🔥" },
                  ].map((s) => (
                    <div
                      key={s.l}
                      className="relative rounded-xl bg-elevated/60 border border-border p-3 overflow-hidden"
                    >
                      <div className="text-[11px] text-muted-foreground">{s.l}</div>
                      <div className="text-lg font-semibold tracking-tight mt-0.5">
                        <CountUp to={s.v} suffix={s.suffix ?? ""} />
                      </div>
                      <div className="text-[11px] text-success mt-0.5">{s.d}</div>
                      {s.spark && (
                        <svg
                          viewBox="0 0 100 24"
                          className="absolute bottom-1 right-1 w-16 h-5 opacity-60"
                        >
                          <motion.polyline
                            fill="none"
                            stroke="var(--accent)"
                            strokeWidth="1.5"
                            points="0,18 15,14 30,16 45,8 60,12 75,4 100,6"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.5, delay: 1.2 }}
                          />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 rounded-xl bg-elevated/60 border border-border p-4 sm:h-44 min-w-0 relative overflow-hidden">
                    <div className="text-xs text-muted-foreground mb-2">
                      Trending pack
                    </div>
                    <div className="text-base font-semibold tracking-tight">
                      Cinematic Reels Vol. 4
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      240 assets · LUTs, SFX, overlays
                    </div>
                    <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-primary/30 blur-2xl" />
                    {/* Floating drift dots */}
                    <div className="absolute top-4 right-4 flex gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse [animation-delay:200ms]" />
                    </div>
                  </div>
                  <div className="rounded-xl bg-elevated/60 border border-border p-4 sm:h-44 min-w-0 overflow-hidden">
                    <div className="text-xs text-muted-foreground mb-2">AI Studio</div>
                    <div className="text-[12px] text-foreground/80 leading-snug min-h-[3em]">
                      <Typewriter
                        lines={[
                          "Writing 5 viral hooks…",
                          "Generating thumbnail…",
                          "Drafting 30-sec script…",
                          "Finding trends in your niche…",
                        ]}
                      />
                    </div>
                    <div className="mt-3 space-y-1.5 min-w-0">
                      {["Hook generator", "Caption AI", "Trend finder"].map((t) => (
                        <div
                          key={t}
                          className="text-[12px] py-1 px-2 rounded-md bg-background/40 border border-border/50 truncate"
                        >
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </TiltCard>
      </motion.div>
    </section>
  );
}
