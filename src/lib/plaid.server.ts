// Server-only Plaid REST helper. Do NOT import from client code.
// Uses fetch directly (no node SDK) to stay Worker-runtime compatible.
import { getRequestHost } from "@tanstack/react-start/server";

function getPlaidEnvironment(): "sandbox" | "production" {
  // Env var ALWAYS wins so users can force sandbox in any environment.
  const configured = sanitize(process.env.PLAID_ENV)?.toLowerCase();
  if (configured === "sandbox") return "sandbox";
  if (configured === "production") return "production";

  let host = "";
  try {
    host = (getRequestHost() ?? "").toLowerCase();
  } catch {
    // No active request context — fall through to default.
  }
  // Only the live custom/published production domain should hit Plaid production.
  // Everything else (localhost, preview, lovable.app/lovableproject.com) → sandbox.
  const isProductionHost =
    host === "aetherwealth.co" ||
    host === "www.aetherwealth.co" ||
    host === "spark-business-alchemy.lovable.app";

  console.log(`[plaid] host=${host} production=${isProductionHost}`);
  return isProductionHost ? "production" : "sandbox";
}

function getPlaidBase() {
  return `https://${getPlaidEnvironment()}.plaid.com`;
}

function sanitize(v: string | undefined): string {
  if (!v) return "";
  // Strip ALL whitespace (spaces, tabs, newlines), zero-width chars, BOM,
  // and surrounding straight/smart quotes. Secrets pasted from password
  // managers or docs often carry these and Plaid rejects with
  // "client_id must be a properly formatted, non-empty string".
  return v
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\ufeff]/g, "")
    .replace(/\s+/g, "")
    .replace(/^['"\u2018\u2019\u201c\u201d]+|['"\u2018\u2019\u201c\u201d]+$/g, "");
}

function getCreds() {
  const env = getPlaidEnvironment();
  const client_id = sanitize(process.env.PLAID_CLIENT_ID);
  const secret = sanitize(process.env.PLAID_SECRET);
  // Always log a safe diagnostic so we can see what's actually present at runtime.
  console.log(
    `[plaid] env=${env} client_id_len=${client_id.length} client_id_prefix=${client_id.slice(0, 4)} secret_len=${secret.length}`,
  );
  if (!client_id || !secret) {
    throw new Error(
      `Plaid credentials missing or empty at runtime ` +
        `(PLAID_CLIENT_ID len=${client_id.length}, PLAID_SECRET len=${secret.length}, PLAID_ENV=${env})`,
    );
  }
  // Plaid client_ids are 24-char hex-like strings. Catch obvious mistakes early.
  if (client_id.length !== 24) {
    throw new Error(
      `PLAID_CLIENT_ID has unexpected length ${client_id.length} (expected 24). ` +
        `Re-paste it from the Plaid dashboard — make sure you copied the Client ID, not the secret.`,
    );
  }
  return { client_id, secret, env };
}

async function plaidPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { client_id, secret } = getCreds();
  const res = await fetch(`${getPlaidBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id, secret, ...body }),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const code = (json.error_code as string) ?? "unknown";
    const msg = (json.error_message as string) ?? `Plaid request failed (${res.status})`;
    throw new Error(`Plaid ${code}: ${msg}`);
  }
  return json as T;
}

export type PlaidLinkTokenResp = { link_token: string; expiration: string };
export type PlaidExchangeResp = { access_token: string; item_id: string };

export async function createLinkToken(userId: string): Promise<PlaidLinkTokenResp> {
  return plaidPost<PlaidLinkTokenResp>("/link/token/create", {
    user: { client_user_id: userId },
    client_name: "Æther Wealth",
    products: ["auth", "transactions", "investments"],
    country_codes: ["US"],
    language: "en",
  });
}

export async function exchangePublicToken(public_token: string): Promise<PlaidExchangeResp> {
  return plaidPost<PlaidExchangeResp>("/item/public_token/exchange", { public_token });
}

export type PlaidAccount = {
  account_id: string;
  name: string;
  official_name: string | null;
  mask: string | null;
  type: string;
  subtype: string | null;
  balances: {
    current: number | null;
    available: number | null;
    iso_currency_code: string | null;
  };
};

export type PlaidItemMeta = {
  institution_id: string | null;
};

export async function getAccounts(access_token: string): Promise<{
  accounts: PlaidAccount[];
  item: PlaidItemMeta;
}> {
  return plaidPost("/accounts/get", { access_token });
}

export type PlaidSecurity = {
  security_id: string;
  ticker_symbol: string | null;
  name: string | null;
  type: string | null;
};

export type PlaidHolding = {
  account_id: string;
  security_id: string;
  quantity: number;
  institution_price: number;
  institution_value: number;
  cost_basis: number | null;
  iso_currency_code: string | null;
};

export async function getHoldings(access_token: string): Promise<{
  holdings: PlaidHolding[];
  securities: PlaidSecurity[];
  accounts: PlaidAccount[];
}> {
  return plaidPost("/investments/holdings/get", { access_token });
}

export async function getInstitution(institution_id: string): Promise<{
  institution: { institution_id: string; name: string };
}> {
  return plaidPost("/institutions/get_by_id", {
    institution_id,
    country_codes: ["US"],
  });
}

export type PlaidTransaction = {
  transaction_id: string;
  account_id: string;
  amount: number;
  iso_currency_code: string | null;
  date: string;
  name: string;
  merchant_name: string | null;
  payment_channel: string | null;
  pending: boolean;
  logo_url: string | null;
  personal_finance_category: { primary: string; detailed: string } | null;
};

export async function syncTransactions(
  access_token: string,
  cursor?: string,
): Promise<{
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: { transaction_id: string }[];
  next_cursor: string;
  has_more: boolean;
}> {
  return plaidPost("/transactions/sync", {
    access_token,
    cursor: cursor ?? "",
    count: 250,
  });
}
