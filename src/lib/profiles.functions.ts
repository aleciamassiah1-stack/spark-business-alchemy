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
