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

const CREDITS_PER_PACK = 50;
const CREDIT_PACK_PRICE_ID = "credits_50";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  const userId = data?.customData?.userId;
  if (!userId) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const packItems = (data?.items ?? []).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (i: any) => i?.price?.importMeta?.externalId === CREDIT_PACK_PRICE_ID,
  );
  if (!packItems.length) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const packs = packItems.reduce((n: number, i: any) => n + (Number(i?.quantity) || 1), 0);
  const credits = packs * CREDITS_PER_PACK;
  const supabase = getSupabase();

  // Idempotency: one grant per transaction.
  const { error: insertError } = await supabase.from("credit_purchases").insert({
    user_id: userId,
    paddle_transaction_id: data.id,
    credits,
    amount_cents: data?.details?.totals?.total ? Number(data.details.totals.total) : null,
    currency: data?.currencyCode ?? null,
    environment: env,
  });

  if (insertError) {
    // Duplicate transaction — already granted.
    if (insertError.code === "23505" || insertError.code === "23514") return;
    if (insertError.message?.includes("duplicate key")) return;
    console.error("[paddle] credit purchase insert failed:", insertError.message);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: grantError } = await (supabase as any).rpc("grant_bonus_credits", {
    _user_id: userId,
    _amount: credits,
  });
  if (grantError) console.error("[paddle] grant_bonus_credits failed:", grantError.message);
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
