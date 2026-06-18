import { createFileRoute } from "@tanstack/react-router";

const BODY = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /checkout/
Disallow: /intake
Disallow: /launch
Disallow: /more
Disallow: /notifications
Disallow: /oauth-callback
Disallow: /reset-password
Disallow: /verify-email

Sitemap: https://aetherwealth.co/sitemap.xml
`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(BODY, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});
