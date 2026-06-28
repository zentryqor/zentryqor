import { ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { CountUp } from "@/components/motion/CountUp";
import { Typewriter } from "@/components/motion/Typewriter";
import { useAuth } from "@/hooks/use-auth";

const tileBase =
  "glass-strong rounded-3xl relative overflow-hidden group";

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 24, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
});

export function Hero() {
  const reduce = useReducedMotion();
  const { user } = useAuth();
  const primaryHref = user ? "/dashboard" : "/auth";
  const primaryLabel = user ? "Open dashboard" : "Start free";

  const MotionLink = motion(Link as any);

  return (
    <section className="relative pt-32 sm:pt-36 pb-16 px-4 sm:px-6">
      <div className="relative mx-auto w-full max-w-7xl grid grid-cols-1 md:grid-cols-12 md:grid-rows-6 gap-3 md:gap-4">
        {/* Tile 1: Massive headline (8 x 4) */}
        <motion.div
          {...(reduce ? {} : fadeUp(0))}
          className={`${tileBase} md:col-span-8 md:row-span-4 p-7 sm:p-10 md:p-12 flex flex-col justify-between min-h-[420px] md:min-h-0`}
        >
          {/* live status chip */}
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success shadow-[0_0_10px_var(--success)]" />
            </span>
            Zentry Qor / Live
          </div>

          <div>
            <h1
              style={{ fontFamily: "var(--font-display)" }}
              className="text-[44px] sm:text-[68px] md:text-[88px] lg:text-[104px] font-extrabold leading-[0.88] tracking-[-0.045em] text-foreground"
            >
              Stop juggling
              <br />
              nine apps.
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(110deg, #2563EB 0%, #FE0100 50%, #10B981 100%)",
                }}
              >
                Ship like a studio.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              A premium asset vault and nine AI tools for short-form creators —
              captions, hooks, scripts, thumbnails. One subscription. One tab.
            </p>
          </div>
        </motion.div>

        {/* Tile 2: Primary CTA (4 x 2) */}
        <MotionLink
          {...(reduce ? {} : fadeUp(0.08))}
          to={primaryHref}
          className="md:col-span-4 md:row-span-2 rounded-3xl p-7 flex flex-col justify-between items-start cursor-pointer relative overflow-hidden group min-h-[180px] md:min-h-0"
          style={{ background: "#2563EB" }}
          whileHover={reduce ? undefined : { scale: 1.01 }}
          whileTap={reduce ? undefined : { scale: 0.98 }}
        >
          <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <ArrowUpRight className="h-6 w-6 text-white transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
          <div>
            <h2
              style={{ fontFamily: "var(--font-display)" }}
              className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight"
            >
              {primaryLabel}
            </h2>
            <p className="mt-1 text-[12px] uppercase tracking-[0.18em] text-white/70">
              No card · cancel anytime
            </p>
          </div>
          <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-white/25 blur-2xl opacity-60 group-hover:scale-150 transition-transform duration-700" />
        </MotionLink>

        {/* Tile 3: Live stats (4 x 2) */}
        <motion.div
          {...(reduce ? {} : fadeUp(0.16))}
          className={`${tileBase} md:col-span-4 md:row-span-2 p-6 flex flex-col justify-between min-h-[180px] md:min-h-0`}
        >
          <div className="flex justify-between items-center">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success shadow-[0_0_10px_var(--success)]" />
            <span className="text-[11px] font-semibold text-muted-foreground tracking-[0.22em] uppercase">
              Vault assets
            </span>
          </div>
          <div>
            <div
              style={{ fontFamily: "var(--font-display)" }}
              className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground"
            >
              <CountUp to={2480} />
            </div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-[0.22em] font-semibold mt-1">
              Packs · LUTs · Overlays · SFX
            </div>
          </div>
        </motion.div>

        {/* Tile 4: AI generation preview (5 x 2) */}
        <motion.div
          {...(reduce ? {} : fadeUp(0.24))}
          className={`${tileBase} md:col-span-5 md:row-span-2 p-6 min-h-[180px] md:min-h-0`}
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklab, #FE0100 18%, transparent), transparent 70%), linear-gradient(180deg, oklch(1 0 0 / 0.06), oklch(1 0 0 / 0.02))",
          }}
        >
          <div className="relative z-10 h-full flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground tracking-[0.22em] uppercase">
              AI Studio / Live
            </span>
            <div className="space-y-3">
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: "20%" }}
                  animate={{ width: ["20%", "92%", "40%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="h-full rounded-full"
                  style={{ background: "#FE0100" }}
                />
              </div>
              <p
                style={{ fontFamily: "var(--font-display)" }}
                className="text-base sm:text-lg font-semibold text-foreground min-h-[1.5em]"
              >
                <Typewriter
                  lines={[
                    "Writing 5 viral hooks…",
                    "Generating thumbnail…",
                    "Drafting a 30-sec script…",
                    "Finding trending sounds…",
                  ]}
                />
              </p>
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-[#FE0100]/40 blur-3xl group-hover:scale-150 transition-transform duration-700" />
        </motion.div>

        {/* Tile 5: Asset strip (7 x 2) */}
        <motion.div
          {...(reduce ? {} : fadeUp(0.32))}
          className={`${tileBase} md:col-span-7 md:row-span-2 p-6 flex flex-col gap-4 min-h-[180px] md:min-h-0`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold text-muted-foreground tracking-[0.22em] uppercase">
              Latest drops
            </span>
            <Link
              to="/assets"
              className="text-[11px] font-semibold text-foreground/80 hover:text-foreground tracking-[0.18em] uppercase inline-flex items-center gap-1"
            >
              Open vault <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex gap-3 flex-1 min-h-0">
            {[
              "linear-gradient(135deg, #1e3a8a, #0a0a0a)",
              "linear-gradient(135deg, #7f1d1d, #0a0a0a)",
              "linear-gradient(135deg, #064e3b, #0a0a0a)",
              "linear-gradient(135deg, #312e81, #0a0a0a)",
            ].map((bg, i) => (
              <div
                key={i}
                className="flex-1 rounded-xl border border-white/10 overflow-hidden relative"
                style={{ background: bg, opacity: 1 - i * 0.18 }}
              >
                <div className="absolute inset-0 opacity-30 noise" />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
