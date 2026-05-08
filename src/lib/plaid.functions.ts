import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId, getCurrentUserId } from "@/integrations/supabase/auth-helper";
import {
  createLinkToken,
  createUpdateLinkToken,
  exchangePublicToken,
  getAccounts,
  getHoldings,
  getInstitution,
  getLiabilities,
  removeItem,
  syncTransactions,
} from "./plaid.server";

function resolvePlaidEnvironment(): "sandbox" | "production" {
  const configured = (process.env.PLAID_ENV ?? "").trim().toLowerCase();
  if (configured === "sandbox") return "sandbox";
  if (configured === "production") return "production";

  let host = "";
  try {
    host = (getRequestHost() ?? "").toLowerCase();
  } catch {
    // No active request context — fall through.
  }
  const isPreviewHost =
    host.includes("lovableproject.com") ||
    host.includes("lovable.app") ||
    host.startsWith("id-preview--");
  return isPreviewHost ? "sandbox" : "production";
}

// 0. Report which Plaid environment the server is using (so the UI can show it)
export const plaidGetEnvironment = createServerFn({ method: "GET" }).handler(async () => {
  return { environment: resolvePlaidEnvironment() };
});

// 1. Create a Plaid Link token (called from the client to open Plaid Link)
export const plaidCreateLinkToken = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const userId = await requireUserId();
    const { link_token, expiration } = await createLinkToken(userId);
    return { link_token, expiration, error: null as string | null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create link token";
    console.error("plaidCreateLinkToken error:", message);
    return { link_token: null, expiration: null, error: message };
  }
});

