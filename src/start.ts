import { createStart, createMiddleware } from "@tanstack/react-start";

// Attach baseline security headers to every server response (SSR pages,
// server functions, and server routes). Mitigates clickjacking, MIME
// sniffing, mixed-content downgrades, and limits referrer leakage.
const securityHeaders = createMiddleware().server(async ({ next }) => {
  const result = await next();
  const res = (result as { response?: Response }).response;
  if (res && res.headers) {
    res.headers.set("X-Frame-Options", "DENY");
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
  requestMiddleware: [securityHeaders],
}));
