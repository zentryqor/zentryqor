import { TrendingUp, Download, Bookmark } from "lucide-react";

const packs = [
  { title: "Cinematic Reels", tag: "Editing", count: "240 assets", grad: "from-primary/40 to-accent/20", badge: "Trending" },
  { title: "Viral Hooks 2026", tag: "Captions", count: "1,200 hooks", grad: "from-accent/40 to-primary/20", badge: "New" },
  { title: "Brand Identity Kit", tag: "Design", count: "80 templates", grad: "from-primary/30 to-foreground/5" },
  { title: "Motion Overlays Pro", tag: "Motion", count: "320 clips", grad: "from-accent/30 to-primary/10", badge: "Premium" },
  { title: "Thumbnail Lab", tag: "YouTube", count: "150 templates", grad: "from-foreground/10 to-primary/20" },
  { title: "Notion for Creators", tag: "Productivity", count: "24 systems", grad: "from-primary/20 to-accent/30" },
];

export function VaultPreview() {
  return (
    <section id="vault" className="py-28 px-4 relative">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <div className="max-w-xl">
            <div className="text-xs uppercase tracking-[0.2em] text-accent mb-3">Creator vault</div>
            <h2 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-gradient leading-[1.05]">
              A vault of resources that actually move the needle.
            </h2>
          </div>
          <div className="flex gap-2 text-xs">
            {["Trending", "New", "Most downloaded", "Free", "Premium"].map((t, i) => (
              <button
                key={t}
                className={`px-3.5 h-8 rounded-full border ${
                  i === 0 ? "bg-foreground text-background border-foreground" : "glass text-muted-foreground hover:text-foreground"
                } transition-colors`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packs.map((p) => (
            <div key={p.title} className="group glass rounded-2xl overflow-hidden magnetic">
              <div className={`relative aspect-[4/3] bg-gradient-to-br ${p.grad} overflow-hidden`}>
                <div className="absolute inset-0 ring-grid opacity-30" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                {p.badge && (
                  <div className="absolute top-3 left-3 glass-strong rounded-full px-2.5 py-1 text-[10px] font-medium flex items-center gap-1">
                    {p.badge === "Trending" && <TrendingUp className="h-3 w-3 text-accent" />}
                    {p.badge}
                  </div>
                )}
                <div className="absolute bottom-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="h-8 w-8 rounded-lg glass-strong flex items-center justify-center">
                    <Bookmark className="h-3.5 w-3.5" />
                  </button>
                  <button className="h-8 w-8 rounded-lg bg-foreground text-background flex items-center justify-center">
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{p.tag}</div>
                <div className="text-[15px] font-semibold tracking-tight mt-1">{p.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{p.count}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
