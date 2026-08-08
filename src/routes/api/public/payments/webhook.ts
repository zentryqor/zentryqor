import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { verifyWebhook, EventName, type PaddleEnv } from "@/lib/paddle.server";

let _supabase: ReturnType<typeof createClient<Database>> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData } = data;

  const userId = customData?.userId;
  if (!userId) {
    console.error("[paddle] subscription.created missing customData.userId");
    return;
  }

  const item = items?.[0];
  const priceId = item?.price?.importMeta?.externalId;
  const productId = item?.product?.importMeta?.externalId;
  if (!priceId || !productId) {
    console.warn("[paddle] subscription skipped: missing importMeta.externalId", {
      rawPriceId: item?.price?.id,
      rawProductId: item?.product?.id,
    });
    return;
  }

  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      paddle_subscription_id: id,
      paddle_customer_id: customerId,
      product_id: productId,
      price_id: priceId,
      status,
      current_period_start: currentBillingPeriod?.startsAt,
      current_period_end: currentBillingPeriod?.endsAt,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "paddle_subscription_id" },
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { id, status, currentBillingPeriod, scheduledChange } = data;

  await getSupabase()
    .from("subscriptions")
    .update({
      status,
      current_period_start: currentBillingPeriod?.startsAt,
      current_period_end: currentBillingPeriod?.endsAt,
      cancel_at_period_end: scheduledChange?.action === "cancel",
      updated_at: new Date().toISOString(),
    })
    .eq("paddle_subscription_id", id)
    .eq("environment", env);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq("paddle_subscription_id", data.id)
    .eq("environment", env);
}

// One-time AI credit pack purchases: 50 credits per unit.
const CREDIT_PACK_PRICES: Record<string, number> = { credit_pack_50: 50 };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  const userId = data?.customData?.userId;
  if (!userId) return;

  let credits = 0;
  for (const item of data?.items ?? []) {
    const externalId = item?.price?.importMeta?.externalId as string | undefined;
    const perUnit = externalId ? CREDIT_PACK_PRICES[externalId] : undefined;
    if (perUnit) credits += perUnit * (item?.quantity ?? 1);
  }
  if (credits <= 0) return;

  const supabase = getSupabase();

  // Idempotency: unique paddle_transaction_id means a replayed webhook is a no-op.
  const { error: insertError } = await supabase.from("credit_purchases").insert({
    user_id: userId,
    paddle_transaction_id: data.id,
    credits,
    amount_cents: data?.details?.totals?.total ? Number(data.details.totals.total) : null,
    currency: data?.currencyCode ?? null,
    environment: env,
  });
  if (insertError) {
    console.log("[paddle] credit purchase already recorded or failed:", insertError.message);
    return;
  }

  const { error } = await supabase.rpc("grant_bonus_credits", {
    _user_id: userId,
    _amount: credits,
  });
  if (error) console.error("[paddle] grant_bonus_credits failed:", error.message);
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.eventType) {
    case EventName.SubscriptionCreated:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await handleSubscriptionCreated(event.data as any, env);
      break;
    case EventName.SubscriptionUpdated:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await handleSubscriptionUpdated(event.data as any, env);
      break;
    case EventName.SubscriptionCanceled:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await handleSubscriptionCanceled(event.data as any, env);
      break;
    case EventName.TransactionCompleted:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await handleTransactionCompleted(event.data as any, env);
      break;
    default:
      console.log("[paddle] unhandled event:", event.eventType);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = (url.searchParams.get("env") || "sandbox") as PaddleEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("[paddle] webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
