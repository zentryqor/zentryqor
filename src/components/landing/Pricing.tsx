import { Check, Sparkles } from "lucide-react";

const free = [
  "Limited daily downloads",
  "Watermarked previews",
  "Basic creator tools",
  "Limited vault access",
];

const premium = [
  "Unlimited downloads",
  "Full vault access — premium packs",
  "All AI tools, no limits",
  "Exclusive drops & early access",
  "Priority support",
  "No watermarks, ever",
];

export function Pricing() {
  return (
    <section id="pricing" className="py-28 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs uppercase tracking-[0.2em] text-accent mb-3">Pricing</div>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-gradient leading-[1.05]">
            One price. Everything unlocked.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start free. Upgrade when you're ready to take it seriously.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Free */}
          <div className="glass rounded-3xl p-7 flex flex-col">
            <div className="text-sm font-medium text-muted-foreground">Free</div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-5xl font-semibold tracking-tight">$0</span>
              <span className="text-muted-foreground text-sm">/forever</span>
            </div>
            <p className="text-sm text-muted-foreground mt-3">For exploring the ecosystem.</p>

            <button className="mt-7 h-11 rounded-xl glass-strong text-sm font-medium magnetic">
              Start free
            </button>

            <ul className="mt-7 space-y-3">
              {free.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 text-muted-foreground/60" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Premium */}
          <div className="relative rounded-3xl p-7 flex flex-col bg-gradient-to-b from-elevated to-surface border border-border overflow-hidden">
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
            <div className="absolute -bottom-32 -left-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  Premium
                </div>
                <div className="text-[10px] uppercase tracking-wider glass-strong rounded-full px-2.5 py-1">
                  Most popular
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-semibold tracking-tight text-gradient-brand">$12.99</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-3">Everything. Unlocked. Forever-iterating.</p>

              <button className="mt-7 w-full h-11 rounded-xl bg-foreground text-background text-sm font-medium magnetic glow-primary">
                Upgrade to Premium
              </button>

              <ul className="mt-7 space-y-3">
                {premium.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <div className="h-4 w-4 mt-0.5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 text-accent" />
                    </div>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
