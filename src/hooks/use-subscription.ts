import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";

export type SubscriptionRow = {
  id: string;
  status: string;
  current_period_end: string | null;
  current_period_start: string | null;
  cancel_at_period_end: boolean | null;
  price_id: string;
  product_id: string;
  paddle_subscription_id: string;
  paddle_customer_id: string;
  environment: string;
};

export function useSubscription(userId: string | null | undefined) {
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const env = getPaddleEnvironment();

    const fetchSub = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setSubscription((data as SubscriptionRow | null) ?? null);
      setLoading(false);
    };

    fetchSub();

    const channel = supabase.channel(`sub-${userId}-${Math.random().toString(36).slice(2)}`);
    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchSub(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const now = Date.now();
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).getTime()
    : null;

  const isPremium =
    !!subscription &&
    (((["active", "trialing", "past_due"].includes(subscription.status)) &&
      (!periodEnd || periodEnd > now)) ||
      (subscription.status === "canceled" && periodEnd !== null && periodEnd > now));

  const isPastDue = subscription?.status === "past_due";
  const isCanceling = !!subscription?.cancel_at_period_end && subscription.status !== "canceled";

  return { subscription, isPremium, isPastDue, isCanceling, loading };
}
