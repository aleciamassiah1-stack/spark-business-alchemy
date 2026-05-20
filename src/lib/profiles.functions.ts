import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId } from "@/integrations/supabase/auth-helper";

export type ProfileSummary = {
  id: string;
  display_name: string;
  relationship: string | null;
  initials: string | null;
  color: string | null;
  is_self: boolean;
  role: "owner" | "member";
};

/** Lists every profile the current auth user can access (self + managed + member). */
export const listMyProfiles = createServerFn({ method: "GET" }).handler(async () => {
  const uid = await requireUserId();

  const { data: accessRows, error: accessErr } = await supabaseAdmin
    .from("profile_access")
    .select("profile_id, role")
    .eq("auth_user_id", uid);
  if (accessErr) throw new Error(accessErr.message);

  const ids = Array.from(new Set((accessRows ?? []).map((r) => r.profile_id)));
  if (ids.length === 0) return { profiles: [] as ProfileSummary[] };

  const roleById = new Map(
    (accessRows ?? []).map((r) => [r.profile_id, (r.role as "owner" | "member") ?? "member"]),
  );

  const { data: profiles, error: profErr } = await supabaseAdmin
    .from("managed_profiles")
    .select("id, display_name, relationship, initials, color, is_self")
    .in("id", ids);
  if (profErr) throw new Error(profErr.message);

  // Sort: self first, then alpha
  const out = (profiles ?? [])
    .map(
      (p): ProfileSummary => ({
        id: p.id,
        display_name: p.display_name,
        relationship: p.relationship,
        initials: p.initials,
        color: p.color,
        is_self: !!p.is_self,
        role: roleById.get(p.id) ?? "member",
      }),
    )
    .sort((a, b) => {
      if (a.is_self !== b.is_self) return a.is_self ? -1 : 1;
      return a.display_name.localeCompare(b.display_name);
    });

  return { profiles: out };
});

const createSchema = z.object({
  display_name: z.string().min(1).max(80),
  relationship: z.string().max(80).optional(),
  initials: z.string().max(4).optional(),
  color: z.string().max(20).optional(),
});

export const createManagedProfile = createServerFn({ method: "POST" })
  .inputValidator((input) => createSchema.parse(input))
  .handler(async ({ data }) => {
    const uid = await requireUserId();
    const initials =
      data.initials ?? data.display_name.slice(0, 2).toUpperCase();

    const { data: created, error } = await supabaseAdmin
      .from("managed_profiles")
      .insert({
        owner_user_id: uid,
        display_name: data.display_name,
        relationship: data.relationship ?? null,
        initials,
        color: data.color ?? null,
        is_self: false,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("profile_access")
      .insert({ profile_id: created.id, auth_user_id: uid, role: "owner" });

    return { id: created.id };
  });

/** Delete a managed (non-self) profile owned by the current user. */
export const deleteManagedProfile = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const uid = await requireUserId();
    const { data: prof } = await supabaseAdmin
      .from("managed_profiles")
      .select("id, owner_user_id, is_self")
      .eq("id", data.id)
      .maybeSingle();
    if (!prof) throw new Error("Profile not found");
    if (prof.owner_user_id !== uid) throw new Error("Not authorized");
    if (prof.is_self) throw new Error("You cannot delete your own profile");

    await supabaseAdmin.from("profile_access").delete().eq("profile_id", data.id);
    const { error } = await supabaseAdmin
      .from("managed_profiles")
      .delete()
      .eq("id", data.id)
      .eq("owner_user_id", uid);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export type ProfileMember = {
  auth_user_id: string;
  email: string;
  name: string;
  role: "owner" | "member";
  is_self: boolean;
};

/** List auth users with access to a profile owned by the caller. */
export const listProfileMembers = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ profile_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const uid = await requireUserId();
    const { data: prof } = await supabaseAdmin
      .from("managed_profiles")
      .select("id, owner_user_id")
      .eq("id", data.profile_id)
      .maybeSingle();
    if (!prof) throw new Error("Profile not found");
    if (prof.owner_user_id !== uid) throw new Error("Not authorized");

    const { data: rows } = await supabaseAdmin
      .from("profile_access")
      .select("auth_user_id, role")
      .eq("profile_id", data.profile_id);

    const members: ProfileMember[] = [];
    for (const r of rows ?? []) {
      let email = "";
      let name = "";
      try {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.auth_user_id);
        const meta = (u?.user?.user_metadata ?? {}) as Record<string, unknown>;
        email = u?.user?.email ?? "";
        name = (meta.full_name as string) || (meta.name as string) || email || "Member";
      } catch {}
      members.push({
        auth_user_id: r.auth_user_id,
        email,
        name,
        role: (r.role as "owner" | "member") ?? "member",
        is_self: r.auth_user_id === uid,
      });
    }
    return { members };
  });

/**
 * Grant a login (by email) member access to a profile the caller owns.
 * If no account exists for that email, returns { status: 'invited' } so
 * the caller can send an invitation email instead of erroring.
 */
export const grantProfileAccessByEmail = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        profile_id: z.string().uuid(),
        email: z.string().trim().toLowerCase().email().max(255),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const uid = await requireUserId();
    const { data: prof } = await supabaseAdmin
      .from("managed_profiles")
      .select("id, owner_user_id, display_name")
      .eq("id", data.profile_id)
      .maybeSingle();
    if (!prof) throw new Error("Profile not found");
    if (prof.owner_user_id !== uid) throw new Error("Not authorized");

    // Resolve inviter display name (for the email)
    let inviterName = "A family member";
    try {
      const { data: inviter } = await supabaseAdmin.auth.admin.getUserById(uid);
      const meta = (inviter?.user?.user_metadata ?? {}) as Record<string, unknown>;
      inviterName =
        (meta.full_name as string) ||
        (meta.name as string) ||
        inviter?.user?.email ||
        inviterName;
    } catch {}

    // Look up the invitee
    let foundId: string | null = null;
    try {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const match = list?.users?.find((u) => u.email?.toLowerCase() === data.email);
      foundId = match?.id ?? null;
    } catch {}

    if (!foundId) {
      // No account yet — caller will send an invitation email.
      return {
        status: "invited" as const,
        email: data.email,
        inviterName,
        profileName: prof.display_name,
      };
    }

    const { error } = await supabaseAdmin
      .from("profile_access")
      .insert({ profile_id: data.profile_id, auth_user_id: foundId, role: "member" });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return {
      status: "granted" as const,
      email: data.email,
      inviterName,
      profileName: prof.display_name,
    };
  });

/** Revoke a member's access (cannot revoke the owner). */
export const revokeProfileAccess = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ profile_id: z.string().uuid(), auth_user_id: z.string().uuid() })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const uid = await requireUserId();
    const { data: prof } = await supabaseAdmin
      .from("managed_profiles")
      .select("id, owner_user_id")
      .eq("id", data.profile_id)
      .maybeSingle();
    if (!prof) throw new Error("Profile not found");
    if (prof.owner_user_id !== uid) throw new Error("Not authorized");
    if (data.auth_user_id === prof.owner_user_id)
      throw new Error("Cannot revoke the owner's access");

    const { error } = await supabaseAdmin
      .from("profile_access")
      .delete()
      .eq("profile_id", data.profile_id)
      .eq("auth_user_id", data.auth_user_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
