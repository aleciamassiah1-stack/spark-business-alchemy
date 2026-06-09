import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyPlaidWebhook } from "@/lib/plaid-webhook-verify.server";

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
        // Read raw body for signature verification (must be exact bytes Plaid signed)
        const rawBody = await request.text();

        const verificationHeader = request.headers.get("Plaid-Verification");
        const verified = await verifyPlaidWebhook(verificationHeader, rawBody);
        if (!verified) {
          console.warn("[plaid-webhook] rejected: invalid or missing Plaid-Verification");
          return new Response("unauthorized", { status: 401 });
        }

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(rawBody) as Record<string, unknown>;
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

        // LOGIN_REPAIRED — user completed update mode, item is healthy again.
        // Clear the requires_update flag so the UI prompts dismiss automatically.
        if (webhook_type === "ITEM" && webhook_code === "LOGIN_REPAIRED") {
          const { error } = await supabaseAdmin
            .from("plaid_items")
            .update({ status: "active" })
            .eq("item_id", item_id);
          if (error) {
            console.error("[plaid-webhook] clear requires_update failed:", error.message);
            return new Response("db error", { status: 500 });
          }
        }

        // NEW_ACCOUNTS_AVAILABLE — bank exposed accounts not yet linked.
        // Flag the item so the UI can prompt the user to enter update mode
        // with account_selection_enabled=true to add them.
        if (webhook_type === "ITEM" && webhook_code === "NEW_ACCOUNTS_AVAILABLE") {
          const { error } = await supabaseAdmin
            .from("plaid_items")
            .update({ new_accounts_available: true })
            .eq("item_id", item_id);
          if (error) {
            console.error("[plaid-webhook] mark new_accounts_available failed:", error.message);
            return new Response("db error", { status: 500 });
          }
        }

        return new Response("ok");
      },
    },
  },
});
