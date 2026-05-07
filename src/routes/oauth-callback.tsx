import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { plaidExchangeToken } from "@/lib/plaid.functions";

export const Route = createFileRoute("/oauth-callback")({
  head: () => ({
    meta: [
      { title: "Connecting your bank — Æther Wealth" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OAuthCallbackPage,
});

const PLAID_LINK_SRC = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
const LINK_TOKEN_KEY = "aether.plaid.oauth.link_token";

function loadPlaidScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    // @ts-expect-error global injected by Plaid
    if (window.Plaid) return resolve();
    const existing = document.querySelector(`script[src="${PLAID_LINK_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Plaid Link failed to load")));
      return;
    }
    const s = document.createElement("script");
    s.src = PLAID_LINK_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Plaid Link failed to load"));
    document.head.appendChild(s);
  });
}

function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState("Finishing secure bank connection…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = new URL(window.location.href);
        const oauthStateId = url.searchParams.get("oauth_state_id");
        if (!oauthStateId) {
          throw new Error("Missing oauth_state_id — open this page only via your bank's redirect.");
        }
        const linkToken = sessionStorage.getItem(LINK_TOKEN_KEY);
        if (!linkToken) {
          throw new Error("OAuth session expired. Please restart the bank connection.");
        }

        await loadPlaidScript();
        // @ts-expect-error global injected by Plaid
        if (!window.Plaid) throw new Error("Plaid Link unavailable");

        // @ts-expect-error global injected by Plaid
        const handler = window.Plaid.create({
          token: linkToken,
          receivedRedirectUri: window.location.href,
          onSuccess: async (
            public_token: string,
            metadata: { institution?: { institution_id: string; name: string } | null },
          ) => {
            const res = await plaidExchangeToken({
              data: {
                public_token,
                institution_id: metadata.institution?.institution_id,
                institution_name: metadata.institution?.name,
              },
            });
            sessionStorage.removeItem(LINK_TOKEN_KEY);
            if (!cancelled) {
              navigate({
                to: "/connections",
                search: res.ok ? { linked: "1" } : { linked: "0" },
              } as never);
            }
          },
          onExit: (err: unknown) => {
            sessionStorage.removeItem(LINK_TOKEN_KEY);
            if (!cancelled) {
              if (err) {
                setStatus("error");
                setMessage(
                  err instanceof Error
                    ? err.message
                    : "Bank connection was cancelled. You can try again from Connections.",
                );
              } else {
                navigate({ to: "/connections" } as never);
              }
            }
          },
        });
        handler.open();
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Failed to complete bank connection.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">
          {status === "loading" ? "Connecting your bank" : "Connection didn't complete"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
        {status === "error" && (
          <a
            href="/connections"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to Connections
          </a>
        )}
      </div>
    </div>
  );
}
