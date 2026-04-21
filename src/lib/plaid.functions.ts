import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  createLinkToken,
  exchangePublicToken,
  getAccounts,
  getHoldings,
  getInstitution,
  syncTransactions,
} from "./plaid.server";

// 1. Create a Plaid Link token (called from the client to open Plaid Link)
export const plaidCreateLinkToken = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const { link_token, expiration } = await createLinkToken();
    return { link_token, expiration, error: null as string | null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create link token";
    console.error("plaidCreateLinkToken error:", message);
    return { link_token: null, expiration: null, error: message };
  }
});

// 2. Exchange a public_token for access_token, persist the item, and pull initial data
export const plaidExchangeToken = createServerFn({ method: "POST" })
  .inputValidator((input: { public_token: string; institution_id?: string; institution_name?: string }) =>
    z
      .object({
        public_token: z.string().min(10).max(500),
        institution_id: z.string().max(100).optional(),
        institution_name: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const { access_token, item_id } = await exchangePublicToken(data.public_token);

      // Insert the item (or refresh access_token if same item_id)
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("plaid_items")
        .upsert(
          {
            item_id,
            access_token,
            institution_id: data.institution_id ?? null,
            institution_name: data.institution_name ?? null,
            status: "active",
          },
          { onConflict: "item_id" },
        )
        .select("id")
        .single();

      if (insertErr || !inserted) {
        throw new Error(`Failed to persist item: ${insertErr?.message ?? "no row returned"}`);
      }

      // Immediately sync this new item
      const sync = await syncItemInternal(inserted.id, access_token);

      return { ok: true as const, itemId: inserted.id, ...sync, error: null as string | null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to exchange token";
      console.error("plaidExchangeToken error:", message);
      return {
        ok: false as const,
        itemId: null,
        accountsUpdated: 0,
        holdingsUpdated: 0,
        error: message,
      };
    }
  });

// 3. Manual refresh — sync ALL connected items (or a single one if itemId provided)
export const plaidSyncAll = createServerFn({ method: "POST" })
  .inputValidator((input: { itemId?: string } | undefined) =>
    z.object({ itemId: z.string().uuid().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    try {
      let query = supabaseAdmin.from("plaid_items").select("id, access_token, institution_name");
      if (data.itemId) query = query.eq("id", data.itemId);
      const { data: items, error } = await query;
      if (error) throw new Error(error.message);
      if (!items || items.length === 0) {
        return { ok: true as const, results: [], error: null as string | null };
      }

      const results = [];
      for (const item of items) {
        const r = await syncItemInternal(item.id, item.access_token);
        results.push({ itemId: item.id, institution: item.institution_name, ...r });
      }
      return { ok: true as const, results, error: null as string | null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      console.error("plaidSyncAll error:", message);
      return { ok: false as const, results: [], error: message };
    }
  });

// 4. Disconnect an item
export const plaidDisconnectItem = createServerFn({ method: "POST" })
  .inputValidator((input: { itemId: string }) =>
    z.object({ itemId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("plaid_items").delete().eq("id", data.itemId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, error: null as string | null };
  });

// 5. Read aggregated data for the UI
export const getAggregatedData = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const [itemsRes, accountsRes, holdingsRes, syncRes, txRes] = await Promise.all([
      supabaseAdmin
        .from("plaid_items")
        .select("id, institution_name, institution_id, status, last_synced_at, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("aggregated_accounts")
        .select("*")
        .order("current_balance", { ascending: false, nullsFirst: false }),
      supabaseAdmin
        .from("aggregated_holdings")
        .select("*")
        .order("institution_value", { ascending: false, nullsFirst: false }),
      supabaseAdmin
        .from("sync_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("aggregated_transactions")
        .select("*")
        .order("date", { ascending: false })
        .limit(50),
    ]);

    return {
      items: itemsRes.data ?? [],
      accounts: accountsRes.data ?? [],
      holdings: holdingsRes.data ?? [],
      syncLog: syncRes.data ?? [],
      transactions: txRes.data ?? [],
      error: itemsRes.error?.message ?? accountsRes.error?.message ?? null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load data";
    return {
      items: [],
      accounts: [],
      holdings: [],
      syncLog: [],
      transactions: [],
      error: message,
    };
  }
});

// --- internal helper: sync a single item ---
async function syncItemInternal(itemRowId: string, access_token: string) {
  const startedAt = Date.now();
  try {
    // Pull accounts
    const acctRes = await getAccounts(access_token);

    // Resolve institution name if we have an id and we don't already have it stored
    if (acctRes.item.institution_id) {
      try {
        const inst = await getInstitution(acctRes.item.institution_id);
        await supabaseAdmin
          .from("plaid_items")
          .update({
            institution_id: inst.institution.institution_id,
            institution_name: inst.institution.name,
          })
          .eq("id", itemRowId);
      } catch {
        // institution lookup is best-effort
      }
    }

    // Upsert accounts
    const accountRows = acctRes.accounts.map((a) => ({
      item_id: itemRowId,
      plaid_account_id: a.account_id,
      name: a.name,
      official_name: a.official_name,
      mask: a.mask,
      type: a.type,
      subtype: a.subtype,
      current_balance: a.balances.current,
      available_balance: a.balances.available,
      iso_currency_code: a.balances.iso_currency_code ?? "USD",
      last_synced_at: new Date().toISOString(),
    }));

    if (accountRows.length > 0) {
      const { error } = await supabaseAdmin
        .from("aggregated_accounts")
        .upsert(accountRows, { onConflict: "plaid_account_id" });
      if (error) throw new Error(`accounts upsert: ${error.message}`);
    }

    // Map plaid_account_id -> our row id for holdings FK
    const { data: accountRowsBack, error: accBackErr } = await supabaseAdmin
      .from("aggregated_accounts")
      .select("id, plaid_account_id")
      .eq("item_id", itemRowId);
    if (accBackErr) throw new Error(`accounts read-back: ${accBackErr.message}`);

    const acctIdMap = new Map<string, string>();
    (accountRowsBack ?? []).forEach((r) => acctIdMap.set(r.plaid_account_id, r.id));

    // Pull holdings (best-effort — sandbox investments accounts only)
    let holdingsCount = 0;
    try {
      const holdRes = await getHoldings(access_token);
      const secMap = new Map(holdRes.securities.map((s) => [s.security_id, s]));

      const holdingRows = holdRes.holdings
        .map((h) => {
          const ourAcctId = acctIdMap.get(h.account_id);
          if (!ourAcctId) return null;
          const sec = secMap.get(h.security_id);
          return {
            account_id: ourAcctId,
            security_id: h.security_id,
            ticker: sec?.ticker_symbol ?? null,
            name: sec?.name ?? null,
            type: sec?.type ?? null,
            quantity: h.quantity,
            institution_price: h.institution_price,
            institution_value: h.institution_value,
            cost_basis: h.cost_basis,
            iso_currency_code: h.iso_currency_code ?? "USD",
            last_synced_at: new Date().toISOString(),
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      // Replace holdings for these accounts (clean slate per sync)
      const accountIds = Array.from(acctIdMap.values());
      if (accountIds.length > 0) {
        await supabaseAdmin.from("aggregated_holdings").delete().in("account_id", accountIds);
      }
      if (holdingRows.length > 0) {
        const { error } = await supabaseAdmin.from("aggregated_holdings").insert(holdingRows);
        if (error) throw new Error(`holdings insert: ${error.message}`);
      }
      holdingsCount = holdingRows.length;
    } catch (holdErr) {
      // Holdings unsupported for this institution — not fatal
      console.warn("holdings skipped:", holdErr instanceof Error ? holdErr.message : holdErr);
    }

    await supabaseAdmin
      .from("plaid_items")
      .update({ last_synced_at: new Date().toISOString(), status: "active" })
      .eq("id", itemRowId);

    await supabaseAdmin.from("sync_log").insert({
      item_id: itemRowId,
      status: "success",
      accounts_updated: accountRows.length,
      holdings_updated: holdingsCount,
      duration_ms: Date.now() - startedAt,
    });

    return { accountsUpdated: accountRows.length, holdingsUpdated: holdingsCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync error";
    await supabaseAdmin.from("sync_log").insert({
      item_id: itemRowId,
      status: "error",
      error_message: message,
      duration_ms: Date.now() - startedAt,
    });
    await supabaseAdmin.from("plaid_items").update({ status: "error" }).eq("id", itemRowId);
    throw err;
  }
}
