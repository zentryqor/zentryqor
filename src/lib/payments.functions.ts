import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { gatewayFetch, type PaddleEnv } from "@/lib/paddle.server";
import { requireAppwriteAuth } from "@/integrations/appwrite/auth-middleware";

export const resolvePaddlePrice = createServerFn({ method: "GET" })
  .inputValidator((data: { priceId: string; environment: PaddleEnv }) =>
    z
      .object({
        priceId: z.string().min(1).max(120).regex(/^[a-z0-9_]+$/),
        environment: z.enum(["sandbox", "live"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const response = await gatewayFetch(
      data.environment,
      `/prices?external_id=${encodeURIComponent(data.priceId)}`,
    );
    if (!response.ok) {
      throw new Error(`Paddle price lookup failed: ${response.status}`);
    }
    const result = (await response.json()) as { data?: Array<{ id: string }> };
    if (!result.data?.length) throw new Error(`Price not found: ${data.priceId}`);
    return result.data[0].id;
  });

/**
 * Post-checkout receipt: the newest one-time credit pack purchase plus the
 * current subscription's next billing date (when one exists).
 */
export const getLatestPurchase = createServerFn({ method: "GET" })
  .middleware([requireAppwriteAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [purchase, sub] = await Promise.all([
      supabase
        .from("credit_purchases")
        .select("id, credits, amount_cents, currency, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("status, current_period_end, cancel_at_period_end")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const { data: balance } = await supabase
      .from("profiles")
      .select("bonus_credits")
      .eq("id", userId)
      .maybeSingle();

    return {
      purchase: purchase.data ?? null,
      bonusCredits: balance?.bonus_credits ?? 0,
      nextBillingDate:
        sub.data && !sub.data.cancel_at_period_end &&
        ["active", "trialing", "past_due"].includes(sub.data.status)
          ? sub.data.current_period_end
          : null,
    };
  });
