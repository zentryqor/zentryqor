import { motion } from "framer-motion";
import { Lightbulb, Layers, Scissors, Rocket } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

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
    sub: "Pull from a curated vault of premium packs. No more scouring Pinterest.",
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
  return (
    <>
      {/* Mobile: stacked layout */}
      <section className="md:hidden relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 ring-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="relative max-w-xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs uppercase tracking-[0.22em] text-accent mb-3">
              The creator loop
            </div>
            <h2 className="text-3xl font-semibold tracking-[-0.035em] text-gradient leading-[1.05]">
              From spark to ship —
              <span className="text-aurora italic font-medium"> without leaving.</span>
            </h2>
          </div>
          <div className="space-y-6">
            {stages.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="relative glass rounded-2xl p-5 flex gap-4 items-start">
                  <div className={`absolute -inset-2 bg-gradient-to-b ${s.accent} blur-2xl opacity-40 -z-10`} />
                  <div className="h-12 w-12 rounded-xl glass-strong flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                      Stage 0{i + 1} / 04
                    </div>
                    <h3 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-gradient">
                      {s.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                      {s.sub}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Desktop: full-viewport 4-column timeline with connecting beam */}
      <section className="hidden md:block relative py-32 px-4 overflow-hidden">
        <div className="absolute inset-0 ring-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="absolute top-1/2 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto mb-20">
            <div className="text-xs uppercase tracking-[0.22em] text-accent mb-3">
              The creator loop
            </div>
            <h2 className="text-5xl lg:text-6xl font-semibold tracking-[-0.035em] text-gradient leading-[1.02]">
              From spark to ship —
              <span className="text-aurora italic font-medium"> without leaving.</span>
            </h2>
            <p className="mt-6 text-base text-muted-foreground leading-relaxed">
              Four stages, one workspace. Every step designed to compress the
              distance between idea and published.
            </p>
          </Reveal>

          <div className="relative">
            {/* Connecting beam */}
            <svg
              viewBox="0 0 1200 120"
              className="absolute top-16 left-0 w-full h-32 pointer-events-none opacity-50 hidden lg:block"
              preserveAspectRatio="none"
            >
              <motion.path
                d="M 80 60 Q 350 10 600 60 T 1120 60"
                fill="none"
                stroke="url(#scrollStoryBeam)"
                strokeWidth="1.5"
                strokeDasharray="4 6"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
              />
              <defs>
                <linearGradient id="scrollStoryBeam" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0" />
                  <stop offset="50%" stopColor="var(--accent)" stopOpacity="1" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 relative">
              {stages.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={s.title}
                    initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
                    whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{
                      duration: 0.7,
                      delay: i * 0.15,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className={`relative ${i % 2 === 1 ? "lg:translate-y-12" : ""}`}
                  >
                    <div className="relative glass rounded-3xl p-8 h-full overflow-hidden group">
                      <div className={`absolute -top-16 -right-16 h-48 w-48 rounded-full bg-gradient-to-br ${s.accent} blur-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-700`} />
                      <div className="relative">
                        <div className="h-16 w-16 rounded-2xl glass-strong flex items-center justify-center shadow-elegant">
                          <Icon className="h-7 w-7 text-accent" />
                        </div>
                        <div className="mt-6 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                          Stage 0{i + 1} / 04
                        </div>
                        <h3 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-gradient">
                          {s.title}
                        </h3>
                        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                          {s.sub}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
