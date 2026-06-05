import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Lightbulb, Layers, Scissors, Rocket } from "lucide-react";

const stages = [
  {
    icon: Lightbulb,
    title: "Idea",
    sub: "AI surfaces hooks, trends, and angles tuned to your niche.",
    accent: "from-amber-400/40 to-amber-400/0",
  },
  {
    icon: Layers,
    title: "Asset",
    sub: "Pull from a vault of 3,200+ packs. No more scouring Pinterest.",
    accent: "from-primary/40 to-primary/0",
  },
  {
    icon: Scissors,
    title: "Edit",
    sub: "Templates, scripts, and tools that turn drafts into finals.",
    accent: "from-accent/40 to-accent/0",
  },
  {
    icon: Rocket,
    title: "Ship",
    sub: "Schedule, publish, track. Repeat tomorrow without burning out.",
    accent: "from-emerald-400/40 to-emerald-400/0",
  },
];

export function ScrollStory() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  return (
    <section ref={ref} className="relative" style={{ height: "320vh" }}>
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 ring-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

        <div className="relative max-w-6xl w-full px-4">
          <Header progress={scrollYProgress} />

          <div className="relative mt-12 sm:mt-16 h-[420px] sm:h-[480px]">
            {stages.map((s, i) => (
              <Stage key={s.title} index={i} total={stages.length} progress={scrollYProgress} stage={s} reduce={!!reduce} />
            ))}

            {/* Connecting beam */}
            <ConnectingBeam progress={scrollYProgress} />
          </div>

          {/* Stage indicator */}
          <StageDots progress={scrollYProgress} />
        </div>
      </div>
    </section>
  );
}

function Header({ progress }: { progress: any }) {
  const opacity = useTransform(progress, [0, 0.05, 0.95, 1], [0, 1, 1, 0]);
  return (
    <motion.div style={{ opacity }} className="text-center max-w-2xl mx-auto">
      <div className="text-xs uppercase tracking-[0.22em] text-accent mb-3">
        The creator loop
      </div>
      <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.035em] text-gradient leading-[1.05]">
        From spark to ship —
        <span className="text-aurora italic font-medium"> without leaving.</span>
      </h2>
    </motion.div>
  );
}

function Stage({
  index,
  total,
  progress,
  stage,
  reduce,
}: {
  index: number;
  total: number;
  progress: any;
  stage: (typeof stages)[number];
  reduce: boolean;
}) {
  const step = 1 / total;
  const start = index * step;
  const peak = start + step / 2;
  const end = start + step;

  const opacity = useTransform(progress, [start, peak, end], [0, 1, 0]);
  const scale = useTransform(progress, [start, peak, end], [0.85, 1, 0.85]);
  const y = useTransform(progress, [start, peak, end], [40, 0, -40]);
  const blur = useTransform(progress, [start, peak, end], ["12px", "0px", "12px"]);

  const Icon = stage.icon;

  return (
    <motion.div
      style={
        reduce
          ? { opacity: index === 0 ? 1 : 0 }
          : { opacity, scale, y, filter: blur.get ? (blur as any) : undefined }
      }
      className="absolute inset-0 flex flex-col items-center justify-center text-center"
    >
      <div className="relative">
        <div className={`absolute -inset-20 bg-gradient-to-b ${stage.accent} blur-3xl opacity-60`} />
        <div className="relative h-24 w-24 sm:h-32 sm:w-32 rounded-3xl glass-strong flex items-center justify-center shadow-elegant">
          <Icon className="h-10 w-10 sm:h-12 sm:w-12 text-accent" />
        </div>
      </div>
      <div className="mt-8 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
        Stage 0{index + 1} / 04
      </div>
      <h3 className="mt-3 text-4xl sm:text-6xl font-semibold tracking-[-0.035em] text-gradient">
        {stage.title}
      </h3>
      <p className="mt-4 max-w-md text-sm sm:text-base text-muted-foreground leading-relaxed">
        {stage.sub}
      </p>
    </motion.div>
  );
}

function ConnectingBeam({ progress }: { progress: any }) {
  const pathLength = useTransform(progress, [0, 1], [0, 1]);
  return (
    <svg
      viewBox="0 0 800 480"
      className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
      preserveAspectRatio="none"
    >
      <motion.path
        d="M 100 240 Q 300 80 400 240 T 700 240"
        fill="none"
        stroke="url(#beamGrad)"
        strokeWidth="1.5"
        style={{ pathLength }}
      />
      <defs>
        <linearGradient id="beamGrad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0" />
          <stop offset="50%" stopColor="var(--accent)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function StageDots({ progress }: { progress: any }) {
  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
      {stages.map((_, i) => {
        const step = 1 / stages.length;
        const start = i * step;
        const end = start + step;
        return (
          <Dot key={i} start={start} end={end} progress={progress} />
        );
      })}
    </div>
  );
}

function Dot({ start, end, progress }: { start: number; end: number; progress: any }) {
  const width = useTransform(progress, [start, (start + end) / 2, end], [24, 56, 24]);
  const opacity = useTransform(progress, [start, (start + end) / 2, end], [0.3, 1, 0.3]);
  return (
    <motion.div
      style={{ width, opacity }}
      className="h-1.5 rounded-full bg-foreground"
    />
  );
}
