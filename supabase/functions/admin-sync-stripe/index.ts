const ALLOWED_ORIGINS = [
  "https://aetherwealth.co",
  "https://www.aetherwealth.co",
];

const ALLOWED_ORIGIN_HOST_SUFFIXES = ["aetherwealth.co", ".lovable.app", ".lovableproject.com"];

function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return ALLOWED_ORIGIN_HOST_SUFFIXES.some(
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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type SyncResult = {
  env: StripeEnv;
  customerId: string;
  subscriptionsSynced: number;
};

async function upsertSubscription(subscription: any, env: StripeEnv, userId: string) {
  const item = subscription.items?.data?.[0];
  const priceId =
    item?.price?.lookup_key ||
    item?.price?.metadata?.lovable_external_id ||
    item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
  if (error) throw error;
}

async function findCustomerIds(
  stripe: ReturnType<typeof createStripeClient>,
  opts: { userId: string; email: string | null },
): Promise<string[]> {
  const ids = new Set<string>();

  if (/^[a-zA-Z0-9_-]+$/.test(opts.userId)) {
    try {
      const subs = await stripe.subscriptions.search({
        query: `metadata['userId']:'${opts.userId}'`,
        limit: 100,
      });
      for (const s of subs.data) {
        const c = typeof s.customer === "string" ? s.customer : s.customer?.id;
        if (c) ids.add(c);
      }
    } catch (e) {
      console.warn("subscriptions.search failed", e);
    }
    try {
      const customers = await stripe.customers.search({
        query: `metadata['userId']:'${opts.userId}'`,
        limit: 100,
      });
      for (const c of customers.data) ids.add(c.id);
    } catch (e) {
      console.warn("customers.search failed", e);
    }
  }

  if (ids.size === 0 && opts.email) {
    try {
      const list = await stripe.customers.list({ email: opts.email, limit: 100 });
      for (const c of list.data) ids.add(c.id);
    } catch (e) {
      console.warn("customers.list by email failed", e);
    }
  }

  return [...ids];
}

async function syncEnv(
  env: StripeEnv,
  userId: string,
  email: string | null,
): Promise<SyncResult[]> {
  let stripe: ReturnType<typeof createStripeClient>;
  try {
    stripe = createStripeClient(env);
  } catch (e) {
    console.warn(`Stripe ${env} not configured:`, e);
    return [];
  }

  const customerIds = await findCustomerIds(stripe, { userId, email });
  const out: SyncResult[] = [];

  for (const customerId of customerIds) {
    const list = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });
    for (const sub of list.data) {
      await upsertSubscription(sub, env, userId);
    }
    out.push({ env, customerId, subscriptionsSynced: list.data.length });
  }

  return out;
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Auth: must be a logged-in admin
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(authHeader);
    const callerId = userData.user?.id;
    if (userErr || !callerId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const rawEmail =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
    const rawUserId =
      typeof body.userId === "string" && /^[0-9a-f-]{36}$/i.test(body.userId)
        ? body.userId
        : null;

    if (!rawEmail && !rawUserId) {
      return new Response(JSON.stringify({ error: "email or userId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve target user
    let targetUserId: string | null = rawUserId;
    let targetEmail: string | null = rawEmail;

    if (!targetUserId && targetEmail) {
      // Look up user by email via auth admin API (paginate up to 1000)
      let page = 1;
      const perPage = 200;
      while (page <= 5 && !targetUserId) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) break;
        const found = data.users.find((u) => (u.email ?? "").toLowerCase() === targetEmail);
        if (found) {
          targetUserId = found.id;
          targetEmail = found.email ?? targetEmail;
          break;
        }
        if (data.users.length < perPage) break;
        page += 1;
      }
    } else if (targetUserId && !targetEmail) {
      const { data } = await supabase.auth.admin.getUserById(targetUserId);
      targetEmail = data?.user?.email ?? null;
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: "No matching user account found for that email" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const liveResults = await syncEnv("live", targetUserId, targetEmail);
    const sandboxResults = await syncEnv("sandbox", targetUserId, targetEmail);

    const totalSubs = [...liveResults, ...sandboxResults].reduce(
      (s, r) => s + r.subscriptionsSynced,
      0,
    );

    return new Response(
      JSON.stringify({
        ok: true,
        userId: targetUserId,
        email: targetEmail,
        results: { live: liveResults, sandbox: sandboxResults },
        totalSubscriptionsSynced: totalSubs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("admin-sync-stripe error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unable to sync" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
