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

/**
 * Resolves the authenticated user id from the inbound request.
 * Returns null if there is no valid bearer token.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const req = getRequest();
  const auth = req?.headers?.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  try {
    const { data, error } = await getVerifier().auth.getClaims(token);
    if (error || !data?.claims?.sub) return null;
    return data.claims.sub as string;
  } catch {
    return null;
  }
}

/** Like getCurrentUserId but throws 401 when unauthenticated. */
export async function requireUserId(): Promise<string> {
  const id = await getCurrentUserId();
  if (!id) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return id;
}
