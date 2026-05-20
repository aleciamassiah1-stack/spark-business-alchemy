// Server-only helper to resolve the "active" wealth profile id for the
// current request. Reads the `x-active-profile-id` header (set client-side
// by auth-fetch) and validates the caller has access via the
// `profile_access` table. Falls back to the auth user id (each user has
// a self-profile with profile_id == auth.user.id).
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "./client.server.helpers";

export async function resolveActiveProfileId(userId: string): Promise<string> {
  try {
    const req = getRequest();
    const headerId = req?.headers?.get("x-active-profile-id")?.trim();
    if (!headerId || headerId === userId) return userId;

    // Validate access via profile_access (owner or member).
    const { data } = await supabaseAdmin
      .from("profile_access")
      .select("profile_id")
      .eq("auth_user_id", userId)
      .eq("profile_id", headerId)
      .maybeSingle();
    if (data?.profile_id) return data.profile_id;
  } catch {
    // fall through
  }
  return userId;
}
