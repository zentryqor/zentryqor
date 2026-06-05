import { Sparkles, LayoutGrid, Wand2, LineChart, Library, Users } from "lucide-react";
import { motion } from "framer-motion";

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

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export function Features() {
  return (
    <section id="features" className="py-28 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-2xl mb-14"
        >
          <div className="text-xs uppercase tracking-[0.2em] text-accent mb-3">The system</div>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-gradient leading-[1.05]">
            Everything a serious creator needs.
            <span className="text-muted-foreground"> Nothing they don't.</span>
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={itemVariants}
              whileHover={{ y: -4, transition: { type: "spring", stiffness: 300, damping: 20 } }}
              className={`group glass rounded-2xl p-6 magnetic relative overflow-hidden cursor-default ${f.span ?? ""}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-accent/0 group-hover:from-primary/10 group-hover:to-accent/5 transition-all duration-500" />
              <div className="relative">
                <motion.div
                  className="h-10 w-10 rounded-xl bg-elevated border border-border flex items-center justify-center mb-5"
                  whileHover={{ scale: 1.1, rotate: 3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <f.icon className="h-4 w-4 text-accent" />
                </motion.div>
                <h3 className="text-lg font-semibold tracking-tight">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-md">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
