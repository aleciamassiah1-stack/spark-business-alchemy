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

    // Fetch user email + name for the email payload
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

    // Notify admin via the transactional email pipeline (best-effort)
    try {
      const url = process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const baseHost = process.env.SITE_URL ?? "https://aetherwealth.co";
      if (url && serviceKey) {
        const bodyText =
          typeof data.body?.message === "string"
            ? (data.body.message as string)
            : JSON.stringify(data.body ?? {}, null, 2);
        await fetch(`${url}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({
            templateName: "service-request-notification",
            idempotencyKey: `svc-${inserted.id}`,
            templateData: {
              requestType: data.type,
              subject: data.subject,
              fromName: fullName ?? email ?? "Member",
              fromEmail: email ?? undefined,
              body: bodyText,
              requestId: inserted.id,
              pageUrl: data.pageUrl,
              adminUrl: `${baseHost}/admin/requests`,
            },
          }),
        }).catch(() => {
          /* email is best-effort; the row is the source of truth */
        });
      }
    } catch {
      /* swallow — DB row is the source of truth */
    }

    return { id: inserted.id, createdAt: inserted.created_at };
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

    // Decorate with member email
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

export const updateServiceRequest = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "in_progress", "resolved"]).optional(),
        admin_notes: z.string().max(4000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const adminId = await requireAdminId();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
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
