import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getCurrentUserId, requireUserId } from "@/integrations/supabase/auth-helper";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

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

/**
 * Authenticated: returns whether the CURRENT (just-signed-in) user is scheduled
 * for soft-deletion. Used by the signin form immediately after a successful
 * password auth to sign the user out if their account is pending purge.
 *
 * Why not accept an email? An unauthenticated email lookup would let anyone
 * probe whether an address is registered + scheduled for deletion (user
 * enumeration). This endpoint instead reads the bearer token from the request
 * and only reveals status for the token's own user.
 *
 * Note: getCurrentUserId() returns null for users in the deletion grace
 * period, so we resolve the user via the verifier directly here (bypassing
 * that gate) to determine whether deletion is scheduled.
 */
export const checkMyPendingDeletion = createServerFn({ method: "GET" }).handler(async () => {
  const req = getRequest();
  const auth = req?.headers?.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return { pending: false } as const;
  }
  const token = auth.slice(7).trim();
  if (!token) return { pending: false } as const;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { pending: false } as const;

  const verifier = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userRes, error: userErr } = await verifier.auth.getUser(token);
  if (userErr || !userRes?.user?.id) return { pending: false } as const;

  const { data } = await supabaseAdmin
    .from("pending_account_deletions")
    .select("user_id, purge_after")
    .eq("user_id", userRes.user.id)
    .maybeSingle();

  if (!data) return { pending: false } as const;
  return { pending: true, purgeAfter: data.purge_after } as const;
});

/** Returns whether the current user has access (admin, paid sub, or comp). */
export const checkAccess = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { authenticated: false, hasAccess: false, isAdmin: false } as const;
  }

  const env = getPaymentsEnvironment();

  const [{ data: roleRow }, { data: hasSubRow }] = await Promise.all([
    supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle(),
    supabaseAdmin.rpc("has_active_subscription", { user_uuid: userId, check_env: env }),
  ]);

  const isAdmin = !!roleRow;
  const hasAccess = isAdmin || hasSubRow === true;

  return { authenticated: true, hasAccess, isAdmin } as const;
});

/** Returns whether the current user has any LIVE Stripe subscription on record. */
export const checkLiveSubscription = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getCurrentUserId();
  if (!userId) return { hasLiveSubscription: false } as const;
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("id, status")
    .eq("user_id", userId)
    .eq("environment", "live")
    .in("status", ["active", "trialing", "past_due"])
    .limit(1)
    .maybeSingle();
  return { hasLiveSubscription: !!data } as const;
});

/** Throws 403 if not admin, otherwise returns the userId. */
async function requireAdmin(): Promise<string> {
  const userId = await requireUserId();
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Response("Forbidden", { status: 403 });
  return userId;
}

// =================================================================
// Admin-only server functions
// =================================================================

export const adminGetMetrics = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const env = getPaymentsEnvironment();

  const [{ data: subs }, { count: totalUsers }, { data: recent }] = await Promise.all([
    supabaseAdmin
      .from("subscriptions")
      .select("status, price_id, current_period_end, created_at, environment, cancel_at_period_end")
      .eq("environment", env),
    supabaseAdmin
      .from("user_roles")
      .select("user_id", { count: "exact", head: true }),
    supabaseAdmin
      .from("subscriptions")
      .select("created_at, status, price_id")
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Pricing map (kept in sync with /pricing copy)
  const PRICE_MONTHLY_USD: Record<string, number> = {
    essential_monthly: 149,
    essential_annual: 1490 / 12,
    private_monthly: 399,
    private_annual: 3990 / 12,
    family_monthly: 1499,
    family_annual: 14990 / 12,
  };

  const active = (subs ?? []).filter(
    (s) =>
      s.status === "active" ||
      s.status === "trialing" ||
      (s.status === "canceled" &&
        s.current_period_end &&
        new Date(s.current_period_end) > new Date()),
  );

  const mrr = active.reduce(
    (sum, s) => sum + (PRICE_MONTHLY_USD[s.price_id ?? ""] ?? 0),
    0,
  );
  const arr = mrr * 12;

  const churnedThisMonth = (subs ?? []).filter((s) => {
    if (s.status !== "canceled") return false;
    if (!s.current_period_end) return false;
    const end = new Date(s.current_period_end);
    const now = new Date();
    return end.getMonth() === now.getMonth() && end.getFullYear() === now.getFullYear();
  }).length;

  const trialing = active.filter((s) => s.status === "trialing").length;

  return {
    mrr: Math.round(mrr),
    arr: Math.round(arr),
    activeSubscribers: active.length,
    trialing,
    churnedThisMonth,
    totalUsers: totalUsers ?? 0,
    recentSubscriptions: recent ?? [],
    environment: env,
  };
});

