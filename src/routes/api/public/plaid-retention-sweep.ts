import { createFileRoute } from "@tanstack/react-router";
import { runPlaidRetentionSweep } from "@/lib/plaid.functions";

// Cron endpoint that enforces our Plaid data-retention policy:
//   - calls /item/remove on stale or abandoned Plaid Items
//   - purges aged transactions and sync logs
//   - deactivates Items for users whose 30-day account-deletion grace expired
//
// Protected by a shared secret in the `x-cron-secret` header. Configure pg_cron
// (or any external scheduler) to POST here daily.
export const Route = createFileRoute("/api/public/plaid-retention-sweep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        const provided = request.headers.get("x-cron-secret");
        if (!secret || !provided || provided !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const summary = await runPlaidRetentionSweep();
          return new Response(JSON.stringify({ ok: true, summary }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Sweep failed";
          console.error("plaid-retention-sweep error:", message);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
