const ALLOWED_ORIGINS = [
  "https://aetherwealth.co",
  "https://www.aetherwealth.co",
];

// Hosts that are allowed as a returnUrl target (post-checkout redirect).
// We accept the production domains and Lovable preview/published subdomains.
const ALLOWED_RETURN_HOST_SUFFIXES = [
  "aetherwealth.co",
  ".lovable.app",
  ".lovableproject.com",
];

function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return ALLOWED_RETURN_HOST_SUFFIXES.some(
      (suf) => host === suf.replace(/^\./, "") || host.endsWith(suf),
    );
  } catch {
    return false;
  }
}

function buildCorsHeaders(origin: string | null) {
  const allow = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

function isAllowedReturnUrl(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  const ok = ALLOWED_RETURN_HOST_SUFFIXES.some(
    (suf) => host === suf.replace(/^\./, "") || host.endsWith(suf),
  );
  return ok ? url.toString() : null;
}

import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string | null; userId: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");

  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  if (found.data.length) return found.data[0].id;

  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }

  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    metadata: { userId: options.userId },
  });
  return created.id;
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === AUTH: derive userId from the Bearer token, NEVER trust the body ===
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
    let authedUserId: string | null = null;
    let authedEmail: string | null = null;
    if (authHeader) {
      const { data: userData, error: userErr } = await supabase.auth.getUser(authHeader);
      if (!userErr && userData.user) {
        authedUserId = userData.user.id;
        authedEmail = userData.user.email ?? null;
      }
    }
    if (!authedUserId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { priceId, quantity, returnUrl, environment } = await req.json();
    if (!priceId || typeof priceId !== "string" || !/^[a-zA-Z0-9_-]+$/.test(priceId)) {
      return new Response(JSON.stringify({ error: "Invalid priceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    let prices;
    try {
      prices = await stripe.prices.list({ lookup_keys: [priceId], active: true, limit: 1 });
    } catch (e) {
      console.error("stripe.prices.list failed", { env, priceId, error: String(e) });
      return new Response(
        JSON.stringify({ error: `Unable to load price '${priceId}' in ${env} mode. ${String(e?.message ?? e)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!prices?.data?.length) {
      console.error("Price not found", { env, priceId, response: prices });
      return new Response(
        JSON.stringify({ error: `Price '${priceId}' not found in ${env} mode. Make sure the price was created in ${env} Stripe.` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";
    const customerId = await resolveOrCreateCustomer(stripe, {
      email: authedEmail,
      userId: authedUserId,
    });

    // === REDIRECT: validate returnUrl against allowlist; otherwise build from origin ===
    const origin = req.headers.get("origin");
    const validatedReturn =
      isAllowedReturnUrl(returnUrl) ||
      (isAllowedOrigin(origin)
        ? `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`
        : `${ALLOWED_ORIGINS[0]}/checkout/return?session_id={CHECKOUT_SESSION_ID}`);

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: quantity || 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded",
      return_url: validatedReturn,
      customer: customerId,
      metadata: { userId: authedUserId, priceId, productId: String(stripePrice.product) },
      ...(isRecurring && {
        subscription_data: {
          metadata: { userId: authedUserId, priceId, productId: String(stripePrice.product) },
        },
      }),
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-checkout error", error);
    return new Response(JSON.stringify({ error: "Unable to start checkout. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
