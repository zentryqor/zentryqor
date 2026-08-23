import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAppwriteAuth } from "@/integrations/appwrite/auth-middleware";

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

/** Current subscription row for the signed-in user, for the given environment. */
export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireAppwriteAuth])
  .inputValidator((d) =>
    z.object({ environment: z.enum(["sandbox", "live"]) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<SubscriptionRow | null> => {
    const { data: row } = await context.supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (row as SubscriptionRow | null) ?? null;
  });
