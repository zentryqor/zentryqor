import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

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
  const [annual, setAnnual] = useState(false);

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

        {/* Toggle */}
        <div className="flex justify-center mb-10">
          <div className="glass-strong rounded-full p-1 flex items-center gap-1 text-xs">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 h-8 rounded-full transition ${!annual ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 h-8 rounded-full transition flex items-center gap-1.5 ${annual ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              Annual
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/20 text-accent">
                –17%
              </span>
            </button>
          </div>
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

            <Link to="/auth" className="mt-7 h-11 rounded-xl glass-strong text-sm font-medium magnetic flex items-center justify-center">
              Start free
            </Link>

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
                <span className="text-5xl font-semibold tracking-tight text-gradient-brand">
                  {annual ? "$129" : "$12.99"}
                </span>
                <span className="text-muted-foreground text-sm">{annual ? "/year" : "/month"}</span>
              </div>
              {annual && (
                <div className="mt-1 text-xs text-muted-foreground">
                  ~$10.75/month — 2 months free
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-3">Everything. Unlocked. Forever-iterating.</p>

              <Link
                to="/auth"
                search={{ redirect: "/billing" }}
                className="mt-7 w-full h-11 rounded-xl bg-foreground text-background text-sm font-medium magnetic glow-primary flex items-center justify-center"
              >
                Upgrade to Premium
              </Link>

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
