// RevenueCat → Supabase webhook.
//
// RevenueCat fires this on every IAP lifecycle event (INITIAL_PURCHASE,
// RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE, PRODUCT_CHANGE,
// SUBSCRIPTION_PAUSED, UNCANCELLATION, etc.). We translate the event into
// an upsert on the existing `public.subscriptions` table so the same
// `has_active_subscription` SQL function gates access for both Stripe and
// Apple subscribers.
//
// Auth: RevenueCat sends a static value in the `Authorization` header that
// we configure on their dashboard. We compare it constant-time against the
// `REVENUECAT_WEBHOOK_AUTH` secret. There is no HMAC signature scheme in
// RevenueCat's webhook protocol — the shared bearer is the contract.
//
// IMPORTANT: lives under /api/public/* so the published-site auth proxy
// does not block the request. Security comes from the bearer check below.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// New columns from the migration aren't in the generated types yet, so we
// cast inserts/updates through this helper instead of fighting the types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SubscriptionRow = any;

type RcEvent = {
  type: string;
  app_user_id: string;
  original_app_user_id?: string;
  product_id: string;
  period_type?: string;
  purchased_at_ms?: number;
  expiration_at_ms?: number | null;
  environment: "SANDBOX" | "PRODUCTION";
  original_transaction_id?: string;
  transaction_id?: string;
  cancel_reason?: string | null;
  new_product_id?: string;
  store?: string;
};

type RcWebhookBody = {
  event: RcEvent;
  api_version?: string;
};

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Map RevenueCat env name → our `subscriptions.environment` column.
 * App Store sandbox events should land in our 'sandbox' environment so
 * preview/test installs don't grant access to the live published site.
 */
function mapEnvironment(rc: "SANDBOX" | "PRODUCTION"): "sandbox" | "live" {
  return rc === "PRODUCTION" ? "live" : "sandbox";
}

/**
 * Decide the subscription status to record from a RevenueCat event type.
 * We err on the side of "still active until expiration" so users don't
 * lose access mid-cycle when they cancel auto-renew.
 */
function statusFromEvent(eventType: string, expirationMs?: number | null): string {
  switch (eventType) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE":
    case "TEMPORARY_ENTITLEMENT_GRANT":
      return "active";
    case "CANCELLATION":
      // User turned off auto-renew but still has access until expiration.
      // `has_active_subscription` honors this via current_period_end.
      return "canceled";
    case "EXPIRATION":
      return "canceled";
    case "BILLING_ISSUE":
      return "past_due";
    case "SUBSCRIPTION_PAUSED":
      return "paused";
    default:
      // For unknown events, fall back based on whether the entitlement is still in the future.
      if (expirationMs && expirationMs > Date.now()) return "active";
      return "canceled";
  }
}

async function handleEvent(event: RcEvent): Promise<void> {
  const userId = event.app_user_id;
  if (!userId) {
    console.error("[revenuecat] event missing app_user_id", event.type);
    return;
  }
  // Only react to App Store events (we keep Stripe rows untouched).
  if (event.store && event.store.toLowerCase() !== "app_store") {
    return;
  }

  const env = mapEnvironment(event.environment);
  const status = statusFromEvent(event.type, event.expiration_at_ms);
  const productId =
    event.type === "PRODUCT_CHANGE" && event.new_product_id
      ? event.new_product_id
      : event.product_id;

  const periodEnd = event.expiration_at_ms
    ? new Date(event.expiration_at_ms).toISOString()
    : null;
  const periodStart = event.purchased_at_ms
    ? new Date(event.purchased_at_ms).toISOString()
    : null;

  const originalTxnId = event.original_transaction_id ?? event.transaction_id ?? null;
  if (!originalTxnId) {
    console.error("[revenuecat] event missing transaction id", event.type);
    return;
  }

  // We key Apple rows on (user_id, apple_original_transaction_id).
  // The partial unique index from the migration makes this safe.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subs = supabaseAdmin.from("subscriptions") as any;
  const { data: existing } = await subs
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "apple")
    .eq("apple_original_transaction_id", originalTxnId)
    .maybeSingle();

  const row: SubscriptionRow = {
    user_id: userId,
    provider: "apple",
    apple_original_transaction_id: originalTxnId,
    revenuecat_app_user_id: userId,
    product_id: productId,
    price_id: productId,
    status,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: event.type === "CANCELLATION",
    environment: env,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await subs.update(row).eq("id", (existing as { id: string }).id);
    if (error) throw error;
  } else {
    const { error } = await subs.insert(row);
    if (error) throw error;
  }
}

export const Route = createFileRoute("/api/public/webhooks/revenuecat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
        if (!expected) {
          console.error("[revenuecat] REVENUECAT_WEBHOOK_AUTH not configured");
          return new Response("Server not configured", { status: 500 });
        }
        const provided = request.headers.get("authorization") ?? "";
        if (!timingSafeEqualStr(provided, expected)) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: RcWebhookBody;
        try {
          body = (await request.json()) as RcWebhookBody;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        if (!body?.event?.type || !body?.event?.app_user_id) {
          return new Response("Invalid payload", { status: 400 });
        }

        try {
          await handleEvent(body.event);
          return Response.json({ received: true });
        } catch (err) {
          console.error("[revenuecat] handler error", err);
          // Return 500 so RevenueCat retries with backoff.
          return new Response("Webhook handler failed", { status: 500 });
        }
      },
    },
  },
});
