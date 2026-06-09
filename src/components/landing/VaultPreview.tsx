import { TrendingUp, Download, Bookmark, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { TiltCard } from "@/components/motion/TiltCard";
import { Reveal } from "@/components/motion/Reveal";

const packs = [
  {
    title: "Cinematic Reels",
    tag: "Editing",
    count: "240 assets",
    grad: "from-primary/40 to-accent/20",
    badge: "Trending",
    span: "md:col-span-4 md:row-span-2",
    aspect: "aspect-[4/5]",
  },
  {
    title: "Viral Hooks 2026",
    tag: "Captions",
    count: "1,200 hooks",
    grad: "from-accent/40 to-primary/20",
    badge: "New",
    span: "md:col-span-2",
    aspect: "aspect-[4/3]",
  },
  {
    title: "Brand Identity Kit",
    tag: "Design",
    count: "80 templates",
    grad: "from-primary/30 to-foreground/5",
    span: "md:col-span-2",
    aspect: "aspect-[4/3]",
  },
  {
    title: "Motion Overlays Pro",
    tag: "Motion",
    count: "320 clips",
    grad: "from-accent/30 to-primary/10",
    badge: "Premium",
    span: "md:col-span-3",
    aspect: "aspect-[16/9]",
  },
  {
    title: "Thumbnail Lab",
    tag: "YouTube",
    count: "150 templates",
    grad: "from-foreground/10 to-primary/20",
    span: "md:col-span-3",
    aspect: "aspect-[16/9]",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function VaultPreview() {
  return (
    <section id="vault" className="py-28 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <Reveal className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <div className="max-w-xl">
            <div className="text-xs uppercase tracking-[0.22em] text-accent mb-3">
              Creator vault
            </div>
            <h2 className="text-4xl sm:text-6xl font-semibold tracking-[-0.035em] text-gradient leading-[1.02]">
              Assets that actually
              <br />
              <span className="text-aurora italic font-medium inline-block pr-2">move</span> the needle.
            </h2>
          </div>
          <div className="flex gap-2 text-xs">
            {["Trending", "New", "Most loved", "Free", "Premium"].map((t, i) => (
              <motion.button
                key={t}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={`px-3.5 h-8 rounded-full border transition-colors ${
                  i === 0
                    ? "bg-foreground text-background border-foreground"
                    : "glass text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </motion.button>
            ))}
          </div>
        </Reveal>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 auto-rows-auto gap-4"
        >
          {packs.map((p) => (
            <motion.div key={p.title} variants={itemVariants} className={`${p.span ?? ""}`}>
              <TiltCard
                maxTilt={6}
                className="group glass rounded-2xl overflow-hidden cursor-default h-full"
              >
                <div className={`relative ${p.aspect} bg-gradient-to-br ${p.grad} overflow-hidden`}>
                  <div className="absolute inset-0 ring-grid opacity-30" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />

                  {p.badge && (
                    <motion.div
                      initial={{ y: -8, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 }}
                      className="absolute top-3 left-3 glass-strong rounded-full px-2.5 py-1 text-[10px] font-medium flex items-center gap-1"
                    >
                      {p.badge === "Trending" && <TrendingUp className="h-3 w-3 text-accent" />}
                      {p.badge}
                    </motion.div>
                  )}

                  {/* Glass-morph preview overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 backdrop-blur-md bg-background/30" />
                    <button className="relative z-10 glass-strong rounded-full px-4 h-10 text-xs font-medium flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-accent" />
                      Preview pack
                    </button>
                  </div>

                  <div className="absolute bottom-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      className="h-8 w-8 rounded-lg glass-strong flex items-center justify-center"
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      className="h-8 w-8 rounded-lg bg-foreground text-background flex items-center justify-center"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </motion.button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {p.tag}
                  </div>
                  <div className="text-[15px] font-semibold tracking-tight mt-1">{p.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{p.count}</div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
