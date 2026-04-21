import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RefreshCw, Plus, Building2, CheckCircle2, AlertCircle, Trash2, Link2 } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { fmtCurrency } from "@/lib/format";
import {
  plaidCreateLinkToken,
  plaidExchangeToken,
  plaidSyncAll,
  plaidDisconnectItem,
  getAggregatedData,
} from "@/lib/plaid.functions";

export const Route = createFileRoute("/connections")({
  head: () => ({
    meta: [
      { title: "Connections — Æther Wealth" },
      { name: "description", content: "Link your bank, brokerage, and investment accounts." },
    ],
  }),
  component: ConnectionsPage,
});

type AggregatedItem = {
  id: string;
  institution_name: string | null;
  institution_id: string | null;
  status: string;
  last_synced_at: string | null;
  created_at: string;
};

type AggregatedAccount = {
  id: string;
  item_id: string;
  name: string;
  official_name: string | null;
  mask: string | null;
  type: string;
  subtype: string | null;
  current_balance: number | null;
  iso_currency_code: string | null;
};

type AggregatedHolding = {
  id: string;
  account_id: string;
  ticker: string | null;
  name: string | null;
  quantity: number | null;
  institution_value: number | null;
};

declare global {
  interface Window {
    Plaid?: {
      create: (config: {
        token: string;
        onSuccess: (public_token: string, metadata: { institution?: { institution_id: string; name: string } | null }) => void;
        onExit: (err: unknown, metadata: unknown) => void;
      }) => { open: () => void };
    };
  }
}

const PLAID_LINK_SRC = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";

function loadPlaidScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
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

