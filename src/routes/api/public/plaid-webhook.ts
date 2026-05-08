import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Plaid Item-level webhooks that signal a re-auth is needed.
// Docs: https://plaid.com/docs/api/items/#item-webhooks
//   - ITEM_LOGIN_REQUIRED   (webhook_code)
//   - PENDING_EXPIRATION    (webhook_code, consent expiring soon)
//   - PENDING_DISCONNECT    (webhook_code, will be disconnected)
// All three should mark the item as needing update mode.
const REAUTH_CODES = new Set(["ITEM_LOGIN_REQUIRED", "PENDING_EXPIRATION", "PENDING_DISCONNECT"]);

export const Route = createFileRoute("/api/public/plaid-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: Record<string, unknown>;
        try {
          payload = (await request.json()) as Record<string, unknown>;
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const webhook_type = String(payload.webhook_type ?? "");
        const webhook_code = String(payload.webhook_code ?? "");
        const item_id = typeof payload.item_id === "string" ? payload.item_id : null;

        console.log(`[plaid-webhook] type=${webhook_type} code=${webhook_code} item=${item_id}`);

        if (!item_id) return new Response("ok");

        if (webhook_type === "ITEM" && REAUTH_CODES.has(webhook_code)) {
          const { error } = await supabaseAdmin
            .from("plaid_items")
            .update({ status: "requires_update" })
            .eq("item_id", item_id);
          if (error) {
            console.error("[plaid-webhook] mark requires_update failed:", error.message);
            return new Response("db error", { status: 500 });
          }
        }

        return new Response("ok");
      },
    },
  },
});
