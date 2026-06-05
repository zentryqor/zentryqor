import { ArrowUpRight, Sparkles, Play } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { Magnetic, WordReveal } from "@/components/motion/primitives";

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const yBg = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const yMock = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const opacityBg = useTransform(scrollYProgress, [0, 1], [1, 0.3]);

  // Mouse-follow light
  const mx = useMotionValue(50);
  const my = useMotionValue(20);
  const smx = useSpring(mx, { stiffness: 60, damping: 20 });
  const smy = useSpring(my, { stiffness: 60, damping: 20 });
  const bg1 = useTransform([smx, smy], ([x, y]: number[]) =>
    `radial-gradient(600px circle at ${x}% ${y}%, oklch(0.56 0.22 264 / 0.18), transparent 60%)`
  );

  const isFinePointer = typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)").matches;

  return (
    <section
      ref={sectionRef}
      onMouseMove={isFinePointer ? (e) => {
        const r = sectionRef.current?.getBoundingClientRect();
        if (!r) return;
        mx.set(((e.clientX - r.left) / r.width) * 100);
        my.set(((e.clientY - r.top) / r.height) * 100);
      } : undefined}
      className="relative pt-32 sm:pt-44 pb-20 sm:pb-24 px-4 overflow-hidden"
    >
      {/* Background atmosphere */}
      <motion.div style={{ y: yBg, opacity: opacityBg }} className="absolute inset-0 ring-grid opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <motion.div
        style={{ y: yBg }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-primary/20 blur-[120px] opacity-60"
        animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.7, 0.45] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Mouse-follow ambient light — desktop only */}
      {isFinePointer && (
        <motion.div
          aria-hidden
          className="absolute inset-0 pointer-events-none hidden md:block"
          style={{ background: bg1 }}
        />
      )}
      <div className="absolute inset-0 noise opacity-40" />


      <div className="relative mx-auto max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 glass rounded-full px-3.5 py-1.5 text-xs text-muted-foreground mb-7"
        >
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span>Introducing Zentry Qor v1 — built for creators</span>
          <span className="text-foreground/60">→</span>
        </motion.div>

        <h1 className="text-5xl sm:text-7xl md:text-[88px] font-semibold tracking-[-0.04em] leading-[0.95]">
          <span className="text-gradient block">
            <WordReveal text="Your ultimate creator" />
          </span>
          <span className="text-gradient-brand block bg-[length:200%_100%] animate-[shine_6s_linear_infinite]">
            <WordReveal text="operating system." delay={0.4} />
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-7 max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed"
        >
          One premium ecosystem to create, organize, and grow faster. Vault, AI tools,
          analytics, and a creator workspace — engineered for serious creators.
        </motion.p>

        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { delayChildren: 1.0, staggerChildren: 0.1 } } }}
          className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:flex-wrap"
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 240, damping: 22 } },
            }}
            className="w-full sm:w-auto"
          >
            <Magnetic strength={14}>
              <Link
                to="/auth"
                className="group inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-foreground text-background text-sm font-medium glow-primary w-full sm:w-auto relative overflow-hidden"
              >
                <motion.span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
                />
                <span className="relative">Start creating free</span>
                <ArrowUpRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </Magnetic>
          </motion.div>
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 240, damping: 22 } },
            }}
            className="w-full sm:w-auto"
          >
            <Magnetic strength={10}>
              <a href="#pricing" className="group inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl glass text-sm font-medium w-full sm:w-auto hover:bg-foreground/5 transition-colors">
                <Play className="h-3.5 w-3.5 fill-foreground" />
                See pricing
              </a>
            </Magnetic>
          </motion.div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.4 }}
          className="mt-5 text-xs text-muted-foreground"
        >
          No card required · 14-day premium trial · Cancel anytime
        </motion.p>
      </div>

      {/* Product preview card */}
      <motion.div
        style={{ y: yMock }}
        initial={{ opacity: 0, y: 60, filter: "blur(14px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1.1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-6xl mt-20"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="absolute -inset-x-10 top-10 h-[400px] bg-gradient-to-b from-primary/30 to-transparent blur-3xl opacity-50" />
          <div className="relative glass-strong rounded-3xl p-2 shadow-[0_60px_160px_-30px_oklch(0_0_0/0.8)]">
            <div className="rounded-[20px] bg-surface overflow-hidden border border-border">
              {/* Mock app chrome */}
              <div className="flex items-center gap-2 px-4 h-10 border-b border-border bg-elevated/60">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                </div>
                <div className="mx-auto text-[11px] text-muted-foreground">zentryqor.app/dashboard</div>
              </div>

              <div className="grid grid-cols-12 gap-px bg-border min-h-[440px]">
                {/* Sidebar */}
                <aside className="col-span-3 hidden md:flex flex-col gap-1 bg-surface p-4">
                  {["Dashboard", "Creator Vault", "AI Tools", "Explore", "Workspace", "Community", "Analytics"].map((label, i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 1.0 + i * 0.06 }}
                      className={`px-3 py-2 rounded-lg text-[13px] flex items-center gap-2 ${
                        i === 0 ? "bg-elevated text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      <div className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-accent" : "bg-muted-foreground/40"}`} />
                      {label}
                    </motion.div>
                  ))}
                </aside>

                {/* Main */}
                <main className="col-span-12 md:col-span-9 bg-background p-5 sm:p-7">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <div className="text-xs text-muted-foreground">Tuesday, June 4</div>
                      <div className="text-lg font-semibold tracking-tight">Good morning, Alex</div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent" />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { l: "Downloads", v: "1,284", d: "+12%" },
                      { l: "Saved", v: "342", d: "+4%" },
                      { l: "AI runs", v: "89", d: "+27%" },
                      { l: "Streak", v: "14d", d: "🔥" },
                    ].map((s, i) => (
                      <motion.div
                        key={s.l}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 1.2 + i * 0.08 }}
                        className="rounded-xl bg-elevated/60 border border-border p-3"
                      >
                        <div className="text-[11px] text-muted-foreground">{s.l}</div>
                        <div className="text-lg font-semibold tracking-tight mt-0.5">{s.v}</div>
                        <div className="text-[11px] text-success mt-0.5">{s.d}</div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 rounded-xl bg-elevated/60 border border-border p-4 h-44 relative overflow-hidden">
                      <div className="text-xs text-muted-foreground mb-2">Trending pack</div>
                      <div className="text-base font-semibold tracking-tight">Cinematic Reels Vol. 4</div>
                      <div className="text-xs text-muted-foreground mt-1">240 assets · LUTs, SFX, overlays</div>
                      <motion.div
                        className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-primary/30 blur-2xl"
                        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                    <div className="rounded-xl bg-elevated/60 border border-border p-4 h-44">
                      <div className="text-xs text-muted-foreground mb-2">AI tools</div>
                      {["Hook generator", "Caption AI", "Trend finder"].map((t) => (
                        <div key={t} className="text-[13px] py-1.5 border-b border-border/60 last:border-0 truncate">{t}</div>
                      ))}
                    </div>
                  </div>
                </main>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
