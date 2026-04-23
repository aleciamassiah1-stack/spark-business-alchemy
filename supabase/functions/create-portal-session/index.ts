const ALLOWED_ORIGINS = [
  "https://aetherwealth.co",
  "https://www.aetherwealth.co",
];

// Hosts that are allowed as a returnUrl target after the billing portal closes.
const ALLOWED_RETURN_HOST_SUFFIXES = [
  "aetherwealth.co",
  ".lovable.app",
];

function buildCorsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
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
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers
      .get("authorization")
      ?.replace("Bearer ", "");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { returnUrl, environment } = await req.json();
    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .eq("environment", env)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: "No subscription found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate returnUrl against allowlist; fall back to verified origin or default.
    const origin = req.headers.get("origin");
    const validatedReturn =
      isAllowedReturnUrl(returnUrl) ||
      (origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);

    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: validatedReturn,
    });

    return new Response(JSON.stringify({ url: portal.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-portal-session error", error);
    return new Response(JSON.stringify({ error: "Unable to open billing portal. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
