// Server-only Plaid REST helper. Do NOT import from client code.
// Uses fetch directly (no node SDK) to stay Worker-runtime compatible.

const PLAID_ENV: "sandbox" | "production" =
  process.env.PLAID_ENV === "sandbox" ? "sandbox" : "production";
const PLAID_BASE = `https://${PLAID_ENV}.plaid.com`;

function getCreds() {
  // Trim — secrets pasted with stray whitespace/newlines silently break
  // Plaid with "client_id must be a properly formatted, non-empty string".
  const client_id = (process.env.PLAID_CLIENT_ID ?? "").trim();
  const secret = (process.env.PLAID_SECRET ?? "").trim();
  if (!client_id || !secret) {
    throw new Error(
      `Plaid credentials missing or empty at runtime ` +
        `(PLAID_CLIENT_ID len=${client_id.length}, PLAID_SECRET len=${secret.length}, PLAID_ENV=${PLAID_ENV})`,
    );
  }
  return { client_id, secret };
}

async function plaidPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { client_id, secret } = getCreds();
  const res = await fetch(`${PLAID_BASE}${path}`, {
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
