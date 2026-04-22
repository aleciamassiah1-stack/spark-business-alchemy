// Server-only helper to resolve the current user from the request's
// Authorization: Bearer <jwt> header. Returns null when unauthenticated
// instead of throwing, so server functions can decide how to respond.
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let _verifier: ReturnType<typeof createClient<Database>> | undefined;

function getVerifier() {
  if (_verifier) return _verifier;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing on server");
  _verifier = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  return _verifier;
}

type ResolvedUser = {
  userId: string;
  emailConfirmed: boolean;
};

async function resolveUser(): Promise<ResolvedUser | null> {
  const req = getRequest();
  const auth = req?.headers?.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  try {
    const client = getVerifier();
    // Use getUser so we can read email_confirmed_at — getClaims doesn't include it.
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user?.id) return null;
    return {
      userId: data.user.id,
      emailConfirmed: !!data.user.email_confirmed_at,
    };
  } catch {
    return null;
  }
}

/** Returns true if the user is scheduled for soft-delete (within grace period). */
async function isPendingDeletion(userId: string): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("./client.server");
    const { data } = await supabaseAdmin
      .from("pending_account_deletions")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

/**
 * Resolves the authenticated user id from the inbound request.
 * Returns null if there is no valid bearer token, the user's email
 * is not confirmed, OR the account is scheduled for deletion.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const u = await resolveUser();
  if (!u || !u.emailConfirmed) return null;
  if (await isPendingDeletion(u.userId)) return null;
  return u.userId;
}

/** Like getCurrentUserId but throws 401 when unauthenticated, and 403 when email is unconfirmed. */
export async function requireUserId(): Promise<string> {
  const u = await resolveUser();
  if (!u) {
    throw new Response("Unauthorized", { status: 401 });
  }
  if (!u.emailConfirmed) {
    throw new Response("Email not confirmed", { status: 403 });
  }
  return u.userId;
}
