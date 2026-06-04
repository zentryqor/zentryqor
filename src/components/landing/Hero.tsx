import { ArrowUpRight, Sparkles, Play } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Hero() {
  return (
    <section className="relative pt-32 sm:pt-44 pb-20 sm:pb-24 px-4 overflow-hidden">
      {/* Background atmosphere */}
      <div className="absolute inset-0 ring-grid opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-primary/20 blur-[120px] opacity-60 animate-pulse-glow" />
      <div className="absolute top-20 right-10 h-72 w-72 rounded-full bg-accent/20 blur-[100px] opacity-50" />
      <div className="absolute inset-0 noise opacity-40" />

      <div className="relative mx-auto max-w-5xl text-center">
        <div className="inline-flex items-center gap-2 glass rounded-full px-3.5 py-1.5 text-xs text-muted-foreground mb-7">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span>Introducing Zentry Qor v1 — built for creators</span>
          <span className="text-foreground/60">→</span>
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-[88px] font-semibold tracking-[-0.04em] leading-[0.95] text-gradient">
          Your ultimate creator
          <br />
          <span className="text-gradient-brand">operating system.</span>
        </h1>

        <p className="mt-7 max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
          One premium ecosystem to create, organize, and grow faster. Vault, AI tools,
          analytics, and a creator workspace — engineered for serious creators.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:flex-wrap">
          <Link to="/auth" className="group inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-foreground text-background text-sm font-medium magnetic glow-primary w-full sm:w-auto">
            Start creating free
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <a href="#pricing" className="group inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl glass text-sm font-medium magnetic w-full sm:w-auto">
            <Play className="h-3.5 w-3.5 fill-foreground" />
            See pricing
          </a>
        </div>

        <p className="mt-5 text-xs text-muted-foreground">
          No card required · 14-day premium trial · Cancel anytime
        </p>
      </div>

      {/* Product preview card */}
      <div className="relative mx-auto max-w-6xl mt-20">
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
                  <div
                    key={label}
                    className={`px-3 py-2 rounded-lg text-[13px] flex items-center gap-2 ${
                      i === 0 ? "bg-elevated text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <div className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-accent" : "bg-muted-foreground/40"}`} />
                    {label}
                  </div>
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
                  ].map((s) => (
                    <div key={s.l} className="rounded-xl bg-elevated/60 border border-border p-3">
                      <div className="text-[11px] text-muted-foreground">{s.l}</div>
                      <div className="text-lg font-semibold tracking-tight mt-0.5">{s.v}</div>
                      <div className="text-[11px] text-success mt-0.5">{s.d}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 rounded-xl bg-elevated/60 border border-border p-4 h-44 relative overflow-hidden">
                    <div className="text-xs text-muted-foreground mb-2">Trending pack</div>
                    <div className="text-base font-semibold tracking-tight">Cinematic Reels Vol. 4</div>
                    <div className="text-xs text-muted-foreground mt-1">240 assets · LUTs, SFX, overlays</div>
                    <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-primary/30 blur-2xl" />
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
      </div>
    </section>
  );
}
