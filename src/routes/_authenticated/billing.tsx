import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaddleCheckout } from "@/hooks/use-paddle-checkout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { AnimatedOrbs } from "@/components/landing/AnimatedOrbs";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Upgrade — Zentry Qor" }] }),
  component: Billing,
});

const PERKS = [
  "Unlimited vault downloads",
  "1,000 AI credits / day",
  "Every premium AI tool, no limits",
  "Exclusive drops & early access",
  "No watermarks, ever",
  "Priority support",
  "Cancel anytime",
];

function Billing() {
  const { user } = useAuth();
  const { isPremium, isPastDue, isCanceling, subscription } = useSubscription(user?.id);
  const { openCheckout, loading } = usePaddleCheckout();
  const [interval, setInterval] = useState<"month" | "year">("month");

  const priceId =
    interval === "month" ? "premium_monthly" : "premium_annual";
  const displayPrice = interval === "month" ? "$12.99" : "$129";
  const cadence = interval === "month" ? "/month" : "/year";
  const annualSavings = interval === "year";

  function handleUpgrade() {
    if (!user) return;
    openCheckout({
      priceId,
      customerEmail: user.email ?? undefined,
      customData: { userId: user.id },
      successUrl: `${window.location.origin}/dashboard?checkout=success`,
    });
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <PaymentTestModeBanner />
      <AnimatedOrbs />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
        aria-hidden
      />


      <div className="relative max-w-2xl mx-auto px-6 py-14">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-10"
        >
          <ArrowLeft className="h-3.5 w-3.5 icon-fx" /> Back to dashboard
        </Link>

        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3 flex items-center justify-center gap-1.5">
            <Sparkles className="h-3 w-3 icon-fx" /> Premium
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-gradient leading-[1.05]">
            One price. Everything unlocked.
          </h1>
        </div>

        {/* Interval toggle */}
        <div className="mx-auto mb-6 inline-flex w-full justify-center">
          <div
            role="tablist"
            aria-label="Billing interval"
            className="relative glass-strong rounded-full p-1 flex items-center text-xs"
          >
            {/* Sliding indicator */}
            <span
              aria-hidden
              className="absolute top-1 bottom-1 left-1 rounded-full bg-foreground shadow-[0_2px_12px_-2px_rgba(0,0,0,0.4)] transition-[transform,width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                width: interval === "month" ? "84px" : "118px",
                transform:
                  interval === "month" ? "translateX(0)" : "translateX(84px)",
              }}
            />
            <button
              role="tab"
              aria-selected={interval === "month"}
              onClick={() => setInterval("month")}
              className={`relative z-10 w-[84px] h-8 rounded-full font-medium transition-colors duration-300 ${
                interval === "month" ? "text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              role="tab"
              aria-selected={interval === "year"}
              onClick={() => setInterval("year")}
              className={`relative z-10 w-[118px] h-8 rounded-full font-medium transition-colors duration-300 flex items-center justify-center gap-1.5 ${
                interval === "year" ? "text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <span
                className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full transition-colors duration-300 ${
                  interval === "year"
                    ? "bg-background/15 text-background"
                    : "bg-primary/20 text-accent"
                }`}
              >
                –17%
              </span>
            </button>
          </div>
        </div>


        <div className="relative rounded-3xl p-8 bg-gradient-to-b from-elevated to-surface border border-border overflow-hidden">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />

          <div className="relative">
            <div className="flex items-baseline gap-1">
              <span className="text-6xl font-semibold tracking-tight text-gradient-brand">
                {displayPrice}
              </span>
              <span className="text-muted-foreground">{cadence}</span>
            </div>
            {annualSavings && (
              <div className="mt-1 text-xs text-muted-foreground">
                ~$10.75/month — 2 months free
              </div>
            )}

            <ul className="mt-6 space-y-3">
              {PERKS.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm">
                  <div className="h-5 w-5 mt-0.5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-accent icon-fx" />
                  </div>
                  <span>{p}</span>
                </li>
              ))}
            </ul>

            {isPremium ? (
              <div className="mt-7 space-y-2">
                <div className="h-12 rounded-xl glass-strong text-sm font-medium flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-accent mr-1.5 icon-fx" /> You're on Premium
                </div>
                {isCanceling && subscription?.current_period_end && (
                  <p className="text-xs text-muted-foreground text-center">
                    Access until{" "}
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                )}
                {isPastDue && (
                  <p className="text-xs text-amber-400 text-center">
                    Your last payment failed — please update your card to keep access.
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="mt-7 w-full h-12 rounded-xl bg-foreground text-background text-sm font-medium magnetic glow-primary disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Opening checkout…
                  </>
                ) : (
                  `Upgrade for ${displayPrice}${cadence}`
                )}
              </button>
            )}
          </div>
        </div>

        {/* Credit packs — no subscription required */}
        <div className="mt-10 rounded-3xl border border-border bg-surface/60 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Just need credits?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Buy a one-time top-up — no subscription. 50 credits for $0.99.
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-semibold tabular-nums text-gradient-brand">
                {packs * 50}
              </div>
              <div className="text-xs text-muted-foreground">credits</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Packs of 50</span>
              <span className="tabular-nums text-foreground">
                {packs} × $0.99 = ${(packs * 0.99).toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={40}
              step={1}
              value={packs}
              onChange={(e) => setPacks(parseInt(e.target.value, 10))}
              style={{ ["--zq-range-progress" as string]: `${((packs - 1) / 39) * 100}%` }}
              className="w-full"
              aria-label="Number of 50-credit packs"
            />
            <div className="mt-3 flex gap-1.5 flex-wrap">
              {[1, 5, 10, 20].map((p) => (
                <button
                  key={p}
                  onClick={() => setPacks(p)}
                  className={`text-[11px] rounded-full px-3 py-1.5 border transition ${
                    packs === p
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  }`}
                >
                  {p * 50} cr
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleBuyCredits}
            disabled={loading}
            className="mt-6 w-full h-12 rounded-xl bg-foreground text-background text-sm font-medium magnetic disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Opening checkout…
              </>
            ) : (
              `Buy ${packs * 50} credits — $${(packs * 0.99).toFixed(2)}`
            )}
          </button>
          <p className="mt-2 text-[11px] text-muted-foreground text-center">
            Credits never expire and stack on top of your daily allowance.
          </p>
        </div>
      </div>

    </div>
  );
}
