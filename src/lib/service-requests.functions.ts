import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId, getCurrentUserId } from "@/integrations/supabase/auth-helper";

const REQUEST_TYPES = ["meeting", "report", "concierge", "wealth_manager", "other"] as const;
type RequestType = (typeof REQUEST_TYPES)[number];

const submitSchema = z.object({
  type: z.enum(REQUEST_TYPES),
  subject: z.string().min(1).max(200),
  body: z.record(z.string(), z.any()).optional(),
  profileId: z.string().uuid().optional(),
  pageUrl: z.string().url().optional(),
});

async function requireAdminId(): Promise<string> {
  const uid = await requireUserId();
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
  return uid;
}

export const submitServiceRequest = createServerFn({ method: "POST" })
  .inputValidator((input) => submitSchema.parse(input))
  .handler(async ({ data }) => {
    const uid = await requireUserId();

    // Pull user email/name to return to the client so it can include them in the email payload.
    const { data: userResp } = await supabaseAdmin.auth.admin.getUserById(uid);
    const email = userResp?.user?.email ?? null;
    const fullName =
      (userResp?.user?.user_metadata as Record<string, unknown> | undefined)?.full_name as
        | string
        | undefined ?? null;

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("service_requests")
      .insert({
        user_id: uid,
        profile_id: data.profileId ?? null,
        type: data.type,
        subject: data.subject,
        body: data.body ?? {},
        status: "new",
      })
      .select("id, created_at")
      .single();
    if (insertErr) throw new Error(insertErr.message);

    return {
      id: inserted.id,
      createdAt: inserted.created_at,
      memberEmail: email,
      memberName: fullName ?? email,
    };
  });

export const listServiceRequests = createServerFn({ method: "GET" })
  .inputValidator((input: { status?: "new" | "in_progress" | "resolved" | "all" } | undefined) =>
    input ?? {},
  )
  .handler(async ({ data }) => {
    await requireAdminId();
    let q = supabaseAdmin
      .from("service_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.status && data.status !== "all") {
      q = q.eq("status", data.status);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    const emailById = new Map<string, string | null>();
    for (const uid of userIds) {
      try {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
        emailById.set(uid, u?.user?.email ?? null);
      } catch {
        emailById.set(uid, null);
      }
    }
    return {
      requests: (rows ?? []).map((r) => ({
        ...r,
        user_email: emailById.get(r.user_id) ?? null,
      })),
    };
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "in_progress", "resolved"]).optional(),
  admin_notes: z.string().max(4000).optional(),
});

export const updateServiceRequest = createServerFn({ method: "POST" })
  .inputValidator((input) => updateSchema.parse(input))
  .handler(async ({ data }) => {
    const adminId = await requireAdminId();
    const patch: {
      status?: "new" | "in_progress" | "resolved";
      assigned_admin?: string;
      resolved_at?: string;
      admin_notes?: string;
      updated_at: string;
    } = { updated_at: new Date().toISOString() };
    if (data.status) {
      patch.status = data.status;
      patch.assigned_admin = adminId;
      if (data.status === "resolved") patch.resolved_at = new Date().toISOString();
    }
    if (typeof data.admin_notes === "string") patch.admin_notes = data.admin_notes;
    const { error } = await supabaseAdmin.from("service_requests").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getUnreadServiceRequestCount = createServerFn({ method: "GET" }).handler(async () => {
  const uid = await getCurrentUserId();
  if (!uid) return { count: 0 };
  const { data: isAdmin } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .eq("role", "admin")
    .maybeSingle();
  if (!isAdmin) return { count: 0 };
  const { count, error } = await supabaseAdmin
    .from("service_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  if (error) return { count: 0 };
  return { count: count ?? 0 };
});

export type { RequestType };