function ConnectionsPage() {
  const [items, setItems] = useState<AggregatedItem[]>([]);
  const [accounts, setAccounts] = useState<AggregatedAccount[]>([]);
  const [holdings, setHoldings] = useState<AggregatedHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [linking, setLinking] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const showToast = (kind: "ok" | "err", msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    const res = await getAggregatedData();
    setItems(res.items as AggregatedItem[]);
    setAccounts(res.accounts as AggregatedAccount[]);
    setHoldings(res.holdings as AggregatedHolding[]);
    setLoading(false);
    if (res.error) showToast("err", res.error);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConnect = async () => {
    setLinking(true);
    try {
      await loadPlaidScript();
      const tokenRes = await plaidCreateLinkToken();
      if (!tokenRes.link_token) throw new Error(tokenRes.error ?? "No link token");
      if (!window.Plaid) throw new Error("Plaid Link unavailable");

      const handler = window.Plaid.create({
        token: tokenRes.link_token,
        onSuccess: async (public_token, metadata) => {
          setSyncing(true);
          const res = await plaidExchangeToken({
            data: {
              public_token,
              institution_id: metadata.institution?.institution_id,
              institution_name: metadata.institution?.name,
            },
          });
          setSyncing(false);
          if (res.ok) {
            showToast(
              "ok",
              `Linked ${metadata.institution?.name ?? "institution"} · ${res.accountsUpdated} accounts, ${res.holdingsUpdated} holdings`,
            );
            await loadData();
          } else {
            showToast("err", res.error ?? "Failed to link account");
          }
        },
        onExit: (err) => {
          if (err) console.warn("Plaid Link exit:", err);
        },
      });
      handler.open();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to open Plaid Link";
      showToast("err", msg);
    } finally {
      setLinking(false);
    }
  };

  const handleRefresh = async () => {
    setSyncing(true);
    const res = await plaidSyncAll({ data: {} });
    setSyncing(false);
    if (res.ok) {
      const totalAccts = res.results.reduce((s, r) => s + (r.accountsUpdated ?? 0), 0);
      const totalHolds = res.results.reduce((s, r) => s + (r.holdingsUpdated ?? 0), 0);
      showToast(
        "ok",
        res.results.length === 0
          ? "Nothing to refresh — connect an institution first"
          : `Refreshed ${res.results.length} institution${res.results.length === 1 ? "" : "s"} · ${totalAccts} accounts, ${totalHolds} holdings`,
      );
      await loadData();
    } else {
      showToast("err", res.error ?? "Refresh failed");
    }
  };

  const handleDisconnect = async (itemId: string, name: string | null) => {
    if (!confirm(`Disconnect ${name ?? "this institution"}? Cached data will be removed.`)) return;
    const res = await plaidDisconnectItem({ data: { itemId } });
    if (res.ok) {
      showToast("ok", "Disconnected");
      await loadData();
    } else {
      showToast("err", res.error ?? "Failed to disconnect");
    }
  };

  const totalBalance = accounts.reduce((s, a) => s + (Number(a.current_balance) || 0), 0);
  const accountsByItem = (itemId: string) => accounts.filter((a) => a.item_id === itemId);
  const holdingsForAccounts = (acctIds: string[]) =>
    holdings.filter((h) => acctIds.includes(h.account_id));

  return (
    <MobileShell>
      <div className="px-5 pt-6">
        <Link to="/more" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div>
            <p className="label-mono">Account aggregation</p>
            <h1 className="font-serif text-[32px] leading-tight text-foreground">Connections</h1>
          </div>
          <button
            onClick={handleRefresh}
            disabled={syncing || items.length === 0}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-primary transition-all hover:bg-white/[0.08] disabled:opacity-40"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Total card */}
      <div className="px-5 pt-5">
        <LuxCard className="gradient-hero p-5">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative">
            <p className="label-mono">Aggregated balance</p>
            <p className="mt-1 font-serif text-[34px] leading-none text-foreground">
              {fmtCurrency(totalBalance)}
            </p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {accounts.length} accounts · {items.length} institution{items.length === 1 ? "" : "s"} · powered by Plaid
            </p>
          </div>
        </LuxCard>
      </div>

      {/* Connect button */}
      <div className="px-5 pt-4">
        <button
          onClick={handleConnect}
          disabled={linking || syncing}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 glow-violet disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {linking ? "Opening Plaid…" : "Connect institution"}
        </button>
        <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
          Sandbox mode · use credentials user_good / pass_good
        </p>
      </div>

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="px-5 pt-6">
          <LuxCard className="p-6 text-center">
            <Link2 className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-3 font-serif text-lg text-foreground">No accounts linked yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Connect a bank or brokerage to pull live balances and holdings into Æther.
            </p>
          </LuxCard>
        </div>
      )}

      {/* Linked institutions */}
      {items.length > 0 && (
        <div className="px-5 pt-6">
          <p className="label-mono mb-2">Linked institutions</p>
          <div className="flex flex-col gap-3">
            {items.map((item) => {
              const acctsForItem = accountsByItem(item.id);
              const holdsForItem = holdingsForAccounts(acctsForItem.map((a) => a.id));
              return (
                <LuxCard key={item.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-serif text-base text-foreground">
                          {item.institution_name ?? "Institution"}
                        </p>
                        {item.status === "active" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-warning" />
                        )}
                      </div>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {item.last_synced_at
                          ? `Synced ${new Date(item.last_synced_at).toLocaleString()}`
                          : "Never synced"}
                        {" · "}
                        {acctsForItem.length} acct
                        {holdsForItem.length > 0 ? ` · ${holdsForItem.length} holdings` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDisconnect(item.id, item.institution_name)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                      aria-label="Disconnect"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {acctsForItem.length > 0 && (
                    <div className="mt-3 divide-y divide-white/[0.04] rounded-xl border border-white/[0.04] bg-white/[0.02]">
                      {acctsForItem.map((a) => (
                        <div key={a.id} className="flex items-center justify-between px-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-foreground">
                              {a.name}
                              {a.mask ? <span className="text-muted-foreground"> ····{a.mask}</span> : null}
                            </p>
                            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                              {a.subtype ?? a.type}
                            </p>
                          </div>
                          <p className="font-mono text-sm tabular-nums text-foreground">
                            {a.current_balance != null ? fmtCurrency(Number(a.current_balance)) : "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {holdsForItem.length > 0 && (
                    <div className="mt-3">
                      <p className="label-mono mb-1.5">Holdings</p>
                      <div className="divide-y divide-white/[0.04] rounded-xl border border-white/[0.04] bg-white/[0.02]">
                        {holdsForItem.slice(0, 5).map((h) => (
                          <div key={h.id} className="flex items-center justify-between px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-foreground">
                                {h.ticker ?? h.name ?? "Security"}
                              </p>
                              <p className="font-mono text-[10px] text-muted-foreground">
                                {h.quantity != null ? `${Number(h.quantity).toFixed(4)} shares` : ""}
                              </p>
                            </div>
                            <p className="font-mono text-sm tabular-nums text-foreground">
                              {h.institution_value != null
                                ? fmtCurrency(Number(h.institution_value))
                                : "—"}
                            </p>
                          </div>
                        ))}
                        {holdsForItem.length > 5 && (
                          <p className="px-3 py-2 text-center font-mono text-[10px] text-muted-foreground">
                            +{holdsForItem.length - 5} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </LuxCard>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-5 pt-6">
        <p className="text-center font-mono text-[10px] text-muted-foreground">
          Tokens encrypted server-side · never exposed to the client
        </p>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 px-4"
          >
            <div
              className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs shadow-lg backdrop-blur-xl ${
                toast.kind === "ok"
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {toast.kind === "ok" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5" />
              )}
              <span className="max-w-[280px]">{toast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MobileShell>
  );
}
