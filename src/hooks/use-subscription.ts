import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMySubscription, type SubscriptionRow } from "@/lib/subscription.functions";
import { getPaddleEnvironment } from "@/lib/paddle";

export type { SubscriptionRow };

export function useSubscription(userId: string | null | undefined) {
  const fetchSub = useServerFn(getMySubscription);
  const environment = getPaddleEnvironment() as "sandbox" | "production";

  const { data, isLoading } = useQuery({
    queryKey: ["subscription", userId, environment],
    enabled: !!userId,
    refetchInterval: 60_000,
    queryFn: () => fetchSub({ data: { environment } }),
  });

  const subscription = data ?? null;

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
  const isCanceling =
    !!subscription?.cancel_at_period_end && subscription.status !== "canceled";

  return {
    subscription,
    isPremium,
    isPastDue,
    isCanceling,
    loading: !!userId && isLoading,
  };
}