type MemberRow = {
  user_id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
  is_admin: boolean;
  has_manual_access: boolean;
  pending_deletion_at: string | null;
  pending_purge_after: string | null;
};

export const adminListMembers = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const env = getPaymentsEnvironment();

  // Page through all auth users (admin API caps at 1000/page)
  const allUsers: Array<{ id: string; email: string | null; created_at: string; last_sign_in_at: string | null }> = [];
  let page = 1;
  while (page < 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    for (const u of data.users) {
      allUsers.push({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      });
    }
    if (data.users.length < 200) break;
    page += 1;
  }

  const [{ data: subs }, { data: roles }, { data: comps }, { data: pending }] = await Promise.all([
    supabaseAdmin
      .from("subscriptions")
      .select("user_id, price_id, status, current_period_end")
      .eq("environment", env),
    supabaseAdmin.from("user_roles").select("user_id, role").eq("role", "admin"),
    supabaseAdmin.from("manual_access").select("user_id, expires_at"),
    supabaseAdmin
      .from("pending_account_deletions")
      .select("user_id, scheduled_at, purge_after"),
  ]);

  const subMap = new Map((subs ?? []).map((s) => [s.user_id, s]));
  const adminSet = new Set((roles ?? []).map((r) => r.user_id));
  const compMap = new Map((comps ?? []).map((c) => [c.user_id, c]));
  const pendingMap = new Map((pending ?? []).map((p) => [p.user_id, p]));

  const members: MemberRow[] = allUsers.map((u) => {
    const sub = subMap.get(u.id);
    const comp = compMap.get(u.id);
    const compActive = comp ? !comp.expires_at || new Date(comp.expires_at) > new Date() : false;
    const pend = pendingMap.get(u.id);
    return {
      user_id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      plan: sub?.price_id ?? null,
      status: sub?.status ?? null,
      current_period_end: sub?.current_period_end ?? null,
      is_admin: adminSet.has(u.id),
      has_manual_access: compActive,
      pending_deletion_at: pend?.scheduled_at ?? null,
      pending_purge_after: pend?.purge_after ?? null,
    };
  });

  // Newest first
  members.sort((a, b) => (a.created_at > b.created_at ? -1 : 1));

  return { members };
});

