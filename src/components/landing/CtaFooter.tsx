import { ArrowUpRight } from "lucide-react";

export function CtaFooter() {
  return (
    <section className="px-4 pt-20 pb-10">
      <div className="relative max-w-6xl mx-auto rounded-[32px] overflow-hidden border border-border bg-gradient-to-b from-elevated to-surface p-10 sm:p-16 text-center">
        <div className="absolute inset-0 ring-grid opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-80 w-[600px] rounded-full bg-primary/30 blur-3xl" />

        <div className="relative">
          <h2 className="text-4xl sm:text-6xl font-semibold tracking-[-0.04em] text-gradient leading-[1.0]">
            Enter the vault.
            <br />
            <span className="text-gradient-brand">Create like a pro.</span>
          </h2>
          <p className="mt-5 text-muted-foreground max-w-xl mx-auto">
            Join thousands of creators using Zentry Qor to ship better content, faster.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <button className="group inline-flex items-center gap-2 h-12 px-5 rounded-xl bg-foreground text-background text-sm font-medium magnetic glow-primary">
              Start free
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
            <button className="h-12 px-5 rounded-xl glass text-sm font-medium magnetic">
              View pricing
            </button>
          </div>
        </div>
      </div>

      <footer className="max-w-6xl mx-auto mt-14 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-md bg-gradient-to-br from-primary-glow to-primary" />
          <span>© {new Date().getFullYear()} Zentry Qor — Made for creators.</span>
        </div>
        <div className="flex gap-6">
          <a className="hover:text-foreground transition-colors" href="#">Privacy</a>
          <a className="hover:text-foreground transition-colors" href="#">Terms</a>
          <a className="hover:text-foreground transition-colors" href="#">Twitter</a>
        </div>
      </footer>
    </section>
  );
}
