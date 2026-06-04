import { Sparkles, LayoutGrid, Wand2, LineChart, Library, Users } from "lucide-react";
import { motion } from "framer-motion";
import { StaggerGroup, StaggerItem, Reveal } from "@/components/motion/primitives";

const features = [
  {
    icon: Library,
    title: "Creator Vault",
    desc: "Thousands of premium packs — LUTs, overlays, templates, hooks, captions. Curated, not cluttered.",
    span: "md:col-span-2",
  },
  {
    icon: Wand2,
    title: "AI tools that actually ship",
    desc: "Hooks, scripts, thumbnails, trends. Trained on what's working right now.",
  },
  {
    icon: LayoutGrid,
    title: "Workspace",
    desc: "Moodboards, projects, and collections — drag, drop, ship.",
  },
  {
    icon: LineChart,
    title: "Analytics",
    desc: "Track growth, output, and streaks. Beautiful charts, honest signal.",
    span: "md:col-span-2",
  },
  {
    icon: Users,
    title: "Community",
    desc: "Feedback, challenges, and a network of serious creators.",
  },
  {
    icon: Sparkles,
    title: "Personalized",
    desc: "Recommendations tuned to your niche, platforms, and skill level.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-28 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <Reveal className="max-w-2xl mb-14">
          <div className="text-xs uppercase tracking-[0.2em] text-accent mb-3">The system</div>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-gradient leading-[1.05]">
            Everything a serious creator needs.
            <span className="text-muted-foreground"> Nothing they don't.</span>
          </h2>
        </Reveal>

        <StaggerGroup className="grid grid-cols-1 md:grid-cols-3 gap-3" staggerChildren={0.08}>
          {features.map((f) => (
            <StaggerItem key={f.title} className={f.span ?? ""}>
              <motion.div
                whileHover={{ y: -6, rotateX: 2, rotateY: -2 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                className="group glass rounded-2xl p-6 relative overflow-hidden h-full"
                style={{ transformPerspective: 800 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-accent/0 group-hover:from-primary/10 group-hover:to-accent/5 transition-all duration-500" />
                <motion.div
                  aria-hidden
                  className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: "linear-gradient(120deg, transparent 30%, oklch(0.78 0.13 230 / 0.25), transparent 70%)",
                    maskImage: "linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                    padding: 1,
                  }}
                />
                <div className="relative">
                  <motion.div
                    whileHover={{ rotate: -8, scale: 1.08 }}
                    transition={{ type: "spring", stiffness: 300, damping: 14 }}
                    className="h-10 w-10 rounded-xl bg-elevated border border-border flex items-center justify-center mb-5"
                  >
                    <f.icon className="h-4 w-4 text-accent" />
                  </motion.div>
                  <h3 className="text-lg font-semibold tracking-tight">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-md">{f.desc}</p>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
