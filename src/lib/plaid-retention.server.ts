// Server-only data-retention sweep for Plaid-derived consumer data.
// Calls /item/remove on stale Items and purges aged transactions/sync logs.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { removeItem } from "./plaid.server";

export async function runPlaidRetentionSweep(opts: {
  staleItemDays?: number;
  reauthGraceDays?: number;
  transactionRetentionDays?: number;
  syncLogRetentionDays?: number;
} = {}): Promise<{
  itemsRemoved: number;
  transactionsDeleted: number;
  syncLogsDeleted: number;
  pendingDeletionItemsRemoved: number;
  errors: string[];
}> {
  const staleItemDays = opts.staleItemDays ?? 180;
  const reauthGraceDays = opts.reauthGraceDays ?? 90;
  const txRetentionDays = opts.transactionRetentionDays ?? 730;
  const syncLogRetentionDays = opts.syncLogRetentionDays ?? 90;
  const errors: string[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const staleCutoff = new Date(now - staleItemDays * dayMs).toISOString();
  const reauthCutoff = new Date(now - reauthGraceDays * dayMs).toISOString();
  const txCutoff = new Date(now - txRetentionDays * dayMs).toISOString().slice(0, 10);
  const syncCutoff = new Date(now - syncLogRetentionDays * dayMs).toISOString();

  const { data: staleItems } = await supabaseAdmin
    .from("plaid_items")
    .select("id, user_id, access_token, institution_name, status, last_synced_at, updated_at")
    .or(
      `and(status.eq.requires_update,updated_at.lt.${reauthCutoff}),` +
        `last_synced_at.lt.${staleCutoff}`,
    );

  let itemsRemoved = 0;
  for (const row of staleItems ?? []) {
    const isDemo = (row.institution_name ?? "").includes("(Demo)");
    if (!isDemo && row.access_token) {
      try {
        await removeItem(row.access_token);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[retention] /item/remove failed for ${row.id}: ${msg}`);
        errors.push(`item ${row.id}: ${msg}`);
        continue;
      }
    }
    const { data: accts } = await supabaseAdmin
      .from("aggregated_accounts")
      .select("id")
      .eq("item_id", row.id);
    const acctIds = (accts ?? []).map((a) => a.id);
    if (acctIds.length > 0) {
      await supabaseAdmin.from("aggregated_holdings").delete().in("account_id", acctIds);
      await supabaseAdmin.from("aggregated_liabilities").delete().in("account_id", acctIds);
      await supabaseAdmin.from("aggregated_transactions").delete().in("account_id", acctIds);
    }
    await supabaseAdmin.from("aggregated_accounts").delete().eq("item_id", row.id);
    await supabaseAdmin.from("plaid_items").delete().eq("id", row.id);
    itemsRemoved += 1;
  }

  const { count: txDeletedCount } = await supabaseAdmin
    .from("aggregated_transactions")
    .delete({ count: "exact" })
    .lt("date", txCutoff);

  const { count: syncDeletedCount } = await supabaseAdmin
    .from("sync_log")
    .delete({ count: "exact" })
    .lt("created_at", syncCutoff);

  let pendingDeletionItemsRemoved = 0;
  const { data: expiredPending } = await supabaseAdmin
    .from("pending_account_deletions")
    .select("user_id")
    .lte("purge_after", new Date(now).toISOString());
  for (const p of expiredPending ?? []) {
    const { data: rows } = await supabaseAdmin
      .from("plaid_items")
      .select("id, access_token, institution_name")
      .eq("user_id", p.user_id);
    for (const row of rows ?? []) {
      const isDemo = (row.institution_name ?? "").includes("(Demo)");
      if (isDemo || !row.access_token) continue;
      try {
        await removeItem(row.access_token);
        pendingDeletionItemsRemoved += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[retention] pending-deletion /item/remove failed for ${row.id}: ${msg}`);
        errors.push(`pending ${row.id}: ${msg}`);
      }
    }
  }

  return {
    itemsRemoved,
    transactionsDeleted: txDeletedCount ?? 0,
    syncLogsDeleted: syncDeletedCount ?? 0,
    pendingDeletionItemsRemoved,
    errors,
  };
}
