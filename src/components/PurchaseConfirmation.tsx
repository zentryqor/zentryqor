import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";

type Purchase = {
  id: string;
  credits: number;
  amount_cents: number | null;
  currency: string | null;
  created_at: string;
};

/**
 * Post-purchase confirmation for one-time credit packs.
 * Shows credits received, amount charged, and the next billing date when the
 * user also has an active subscription.
 */
export function PurchaseConfirmation() {
  const { user } = useAuth();
  const { subscription, isPremium } = useSubscription(user?.id);
  const [open, setOpen] = useState(false);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("credits") !== "success") return;
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    let tries = 0;

    const poll = async () => {
      tries++;
      const { data } = await supabase
        .from("credit_purchases")
        .select("id, credits, amount_cents, currency, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      // Only treat it as this checkout if it landed in the last 15 minutes.
      const fresh =
        data && Date.now() - new Date(data.created_at).getTime() < 15 * 60_000;

      if (fresh) {
        setPurchase(data as Purchase);
        setPending(false);
        return;
      }
      if (tries >= 10) {
        setPending(false);
        return;
      }
      setTimeout(poll, 2000);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [open, user?.id]);

  function close() {
    setOpen(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("credits");
      window.history.replaceState({}, "", url.toString());
    }
  }

  if (!open) return null;

  const amount =
    purchase?.amount_cents != null
      ? `${(purchase.amount_cents / 100).toFixed(2)} ${purchase.currency ?? "USD"}`
      : null;
  const nextBilling =
    isPremium && subscription?.current_period_end
      ? new Date(subscription.current_period_end).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-3xl border border-border bg-gradient-to-b from-elevated to-surface p-7 text-center">
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
          {pending ? (
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          ) : (
            <CheckCircle2 className="h-6 w-6 text-accent" />
          )}
        </div>

        <h2 className="text-xl font-semibold tracking-tight">
          {pending ? "Confirming your purchase…" : "Purchase confirmed"}
        </h2>

        {pending ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Payment received — we're crediting your account now.
          </p>
        ) : purchase ? (
          <>
            <div className="mt-5 space-y-2.5 text-left text-sm">
              <Row
                label="Credits added"
                value={
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />+
                    {purchase.credits}
                  </span>
                }
              />
              {amount && <Row label="Amount charged" value={amount} />}
              <Row
                label="Purchased"
                value={new Date(purchase.created_at).toLocaleString()}
              />
              <Row
                label="Next billing date"
                value={nextBilling ?? "None — one-time purchase"}
              />
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground">
              Credits never expire and stack on top of your daily allowance.
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Your payment went through. Credits can take a moment to appear —
            refresh this page shortly.
          </p>
        )}

        <button
          onClick={close}
          className="mt-6 w-full h-11 rounded-xl bg-foreground text-background text-sm font-medium"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-3.5 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}
