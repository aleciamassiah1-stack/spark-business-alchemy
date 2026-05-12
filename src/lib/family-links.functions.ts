import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId } from "@/integrations/supabase/auth-helper";

const emailSchema = z.string().trim().toLowerCase().email().max(255);
const dobSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be YYYY-MM-DD");
const ssn4Schema = z.string().regex(/^\d{4}$/, "Last 4 of SSN must be 4 digits");

async function hashSsn4(ssn4: string): Promise<string> {
  const data = new TextEncoder().encode(`aether:ssn4:${ssn4}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

function sortPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Send a new link request. */
export const createFamilyLinkRequest = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      recipient_email: string;
      recipient_dob: string;
      recipient_ssn4: string;
      message?: string;
    }) =>
      z
        .object({
          recipient_email: emailSchema,
          recipient_dob: dobSchema,
          recipient_ssn4: ssn4Schema,
          message: z.string().trim().max(500).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId();

    // Get requester email to prevent self-linking
    const { data: requesterUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (requesterUser?.user?.email && requesterUser.user.email.toLowerCase() === data.recipient_email) {
      throw new Error("You can't send a link request to yourself");
    }

    // Try to resolve recipient user_id by email (admin auth lookup by listing)
    let recipientUserId: string | null = null;
    try {
      // Page through users — small projects only; for scale prefer a profiles table
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const match = list?.users?.find((u) => u.email?.toLowerCase() === data.recipient_email);
      recipientUserId = match?.id ?? null;
    } catch (e) {
      console.error("listUsers error", e);
    }

    // Prevent duplicate active link
    if (recipientUserId) {
      const [a, b] = sortPair(userId, recipientUserId);
      const { data: existingLink } = await supabaseAdmin
        .from("family_links")
        .select("id")
        .eq("user_a", a)
        .eq("user_b", b)
        .maybeSingle();
      if (existingLink) throw new Error("These accounts are already linked");
    }

    // Prevent duplicate pending request
    const { data: existing } = await supabaseAdmin
      .from("family_link_requests")
      .select("id")
      .eq("requester_user_id", userId)
      .ilike("recipient_email", data.recipient_email)
      .in("status", ["pending_recipient", "pending_admin"])
      .maybeSingle();
    if (existing) throw new Error("You already have a pending request to this person");

    const ssn4Hash = await hashSsn4(data.recipient_ssn4);
    const { data: row, error } = await supabaseAdmin
      .from("family_link_requests")
      .insert({
        requester_user_id: userId,
        recipient_email: data.recipient_email,
        recipient_dob: data.recipient_dob,
        recipient_last_four_ssn_hash: ssn4Hash,
        recipient_user_id: recipientUserId,
        message: data.message ?? null,
        status: "pending_recipient",
      } as any)
      .select()
      .single();
    if (error || !row) {
      console.error("createFamilyLinkRequest error", error);
      throw new Error("Could not send request");
    }
    return { request: row, recipient_has_account: !!recipientUserId };
  });

/** List my outgoing + incoming requests. */
export const listMyFamilyLinkRequests = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  // get email for recipient match
  const { data: me } = await supabaseAdmin.auth.admin.getUserById(userId);
  const myEmail = me?.user?.email?.toLowerCase() ?? null;

  // Outgoing
  const { data: outgoing } = await supabaseAdmin
    .from("family_link_requests")
    .select("*")
    .eq("requester_user_id", userId)
    .order("created_at", { ascending: false });

  // Incoming (by user_id OR by email if not yet matched)
  let incomingQuery = supabaseAdmin
    .from("family_link_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (myEmail) {
    incomingQuery = incomingQuery.or(`recipient_user_id.eq.${userId},recipient_email.ilike.${myEmail}`);
  } else {
    incomingQuery = incomingQuery.eq("recipient_user_id", userId);
  }
  const { data: incoming } = await incomingQuery;

  // Enrich requester names for incoming
  const requesterIds = Array.from(new Set((incoming ?? []).map((r) => r.requester_user_id)));
  const requesterNames: Record<string, { name: string; email: string }> = {};
  for (const id of requesterIds) {
    try {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      const meta = (data?.user?.user_metadata ?? {}) as Record<string, unknown>;
      const fullName = (meta.full_name as string) || (meta.name as string) || data?.user?.email || "Unknown";
      requesterNames[id] = { name: fullName, email: data?.user?.email ?? "" };
    } catch {}
  }

  return {
    outgoing: outgoing ?? [],
    incoming: (incoming ?? []).filter((r) => r.requester_user_id !== userId),
    requesterNames,
  };
});

/** Recipient accepts/declines. On accept, DOB is verified and request moves to pending_admin. */
export const respondFamilyLinkRequest = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; action: "accept" | "decline" }) =>
    z.object({ id: z.string().uuid(), action: z.enum(["accept", "decline"]) }).parse(input),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { data: me } = await supabaseAdmin.auth.admin.getUserById(userId);
    const myEmail = me?.user?.email?.toLowerCase() ?? null;

    const { data: req } = await supabaseAdmin
      .from("family_link_requests")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!req) throw new Error("Request not found");
    const isRecipient =
      req.recipient_user_id === userId ||
      (myEmail && req.recipient_email.toLowerCase() === myEmail);
    if (!isRecipient) throw new Error("Not authorized");
    if (req.status !== "pending_recipient") throw new Error("Request is no longer pending");

    if (data.action === "decline") {
      await supabaseAdmin
        .from("family_link_requests")
        .update({
          status: "declined_recipient",
          recipient_responded_at: new Date().toISOString(),
          recipient_user_id: userId,
        })
        .eq("id", data.id);
      return { ok: true as const };
    }

    // Accept: verify DOB and SSN last 4 hash both match user_intake
    const { data: intake } = await supabaseAdmin
      .from("user_intake")
      .select("date_of_birth, last_four_ssn_hash")
      .eq("user_id", userId)
      .maybeSingle();
    const dobOnFile = (intake as any)?.date_of_birth as string | null;
    const ssnHashOnFile = (intake as any)?.last_four_ssn_hash as string | null;
    if (!dobOnFile || !ssnHashOnFile) {
      throw new Error(
        "Add your date of birth and last 4 of SSN in your profile before accepting link requests",
      );
    }
    const requestSsnHash = (req as any).recipient_last_four_ssn_hash as string | null;
    const dobMatches = dobOnFile === req.recipient_dob;
    const ssnMatches = !!requestSsnHash && requestSsnHash === ssnHashOnFile;
    if (!dobMatches || !ssnMatches) {
      await supabaseAdmin
        .from("family_link_requests")
        .update({
          status: "declined_recipient",
          dob_match: false,
          recipient_responded_at: new Date().toISOString(),
          recipient_user_id: userId,
        })
        .eq("id", data.id);
      throw new Error(
        !dobMatches
          ? "Date of birth doesn't match the one on file"
          : "Last 4 of SSN doesn't match the one on file",
      );
    }

    await supabaseAdmin
      .from("family_link_requests")
      .update({
        status: "pending_admin",
        dob_match: true,
        recipient_responded_at: new Date().toISOString(),
        recipient_user_id: userId,
      })
      .eq("id", data.id);
    return { ok: true as const };
  });

/** Requester cancels their own pending request. */
export const cancelFamilyLinkRequest = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { error } = await supabaseAdmin
      .from("family_link_requests")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("requester_user_id", userId)
      .in("status", ["pending_recipient", "pending_admin"]);
    if (error) throw new Error("Could not cancel");
    return { ok: true as const };
  });

/** Admin lists all requests awaiting review. */
export const adminListFamilyLinkRequests = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  if (!(await isAdmin(userId))) throw new Error("Admin only");
  const { data: rows } = await supabaseAdmin
    .from("family_link_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const ids = Array.from(
    new Set((rows ?? []).flatMap((r) => [r.requester_user_id, r.recipient_user_id].filter(Boolean) as string[])),
  );
  const users: Record<string, { email: string; name: string }> = {};
  for (const id of ids) {
    try {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      const meta = (data?.user?.user_metadata ?? {}) as Record<string, unknown>;
      users[id] = {
        email: data?.user?.email ?? "",
        name: (meta.full_name as string) || (meta.name as string) || data?.user?.email || "",
      };
    } catch {}
  }
  return { requests: rows ?? [], users };
});

/** Admin approves or declines. On approval, family_links row is created. */
export const adminReviewFamilyLinkRequest = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; action: "approve" | "decline"; notes?: string }) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["approve", "decline"]),
        notes: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    if (!(await isAdmin(userId))) throw new Error("Admin only");

    const { data: req } = await supabaseAdmin
      .from("family_link_requests")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!req) throw new Error("Request not found");
    if (req.status !== "pending_admin") throw new Error("Not awaiting admin review");

    if (data.action === "decline") {
      await supabaseAdmin
        .from("family_link_requests")
        .update({
          status: "declined_admin",
          admin_notes: data.notes ?? null,
          admin_reviewed_by: userId,
          admin_reviewed_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      return { ok: true as const };
    }

    if (!req.recipient_user_id) throw new Error("Recipient has no account");
    const [a, b] = sortPair(req.requester_user_id, req.recipient_user_id);
    const { error: linkErr } = await supabaseAdmin
      .from("family_links")
      .insert({ user_a: a, user_b: b, request_id: req.id });
    if (linkErr && !linkErr.message.includes("duplicate")) {
      console.error("create family_link error", linkErr);
      throw new Error("Could not create link");
    }
    await supabaseAdmin
      .from("family_link_requests")
      .update({
        status: "approved",
        admin_notes: data.notes ?? null,
        admin_reviewed_by: userId,
        admin_reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    return { ok: true as const };
  });

/** Returns approved linked partners with their net worth + account balances. */
export const listLinkedPartnersWealth = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  const { data: links } = await supabaseAdmin
    .from("family_links")
    .select("*")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);

  const partners = (links ?? []).map((l) => (l.user_a === userId ? l.user_b : l.user_a));
  const result: Array<{
    user_id: string;
    name: string;
    email: string;
    net_worth: number;
    accounts: Array<{ name: string; balance: number; type: string | null }>;
  }> = [];

  for (const pid of partners) {
    let name = "Linked partner";
    let email = "";
    try {
      const { data } = await supabaseAdmin.auth.admin.getUserById(pid);
      const meta = (data?.user?.user_metadata ?? {}) as Record<string, unknown>;
      name = (meta.full_name as string) || (meta.name as string) || data?.user?.email || name;
      email = data?.user?.email ?? "";
    } catch {}

    const { data: accts } = await supabaseAdmin
      .from("aggregated_accounts")
      .select("name, current_balance, type, subtype")
      .eq("user_id", pid);
    const { data: liabs } = await supabaseAdmin
      .from("aggregated_liabilities")
      .select("account_id, details")
      .eq("user_id", pid);

    const accounts = (accts ?? []).map((a) => ({
      name: a.name,
      balance: Number(a.current_balance ?? 0),
      type: a.type ?? null,
    }));
    const assets = accounts
      .filter((a) => a.type !== "loan" && a.type !== "credit")
      .reduce((s, a) => s + a.balance, 0);
    const debts = (liabs ?? []).reduce((s, l: any) => {
      const bal = Number(l?.details?.last_statement_balance ?? l?.details?.balance ?? 0);
      return s + bal;
    }, 0);
    const negFromAccts = accounts
      .filter((a) => a.type === "loan" || a.type === "credit")
      .reduce((s, a) => s + a.balance, 0);
    const net_worth = assets - debts - negFromAccts;

    result.push({ user_id: pid, name, email, net_worth, accounts });
  }
  return { partners: result };
});

/** Admin or user removes an approved link. */
export const removeFamilyLink = createServerFn({ method: "POST" })
  .inputValidator((input: { partner_user_id: string }) =>
    z.object({ partner_user_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const [a, b] = sortPair(userId, data.partner_user_id);
    const { error } = await supabaseAdmin
      .from("family_links")
      .delete()
      .eq("user_a", a)
      .eq("user_b", b);
    if (error) throw new Error("Could not remove link");
    return { ok: true as const };
  });

/** Get current user's DOB on file. */
export const getMyDateOfBirth = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  const { data } = await supabaseAdmin
    .from("user_intake")
    .select("date_of_birth")
    .eq("user_id", userId)
    .maybeSingle();
  return { date_of_birth: ((data as any)?.date_of_birth as string | null) ?? null };
});

/** Set current user's DOB on file. */
export const setMyDateOfBirth = createServerFn({ method: "POST" })
  .inputValidator((input: { date_of_birth: string }) =>
    z.object({ date_of_birth: dobSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { data: existing } = await supabaseAdmin
      .from("user_intake")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      const { error } = await supabaseAdmin
        .from("user_intake")
        .update({ date_of_birth: data.date_of_birth } as any)
        .eq("user_id", userId);
      if (error) throw new Error("Could not save date of birth");
    } else {
      const { error } = await supabaseAdmin
        .from("user_intake")
        .insert({ user_id: userId, plan: "essential_monthly", date_of_birth: data.date_of_birth } as any);
      if (error) throw new Error("Could not save date of birth");
    }
    return { ok: true as const };
  });
