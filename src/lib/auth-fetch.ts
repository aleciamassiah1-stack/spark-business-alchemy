// Patches the global fetch on the client so that any request to a TanStack
// Start server function (`/_serverFn/...`) automatically receives the
// current user's Supabase access token as a Bearer Authorization header.
//
// This lets server functions resolve the authenticated user without us having
// to thread `headers` through every single call site.
import { supabase } from "@/integrations/supabase/client";

let installed = false;

export function installAuthFetch() {
  if (installed) return;
  if (typeof window === "undefined") return;
  installed = true;

  const original = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input instanceof Request
              ? input.url
              : "";

      // Only attach to in-app server-fn calls (same-origin path prefix).
      const isServerFn = url.includes("/_serverFn/");
      if (!isServerFn) return original(input, init);

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return original(input, init);

      // Merge the Authorization header into whatever is already present.
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      if (!headers.has("authorization")) {
        headers.set("authorization", `Bearer ${token}`);
      }
      try {
        const activeProfileId = window.localStorage.getItem("aw:active-profile-id");
        if (activeProfileId && !headers.has("x-active-profile-id")) {
          headers.set("x-active-profile-id", activeProfileId);
        }
      } catch {
        // ignore localStorage errors
      }
      return original(input, { ...(init ?? {}), headers });
    } catch {
      // If anything goes wrong looking up the session, fall through to a
      // normal unauthenticated request so the call can still surface a 401
      // from the server (rather than silently failing on the client).
      return original(input, init);
    }
  };
}
