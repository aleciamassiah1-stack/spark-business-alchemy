import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getCurrentUserId } from "@/integrations/supabase/auth-helper";
import { getRequest } from "@tanstack/react-start/server";
import { tierFromPriceId, type Tier } from "@/lib/tier";

function getPaymentsEnvironment(): "sandbox" | "live" {
  const env = process.env.STRIPE_ENVIRONMENT;
  if (env === "live" || env === "sandbox") return env;

  const host = getRequest()?.headers.get("host")?.toLowerCase() ?? "";
  const isPreviewHost =
    host.includes("lovableproject.com") ||
    host.startsWith("id-preview--") ||
    host.includes("-dev.lovable.app");

  return isPreviewHost ? "sandbox" : "live";
}

/** Server-side helper: returns the user's resolved tier (or null). */
export async function getCurrentTier(): Promise<Tier | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const env = getPaymentsEnvironment();
  const [{ data: roleRow }, { data: subRow }, { data: manual }] = await Promise.all([
    supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle(),
    supabaseAdmin
      .from("subscriptions")
      .select("price_id, status, current_period_end")
      .eq("user_id", userId)
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("manual_access")
      .select("expires_at")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  const isAdmin = !!roleRow;
  const compActive = manual ? !manual.expires_at || new Date(manual.expires_at) > new Date() : false;
  const tier = tierFromPriceId(subRow?.price_id ?? null);
  if (tier) return tier;
  if (isAdmin || compActive) return "family";
  return null;
}