// 1b. Create an UPDATE-mode link token for an existing item that needs reauth.
// Triggered after detecting ITEM_LOGIN_REQUIRED, PENDING_EXPIRATION, or
// PENDING_DISCONNECT for the item.
export const plaidCreateUpdateLinkToken = createServerFn({ method: "POST" })
  .inputValidator((input: { itemId: string; accountSelection?: boolean }) =>
    z
      .object({
        itemId: z.string().uuid(),
        accountSelection: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const userId = await requireUserId();
      const { data: item, error } = await supabaseAdmin
        .from("plaid_items")
        .select("access_token")
        .eq("id", data.itemId)
        .eq("user_id", userId)
        .single();
      if (error || !item) throw new Error(error?.message ?? "Item not found");
      const { link_token, expiration } = await createUpdateLinkToken(
        userId,
        item.access_token,
        { account_selection_enabled: data.accountSelection ?? false },
      );
      return { link_token, expiration, error: null as string | null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create update link token";
      console.error("plaidCreateUpdateLinkToken error:", message);
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
      const userId = await requireUserId();
      const { access_token, item_id } = await exchangePublicToken(data.public_token);

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("plaid_items")
        .upsert(
          {
            user_id: userId,
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

      const sync = await syncItemInternal(inserted.id, access_token, userId);

      return { ok: true as const, itemId: inserted.id, ...sync, error: null as string | null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to exchange token";
      console.error("plaidExchangeToken error:", message);
      return {
        ok: false as const,
        itemId: null,
        accountsUpdated: 0,
        holdingsUpdated: 0,
        liabilitiesUpdated: 0,
        transactionsUpdated: 0,
        error: message,
      };
    }
  });

// 3. Manual refresh — sync ALL connected items for current user (or a single one)
export const plaidSyncAll = createServerFn({ method: "POST" })
  .inputValidator((input: { itemId?: string } | undefined) =>
    z.object({ itemId: z.string().uuid().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    try {
      const userId = await requireUserId();
      let query = supabaseAdmin
        .from("plaid_items")
        .select("id, access_token, institution_name")
        .eq("user_id", userId);
      if (data.itemId) query = query.eq("id", data.itemId);
      const { data: items, error } = await query;
      if (error) throw new Error(error.message);
      if (!items || items.length === 0) {
        return { ok: true as const, results: [], error: null as string | null };
      }

      const results = [];
      for (const item of items) {
        if (item.access_token === "demo-no-token") continue;
        try {
          const r = await syncItemInternal(item.id, item.access_token, userId);
          results.push({ itemId: item.id, institution: item.institution_name, ...r });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Sync failed";
          const needsReauth = /ITEM_LOGIN_REQUIRED|PENDING_EXPIRATION|PENDING_DISCONNECT/i.test(msg);
          results.push({
            itemId: item.id,
            institution: item.institution_name,
            accountsUpdated: 0,
            holdingsUpdated: 0,
            liabilitiesUpdated: 0,
            transactionsUpdated: 0,
            error: msg,
            requiresUpdate: needsReauth,
          });
        }
      }
      return { ok: true as const, results, error: null as string | null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      console.error("plaidSyncAll error:", message);
      return { ok: false as const, results: [], error: message };
    }
  });

// 4. Disconnect an item — calls Plaid /item/remove to deactivate, then purges local data
export const plaidDisconnectItem = createServerFn({ method: "POST" })
  .inputValidator((input: { itemId: string }) =>
    z.object({ itemId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId();

    // Look up the access_token so we can call /item/remove on Plaid.
    const { data: itemRow, error: itemErr } = await supabaseAdmin
      .from("plaid_items")
      .select("access_token, institution_name")
      .eq("id", data.itemId)
      .eq("user_id", userId)
      .single();
    if (itemErr || !itemRow) {
      return { ok: false as const, error: itemErr?.message ?? "Item not found" };
    }

    // Deactivate on Plaid first. If this throws unexpectedly, abort so the
    // user can retry — we don't want to silently leak active Plaid items.
    const isDemo = (itemRow.institution_name ?? "").includes("(Demo)");
    if (!isDemo && itemRow.access_token) {
      try {
        await removeItem(itemRow.access_token);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to remove item from Plaid";
        console.error("plaidDisconnectItem /item/remove failed:", message);
        return { ok: false as const, error: message };
      }
    }

    // Cascade delete children explicitly (schema has no cascade configured)
    const { data: accts } = await supabaseAdmin
      .from("aggregated_accounts")
      .select("id")
      .eq("item_id", data.itemId)
      .eq("user_id", userId);
    const acctIds = (accts ?? []).map((a) => a.id);
    if (acctIds.length > 0) {
      await supabaseAdmin.from("aggregated_holdings").delete().in("account_id", acctIds);
      await supabaseAdmin.from("aggregated_liabilities").delete().in("account_id", acctIds);
      await supabaseAdmin.from("aggregated_transactions").delete().in("account_id", acctIds);
    }
    await supabaseAdmin
      .from("aggregated_accounts")
      .delete()
      .eq("item_id", data.itemId)
      .eq("user_id", userId);
    const { error } = await supabaseAdmin
      .from("plaid_items")
      .delete()
      .eq("id", data.itemId)
      .eq("user_id", userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, error: null as string | null };
  });

// 4b. Data-retention sweep — see ./plaid-retention.server.ts
// Server fn wrapper so admins can trigger the sweep on demand.
export const plaidRunRetentionSweep = createServerFn({ method: "POST" }).handler(async () => {
  const userId = await requireUserId();
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .limit(1);
  if (!roles || roles.length === 0) {
    return { ok: false as const, error: "Admin only" };
  }
  try {
    const { runPlaidRetentionSweep } = await import("./plaid-retention.server");
    const summary = await runPlaidRetentionSweep();
    return { ok: true as const, summary, error: null as string | null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Retention sweep failed";
    console.error("plaidRunRetentionSweep error:", message);
    return { ok: false as const, error: message };
  }
});

// 5. Read aggregated data for the UI — current user only
export const getAggregatedData = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        items: [],
        accounts: [],
        holdings: [],
        liabilities: [],
        syncLog: [],
        transactions: [],
        error: null,
      };
    }
    const [itemsRes, accountsRes, holdingsRes, liabilitiesRes, syncRes, txRes] = await Promise.all([
      supabaseAdmin
        .from("plaid_items")
        .select("id, institution_name, institution_id, status, last_synced_at, created_at, new_accounts_available")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("aggregated_accounts")
        .select("*")
        .eq("user_id", userId)
        .order("current_balance", { ascending: false, nullsFirst: false }),
      supabaseAdmin
        .from("aggregated_holdings")
        .select("*")
        .eq("user_id", userId)
        .order("institution_value", { ascending: false, nullsFirst: false }),
      supabaseAdmin
        .from("aggregated_liabilities")
        .select("*")
        .eq("user_id", userId)
        .order("next_payment_due_date", { ascending: true, nullsFirst: false }),
      supabaseAdmin
        .from("sync_log")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("aggregated_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(50),
    ]);

    return {
      items: itemsRes.data ?? [],
      accounts: accountsRes.data ?? [],
      holdings: holdingsRes.data ?? [],
      liabilities: liabilitiesRes.data ?? [],
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
      liabilities: [],
      syncLog: [],
      transactions: [],
      error: message,
    };
  }
});

// --- internal helper: sync a single item ---
async function syncItemInternal(itemRowId: string, access_token: string, userId: string) {
  const startedAt = Date.now();
  try {
    const acctRes = await getAccounts(access_token);

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

    // Upsert accounts (namespace plaid_account_id by user to avoid collisions
    // when sandbox returns the same ids for different test users)
    const accountRows = acctRes.accounts.map((a) => ({
      user_id: userId,
      item_id: itemRowId,
      plaid_account_id: `${userId}_${a.account_id}`,
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

    const { data: accountRowsBack, error: accBackErr } = await supabaseAdmin
      .from("aggregated_accounts")
      .select("id, plaid_account_id")
      .eq("item_id", itemRowId);
    if (accBackErr) throw new Error(`accounts read-back: ${accBackErr.message}`);

    // Map raw plaid id -> our row id (account ids in the map use the prefixed form)
    const acctIdMap = new Map<string, string>();
    (accountRowsBack ?? []).forEach((r) => acctIdMap.set(r.plaid_account_id, r.id));

    // Holdings
    let holdingsCount = 0;
    try {
      const holdRes = await getHoldings(access_token);
      const secMap = new Map(holdRes.securities.map((s) => [s.security_id, s]));

      const holdingRows = holdRes.holdings
        .map((h) => {
          const ourAcctId = acctIdMap.get(`${userId}_${h.account_id}`);
          if (!ourAcctId) return null;
          const sec = secMap.get(h.security_id);
          return {
            user_id: userId,
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
      console.warn("holdings skipped:", holdErr instanceof Error ? holdErr.message : holdErr);
    }

    // Liabilities (credit cards, student loans, mortgages)
    let liabilitiesCount = 0;
    try {
      const libRes = await getLiabilities(access_token);
      const libRows: Array<Record<string, unknown>> = [];

      const pickPrimaryApr = (aprs: { apr_percentage: number | null; apr_type: string | null }[] | null) => {
        if (!aprs || aprs.length === 0) return null;
        const purchase = aprs.find((a) => (a.apr_type ?? "").toLowerCase().includes("purchase"));
        return (purchase ?? aprs[0]).apr_percentage ?? null;
      };

      // Redact sensitive identifiers before persisting raw Plaid payloads.
      // We don't need full account numbers, servicer/property addresses, payment
      // reference numbers, or PSLF status to power the UI — keeping them out of
      // our DB minimizes blast radius if the row is ever exposed.
      const SENSITIVE_LIABILITY_KEYS = [
        "account_number",
        "payment_reference_number",
        "sequence_number",
        "servicer_address",
        "property_address",
        "pslf_status",
      ] as const;
      const redactLiability = <T extends Record<string, unknown>>(obj: T): Record<string, unknown> => {
        const clone: Record<string, unknown> = { ...obj };
        for (const k of SENSITIVE_LIABILITY_KEYS) {
          if (k in clone) delete clone[k];
        }
        return clone;
      };

      for (const c of libRes.liabilities.credit ?? []) {
        const ourAcctId = acctIdMap.get(`${userId}_${c.account_id}`);
        if (!ourAcctId) continue;
        libRows.push({
          user_id: userId,
          account_id: ourAcctId,
          liability_type: "credit",
          last_payment_amount: c.last_payment_amount,
          last_payment_date: c.last_payment_date,
          next_payment_due_date: c.next_payment_due_date,
          minimum_payment_amount: c.minimum_payment_amount,
          apr: pickPrimaryApr(c.aprs),
          last_statement_balance: c.last_statement_balance,
          last_statement_issue_date: c.last_statement_issue_date,
          details: redactLiability(c as unknown as Record<string, unknown>),
          last_synced_at: new Date().toISOString(),
        });
      }

      for (const s of libRes.liabilities.student ?? []) {
        const ourAcctId = acctIdMap.get(`${userId}_${s.account_id}`);
        if (!ourAcctId) continue;
        libRows.push({
          user_id: userId,
          account_id: ourAcctId,
          liability_type: "student",
          last_payment_amount: s.last_payment_amount,
          last_payment_date: s.last_payment_date,
          next_payment_due_date: s.next_payment_due_date,
          minimum_payment_amount: s.minimum_payment_amount,
          interest_rate_percentage: s.interest_rate_percentage,
          origination_date: s.origination_date,
          expected_payoff_date: s.expected_payoff_date,
          last_statement_balance: s.last_statement_balance,
          last_statement_issue_date: s.last_statement_issue_date,
          ytd_interest_paid: s.ytd_interest_paid,
          ytd_principal_paid: s.ytd_principal_paid,
          loan_name: s.loan_name,
          loan_status: s.loan_status?.type ?? null,
          details: redactLiability(s as unknown as Record<string, unknown>),
          last_synced_at: new Date().toISOString(),
        });
      }

      for (const m of libRes.liabilities.mortgage ?? []) {
        const ourAcctId = acctIdMap.get(`${userId}_${m.account_id}`);
        if (!ourAcctId) continue;
        libRows.push({
          user_id: userId,
          account_id: ourAcctId,
          liability_type: "mortgage",
          last_payment_amount: m.last_payment_amount,
          last_payment_date: m.last_payment_date,
          next_payment_due_date: m.next_payment_due_date,
          minimum_payment_amount: m.next_monthly_payment,
          interest_rate_percentage: m.interest_rate?.percentage ?? null,
          interest_rate_type: m.interest_rate?.type ?? null,
          origination_date: m.origination_date,
          expected_payoff_date: m.maturity_date,
          escrow_balance: m.escrow_balance,
          ytd_interest_paid: m.ytd_interest_paid,
          ytd_principal_paid: m.ytd_principal_paid,
          details: redactLiability(m as unknown as Record<string, unknown>),
          last_synced_at: new Date().toISOString(),
        });
      }

      const accountIdsForLib = Array.from(acctIdMap.values());
      if (accountIdsForLib.length > 0) {
        await supabaseAdmin
          .from("aggregated_liabilities")
          .delete()
          .in("account_id", accountIdsForLib);
      }
      if (libRows.length > 0) {
        const { error } = await supabaseAdmin
          .from("aggregated_liabilities")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(libRows as any);
        if (error) throw new Error(`liabilities insert: ${error.message}`);
      }
      liabilitiesCount = libRows.length;
    } catch (libErr) {
      console.warn("liabilities skipped:", libErr instanceof Error ? libErr.message : libErr);
    }

    // Transactions
    let transactionsCount = 0;
    try {
      let cursor: string | undefined = undefined;
      let hasMore = true;
      const allAdded: Array<{
        user_id: string;
        plaid_transaction_id: string;
        account_id: string;
        amount: number;
        iso_currency_code: string;
        date: string;
        name: string;
        merchant_name: string | null;
        category: string | null;
        category_detailed: string | null;
        payment_channel: string | null;
        pending: boolean;
        logo_url: string | null;
      }> = [];
      let pages = 0;
      while (hasMore && pages < 5) {
        const txRes = await syncTransactions(access_token, cursor);
        for (const t of txRes.added) {
          const ourAcctId = acctIdMap.get(`${userId}_${t.account_id}`);
          if (!ourAcctId) continue;
          allAdded.push({
            user_id: userId,
            plaid_transaction_id: `${userId}_${t.transaction_id}`,
            account_id: ourAcctId,
            amount: t.amount,
            iso_currency_code: t.iso_currency_code ?? "USD",
            date: t.date,
            name: t.name,
            merchant_name: t.merchant_name,
            category: t.personal_finance_category?.primary ?? null,
            category_detailed: t.personal_finance_category?.detailed ?? null,
            payment_channel: t.payment_channel,
            pending: t.pending,
            logo_url: t.logo_url,
          });
        }
        cursor = txRes.next_cursor;
        hasMore = txRes.has_more;
        pages += 1;
      }
      if (allAdded.length > 0) {
        const { error } = await supabaseAdmin
          .from("aggregated_transactions")
          .upsert(allAdded, { onConflict: "plaid_transaction_id" });
        if (error) throw new Error(`transactions upsert: ${error.message}`);
      }
      transactionsCount = allAdded.length;
    } catch (txErr) {
      console.warn("transactions skipped:", txErr instanceof Error ? txErr.message : txErr);
    }

    await supabaseAdmin
      .from("plaid_items")
      .update({
        last_synced_at: new Date().toISOString(),
        status: "active",
        new_accounts_available: false,
      })
      .eq("id", itemRowId);

    await supabaseAdmin.from("sync_log").insert({
      user_id: userId,
      item_id: itemRowId,
      status: "success",
      accounts_updated: accountRows.length,
      holdings_updated: holdingsCount,
      duration_ms: Date.now() - startedAt,
    });

    return {
      accountsUpdated: accountRows.length,
      holdingsUpdated: holdingsCount,
      liabilitiesUpdated: liabilitiesCount,
      transactionsUpdated: transactionsCount,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync error";
    const needsReauth = /ITEM_LOGIN_REQUIRED|PENDING_EXPIRATION|PENDING_DISCONNECT/i.test(message);
    await supabaseAdmin.from("sync_log").insert({
      user_id: userId,
      item_id: itemRowId,
      status: "error",
      error_message: message,
      duration_ms: Date.now() - startedAt,
    });
    await supabaseAdmin
      .from("plaid_items")
      .update({ status: needsReauth ? "requires_update" : "error" })
      .eq("id", itemRowId);
    throw err;
  }
}
