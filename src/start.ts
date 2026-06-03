import { createStart, createMiddleware } from "@tanstack/react-start";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Attach baseline security headers to every server response (SSR pages,
// server functions, and server routes). Uses CSP frame-ancestors instead of
// X-Frame-Options so Lovable's embedded preview can load the app safely.
const securityHeaders = createMiddleware().server(async ({ next }) => {
  const result = await next();
  const res = (result as { response?: Response }).response;
  if (res && res.headers) {
    res.headers.set(
      "Content-Security-Policy",
      "frame-ancestors 'self' https://lovable.dev https://*.lovable.dev https://*.lovable.app https://*.lovableproject.com https://gptengineer.app",
    );
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
    res.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(self)",
    );
  }
  return result;
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [securityHeaders],
}));
