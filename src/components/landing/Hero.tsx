import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import heroStill from "@/assets/cine-hero.jpg";
import { useAuth } from "@/hooks/use-auth";

const WORDS = ["Cinematic", "output.", "Zero", "app", "juggling."];

export function Hero() {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const mediaScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);

  return (
    <section ref={ref} className="relative pt-32 md:pt-44 pb-0">
      <div className="shell">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="eyebrow"
        >
          Asset vault · AI studio · Caption engine
        </motion.p>

        <h1 className="display-1 mt-6 max-w-[16ch] md:max-w-[18ch]">
          {WORDS.map((w, i) => (
            <motion.span
              key={w + i}
              className="inline-block mr-[0.25em]"
              initial={reduce ? undefined : { opacity: 0, y: "0.35em" }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] }}
            >
              {i > 1 ? <span className="text-muted-foreground">{w}</span> : w}
            </motion.span>
          ))}
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between"
        >
          <p className="body-cine max-w-md">
            A studio-grade asset vault, an AI creative desk and a caption engine that
            burns frame-accurate subtitles — one workspace, one subscription.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={user ? "/studio" : "/auth"}
              search={user ? ({ screen: "dashboard" } as never) : undefined}
              className="btn-cine btn-cine-accent group"
            >
              {user ? "Open studio" : "Start creating"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#work" className="btn-cine-ghost">
              See the work
            </a>
          </div>
        </motion.div>
      </div>

      <div className="shell mt-14 md:mt-20">
        <motion.div
          initial={reduce ? undefined : { opacity: 0, y: 40 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="media-frame aspect-[16/10] md:aspect-[16/7]"
        >
          <motion.img
            src={heroStill}
            alt="Creator working in a dark studio lit by a single light bar"
            width={1920}
            height={1088}
            style={reduce ? undefined : { scale: mediaScale }}
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span>4K exports</span>
            <span>Frame-accurate captions</span>
            <span>1,200+ assets</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
