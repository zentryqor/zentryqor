import { Sparkles, LayoutGrid, Wand2, LineChart, Library, Users } from "lucide-react";

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
    <section id="features" className="py-28 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-14">
          <div className="text-xs uppercase tracking-[0.2em] text-accent mb-3">The system</div>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-gradient leading-[1.05]">
            Everything a serious creator needs.
            <span className="text-muted-foreground"> Nothing they don't.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {features.map((f) => (
            <div
              key={f.title}
              className={`group glass rounded-2xl p-6 magnetic relative overflow-hidden ${f.span ?? ""}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-accent/0 group-hover:from-primary/10 group-hover:to-accent/5 transition-all duration-500" />
              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-elevated border border-border flex items-center justify-center mb-5">
                  <f.icon className="h-4 w-4 text-accent" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-md">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
