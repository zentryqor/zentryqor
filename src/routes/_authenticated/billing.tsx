import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getMyContext } from "@/lib/preferences.functions";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Upgrade — Zentry Qor" }] }),
  component: Billing,
});

const PERKS = [
  "Unlimited vault downloads",
  "Every premium AI tool, no limits",
  "Exclusive drops & early access",
  "No watermarks, ever",
  "Priority support",
  "Cancel anytime",
];

function Billing() {
  const fetchCtx = useServerFn(getMyContext);
  const { data: ctx } = useQuery({ queryKey: ["me"], queryFn: () => fetchCtx() });
  const isPremium = ctx?.isPremium;

  function handleUpgrade() {
    toast.info("Stripe checkout opens in the next step", {
      description: "Payment integration is being finalized.",
    });
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/15 blur-3xl pointer-events-none" />

      <div className="relative max-w-2xl mx-auto px-6 py-14">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-10">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>

        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3 flex items-center justify-center gap-1.5">
            <Sparkles className="h-3 w-3" /> Premium
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-gradient leading-[1.05]">
            One price. Everything unlocked.
          </h1>
        </div>

        <div className="relative rounded-3xl p-8 bg-gradient-to-b from-elevated to-surface border border-border overflow-hidden">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />

          <div className="relative">
            <div className="flex items-baseline gap-1">
              <span className="text-6xl font-semibold tracking-tight text-gradient-brand">$12.99</span>
              <span className="text-muted-foreground">/month</span>
            </div>

            <ul className="mt-6 space-y-3">
              {PERKS.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm">
                  <div className="h-5 w-5 mt-0.5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-accent" />
                  </div>
                  <span>{p}</span>
                </li>
              ))}
            </ul>

            {isPremium ? (
              <div className="mt-7 h-12 rounded-xl glass-strong text-sm font-medium flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-accent mr-1.5" /> You're on Premium
              </div>
            ) : (
              <button
                onClick={handleUpgrade}
                className="mt-7 w-full h-12 rounded-xl bg-foreground text-background text-sm font-medium magnetic glow-primary"
              >
                Upgrade for $12.99/mo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