export const adminGrantAccess = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string().uuid(),
      reason: z.string().max(280).optional(),
      expiresAt: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const adminId = await requireAdmin();
    const { error } = await supabaseAdmin.from("manual_access").upsert(
      {
        user_id: data.userId,
        granted_by: adminId,
        reason: data.reason ?? null,
        expires_at: data.expiresAt ?? null,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRevokeAccess = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await supabaseAdmin
      .from("manual_access")
      .delete()
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string().uuid(),
      makeAdmin: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    if (data.makeAdmin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/**
 * Soft-delete an account: schedules purge 30 days from now.
 * The account remains in the database but is marked for deletion.
 * Use cancelAccountDeletion within 30 days to restore.
 */
export const adminScheduleAccountDeletion = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string().uuid(),
      reason: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const adminId = await requireAdmin();

    // Don't allow admins to schedule deletion of themselves
    if (data.userId === adminId) {
      throw new Error("You cannot schedule deletion of your own admin account");
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(
      data.userId,
    );
    if (userErr) throw new Error(userErr.message);

    const purgeAfter = new Date();
    purgeAfter.setDate(purgeAfter.getDate() + 30);

    const { error } = await supabaseAdmin.from("pending_account_deletions").upsert(
      {
        user_id: data.userId,
        email: userData.user?.email ?? null,
        scheduled_at: new Date().toISOString(),
        purge_after: purgeAfter.toISOString(),
        requested_by: adminId,
        reason: data.reason ?? null,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);

    return { ok: true, purgeAfter: purgeAfter.toISOString() };
  });

/** Cancel a pending account deletion (within the 30-day grace period). */
export const adminCancelAccountDeletion = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const adminId = await requireAdmin();
    if (data.userId === adminId) {
      throw new Error("You cannot cancel deletion of your own admin account");
    }
    const { error } = await supabaseAdmin
      .from("pending_account_deletions")
      .delete()
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Hard-delete an account immediately: purges ALL user data and the auth user.
 * No grace period. Cannot be undone. Works whether or not the account was
 * previously soft-deleted. Used for cleanup of test/demo accounts.
 */
export const adminPurgeAccountNow = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const adminId = await requireAdmin();
    if (data.userId === adminId) {
      throw new Error("You cannot purge your own admin account");
    }

    const uid = data.userId;

    // Deactivate all of the user's Plaid Items (/item/remove) BEFORE we drop
    // the rows. This stops further webhooks and Plaid-side billing for items
    // we no longer need. Failures are logged but don't block the purge —
    // orphaned items eventually expire on Plaid's side.
    const { data: plaidRows } = await supabaseAdmin
      .from("plaid_items")
      .select("id, access_token, institution_name")
      .eq("user_id", uid);
    if (plaidRows && plaidRows.length > 0) {
      const { removeItem } = await import("./plaid.server");
      for (const row of plaidRows) {
        const isDemo = (row.institution_name ?? "").includes("(Demo)");
        if (isDemo || !row.access_token) continue;
        try {
          await removeItem(row.access_token);
        } catch (err) {
          console.error(
            `[adminPurgeAccountNow] /item/remove failed for item ${row.id}:`,
            err instanceof Error ? err.message : err,
          );
        }
      }
    }

    // Delete app data (mirrors purge_expired_account_deletions + admin_purge_user_by_email)
    await supabaseAdmin.from("aggregated_transactions").delete().eq("user_id", uid);
    await supabaseAdmin.from("aggregated_holdings").delete().eq("user_id", uid);
    await supabaseAdmin.from("aggregated_accounts").delete().eq("user_id", uid);
    await supabaseAdmin.from("plaid_items").delete().eq("user_id", uid);
    await supabaseAdmin.from("sync_log").delete().eq("user_id", uid);
    await supabaseAdmin.from("transaction_rules").delete().eq("user_id", uid);
    await supabaseAdmin.from("estate_documents").delete().eq("user_id", uid);
    await supabaseAdmin.from("insurance_policies").delete().eq("user_id", uid);
    await supabaseAdmin.from("property_valuations").delete().eq("user_id", uid);
    await supabaseAdmin.from("properties").delete().eq("user_id", uid);
    await supabaseAdmin.from("family_members").delete().eq("user_id", uid);
    await supabaseAdmin.from("user_intake").delete().eq("user_id", uid);
    await supabaseAdmin.from("subscriptions").delete().eq("user_id", uid);
    await supabaseAdmin.from("manual_access").delete().eq("user_id", uid);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    await supabaseAdmin.from("pending_account_deletions").delete().eq("user_id", uid);

    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (authErr) throw new Error(authErr.message);

    return { ok: true };
  });

