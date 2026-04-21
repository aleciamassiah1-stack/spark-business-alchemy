import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Building2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Link2,
  Home,
  Shield,
  Scroll,
  Receipt,
  Sparkles,
  Upload,
  X,
  Wand2,
  Tag,
  GripVertical,
  Pencil,
} from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { fmtCurrency } from "@/lib/format";
import { HideToggle, MoneyText } from "@/components/HideToggle";
import { useWealth } from "@/lib/wealth-context";
import {
  plaidCreateLinkToken,
  plaidExchangeToken,
  plaidSyncAll,
  plaidDisconnectItem,
  getAggregatedData,
} from "@/lib/plaid.functions";
import {
  listProperties,
  upsertProperty,
  deleteProperty,
  listInsurancePolicies,
  upsertInsurancePolicy,
  deleteInsurancePolicy,
  parseInsurancePdf,
  listEstateDocuments,
  upsertEstateDocument,
  deleteEstateDocument,
  uploadWealthDocument,
  seedDemoData,
  clearDemoData,
} from "@/lib/wealth.functions";
import {
  listRules,
  upsertRule,
  deleteRule,
  reapplyAllRules,
  quickCreateRule,
  listCategorySuggestions,
  type TransactionRule,
} from "@/lib/rules.functions";

export const Route = createFileRoute("/connections")({
  head: () => ({
    meta: [
      { title: "Connections — Æther Wealth" },
      { name: "description", content: "Manage every account, property, policy, and document." },
    ],
  }),
  component: ConnectionsPage,
});

declare global {
  interface Window {
    Plaid?: {
      create: (config: {
        token: string;
        onSuccess: (
          public_token: string,
          metadata: { institution?: { institution_id: string; name: string } | null },
        ) => void;
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

type Tab = "accounts" | "properties" | "insurance" | "estate" | "activity" | "rules";

const TABS: { key: Tab; label: string; icon: typeof Building2 }[] = [
  { key: "accounts", label: "Accounts", icon: Building2 },
  { key: "properties", label: "Property", icon: Home },
  { key: "insurance", label: "Insurance", icon: Shield },
  { key: "estate", label: "Estate", icon: Scroll },
  { key: "activity", label: "Activity", icon: Receipt },
  { key: "rules", label: "Rules", icon: Tag },
];

type Item = { id: string; institution_name: string | null; status: string; last_synced_at: string | null; created_at: string };
type Account = { id: string; item_id: string; name: string; mask: string | null; type: string; subtype: string | null; current_balance: number | null };
type Holding = { id: string; account_id: string; ticker: string | null; name: string | null; quantity: number | null; institution_value: number | null; cost_basis: number | null };
type Tx = { id: string; account_id: string; amount: number; date: string; name: string; merchant_name: string | null; category: string | null; custom_category: string | null; applied_rule_id: string | null; logo_url: string | null };
type Property = { id: string; name: string; address: string; estimated_value: number; mortgage_balance: number };
type Policy = { id: string; policy_type: string; insurer_name: string; coverage_amount: number | null; premium_amount: number | null; renewal_date: string | null; parsed_by_ai: boolean; document_url: string | null };
type EstateDoc = { id: string; document_type: string; title: string; status: string; document_url: string | null; signed_date: string | null };

function ConnectionsPage() {
  const { setSyncing } = useWealth();
  const [tab, setTab] = useState<Tab>("accounts");
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [estateDocs, setEstateDocs] = useState<EstateDoc[]>([]);
  const [linking, setLinking] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [showPropForm, setShowPropForm] = useState(false);
  const [showEstateForm, setShowEstateForm] = useState(false);
  const [rules, setRules] = useState<TransactionRule[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [showRuleForm, setShowRuleForm] = useState<TransactionRule | "new" | null>(null);
  const [quickRuleTx, setQuickRuleTx] = useState<Tx | null>(null);

  const showToast = (kind: "ok" | "err", msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAll = async () => {
    const [agg, props, ins, est, rls, cats] = await Promise.all([
      getAggregatedData(),
      listProperties(),
      listInsurancePolicies(),
      listEstateDocuments(),
      listRules(),
      listCategorySuggestions(),
    ]);
    setItems(agg.items as Item[]);
    setAccounts(agg.accounts as Account[]);
    setHoldings(agg.holdings as Holding[]);
    setTransactions(agg.transactions as Tx[]);
    setProperties(props.properties as Property[]);
    setPolicies(ins.policies as Policy[]);
    setEstateDocs(est.documents as EstateDoc[]);
    setRules(rls.rules);
    setCategorySuggestions(cats.categories);
  };

  useEffect(() => {
    loadAll();
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
          setSyncing(true, `Linking ${metadata.institution?.name ?? "institution"}…`);
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
              `Linked · ${res.accountsUpdated} accounts, ${res.holdingsUpdated} holdings, ${res.transactionsUpdated ?? 0} txns`,
            );
            await loadAll();
          } else {
            showToast("err", res.error ?? "Failed to link account");
          }
        },
        onExit: (err) => err && console.warn("Plaid Link exit:", err),
      });
      handler.open();
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : "Failed to open Plaid Link");
    } finally {
      setLinking(false);
    }
  };

  const handleRefresh = async () => {
    setSyncing(true, "Refreshing your accounts…");
    const res = await plaidSyncAll({ data: {} });
    setSyncing(false);
    if (res.ok) {
      showToast(
        "ok",
        res.results.length === 0 ? "Nothing to refresh" : `Refreshed ${res.results.length} institution(s)`,
      );
      await loadAll();
    } else {
      showToast("err", res.error ?? "Refresh failed");
    }
  };

  const handleDisconnect = async (id: string, name: string | null) => {
    if (!confirm(`Disconnect ${name ?? "this institution"}?`)) return;
    const res = await plaidDisconnectItem({ data: { itemId: id } });
    res.ok ? showToast("ok", "Disconnected") : showToast("err", res.error ?? "Failed");
    await loadAll();
  };

  const handleSeedDemo = async () => {
    setSyncing(true, "Seeding demo institutions…");
    const res = await seedDemoData();
    setSyncing(false);
    res.ok ? showToast("ok", "Demo data loaded") : showToast("err", res.error ?? "Demo seed failed");
    await loadAll();
  };

  const handleClearDemo = async () => {
    if (!confirm("Remove all demo institutions and their data?")) return;
    setSyncing(true, "Clearing demo data…");
    const res = await clearDemoData();
    setSyncing(false);
    res.ok ? showToast("ok", "Demo data cleared") : showToast("err", res.error ?? "Failed");
    await loadAll();
  };

  const totalBalance = accounts.reduce((s, a) => s + (Number(a.current_balance) || 0), 0);
  const totalProperty = properties.reduce((s, p) => s + (p.estimated_value - p.mortgage_balance), 0);
  const totalCoverage = policies.reduce((s, p) => s + (p.coverage_amount ?? 0), 0);

  return (
    <MobileShell>
      <div className="px-5 pt-6">
        <Link to="/more" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div>
            <p className="label-mono">Account aggregation</p>
            <h1 className="font-serif text-[32px] leading-tight text-foreground">Connections</h1>
          </div>
          <div className="flex shrink-0 gap-2">
            <HideToggle />
            <button
              onClick={handleRefresh}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-primary hover:bg-white/[0.08]"
              aria-label="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Hero summary */}
      <div className="px-5 pt-5">
        <LuxCard className="gradient-hero p-5">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative">
            <p className="label-mono">Total tracked wealth</p>
            <p className="mt-1 font-serif text-[34px] leading-none text-foreground">
              <MoneyText value={fmtCurrency(totalBalance + totalProperty)} />
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat label="Accounts" value={fmtCurrency(totalBalance, { compact: true })} sub={`${accounts.length} acct`} />
              <Stat label="Property" value={fmtCurrency(totalProperty, { compact: true })} sub={`${properties.length} prop`} />
              <Stat label="Coverage" value={fmtCurrency(totalCoverage, { compact: true })} sub={`${policies.length} pol`} />
            </div>
          </div>
        </LuxCard>
      </div>

      {/* Tabs */}
      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto px-5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-white/[0.08] bg-white/[0.02] text-muted-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 px-5">
        {tab === "accounts" && (
          <AccountsTab
            items={items}
            accounts={accounts}
            holdings={holdings}
            linking={linking}
            onConnect={handleConnect}
            onSeedDemo={handleSeedDemo}
            onClearDemo={handleClearDemo}
            onDisconnect={handleDisconnect}
          />
        )}
        {tab === "properties" && (
          <PropertiesTab
            properties={properties}
            onAdd={() => setShowPropForm(true)}
            onDelete={async (id) => {
              await deleteProperty({ data: { id } });
              await loadAll();
            }}
          />
        )}
        {tab === "insurance" && (
          <InsuranceTab
            policies={policies}
            onParsed={async () => {
              await loadAll();
              showToast("ok", "Policy added");
            }}
            onDelete={async (id) => {
              await deleteInsurancePolicy({ data: { id } });
              await loadAll();
            }}
            showToast={showToast}
          />
        )}
        {tab === "estate" && (
          <EstateTab
            documents={estateDocs}
            onAdd={() => setShowEstateForm(true)}
            onDelete={async (id) => {
              await deleteEstateDocument({ data: { id } });
              await loadAll();
            }}
          />
        )}
        {tab === "activity" && (
          <ActivityTab
            transactions={transactions}
            rules={rules}
            onQuickRule={(t) => setQuickRuleTx(t)}
          />
        )}
        {tab === "rules" && (
          <RulesTab
            rules={rules}
            onCreate={() => setShowRuleForm("new")}
            onEdit={(r) => setShowRuleForm(r)}
            onDelete={async (id) => {
              if (!confirm("Delete this rule? Matching transactions will revert to their original category.")) return;
              const res = await deleteRule({ data: { id } });
              if (res.ok) {
                showToast("ok", "Rule deleted");
                await loadAll();
              } else showToast("err", res.error ?? "Failed");
            }}
            onReapply={async () => {
              setSyncing(true, "Re-applying rules…");
              const res = await reapplyAllRules();
              setSyncing(false);
              if (res.ok) {
                showToast("ok", `Recategorized ${res.updated} transaction${res.updated === 1 ? "" : "s"}`);
                await loadAll();
              } else showToast("err", res.error ?? "Failed");
            }}
          />
        )}
      </div>

      {showRuleForm && (
        <RuleFormModal
          rule={showRuleForm === "new" ? null : showRuleForm}
          categorySuggestions={categorySuggestions}
          onClose={() => setShowRuleForm(null)}
          onSaved={async (updated) => {
            setShowRuleForm(null);
            await loadAll();
            showToast("ok", updated > 0 ? `Saved · ${updated} transactions recategorized` : "Rule saved");
          }}
          onError={(m) => showToast("err", m)}
        />
      )}

      {quickRuleTx && (
        <QuickRuleModal
          tx={quickRuleTx}
          categorySuggestions={categorySuggestions}
          onClose={() => setQuickRuleTx(null)}
          onSaved={async (updated) => {
            setQuickRuleTx(null);
            await loadAll();
            showToast("ok", `Rule created · ${updated} transactions recategorized`);
          }}
          onError={(m) => showToast("err", m)}
        />
      )}

      {showPropForm && (
        <PropertyFormModal
          onClose={() => setShowPropForm(false)}
          onSaved={async () => {
            setShowPropForm(false);
            await loadAll();
            showToast("ok", "Property added");
          }}
          onError={(m) => showToast("err", m)}
        />
      )}

      {showEstateForm && (
        <EstateFormModal
          onClose={() => setShowEstateForm(false)}
          onSaved={async () => {
            setShowEstateForm(false);
            await loadAll();
            showToast("ok", "Document uploaded");
          }}
          onError={(m) => showToast("err", m)}
        />
      )}

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
              {toast.kind === "ok" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              <span className="max-w-[280px]">{toast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MobileShell>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-serif text-base text-foreground">
        <MoneyText value={value} fallback="•••" />
      </p>
      <p className="font-mono text-[9px] text-muted-foreground">{sub}</p>
    </div>
  );
}

// =================== Accounts Tab ===================
function AccountsTab({
  items,
  accounts,
  holdings,
  linking,
  onConnect,
  onSeedDemo,
  onClearDemo,
  onDisconnect,
}: {
  items: Item[];
  accounts: Account[];
  holdings: Holding[];
  linking: boolean;
  onConnect: () => void;
  onSeedDemo: () => void;
  onClearDemo: () => void;
  onDisconnect: (id: string, name: string | null) => void;
}) {
  const acctsByItem = (id: string) => accounts.filter((a) => a.item_id === id);
  const hasDemo = items.some((i) => i.institution_name?.includes("(Demo)"));

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onConnect}
          disabled={linking}
          className="flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground glow-violet disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {linking ? "Opening…" : "Connect bank"}
        </button>
        <button
          onClick={hasDemo ? onClearDemo : onSeedDemo}
          className="flex items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] py-3 text-sm font-medium text-foreground hover:bg-white/[0.06]"
        >
          <Sparkles className="h-4 w-4 text-gold" />
          {hasDemo ? "Clear demo" : "Demo mode"}
        </button>
      </div>
      <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
        Plaid Sandbox · use credentials user_good / pass_good
      </p>

      {items.length === 0 ? (
        <div className="mt-6">
          <LuxCard className="p-6 text-center">
            <Link2 className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-3 font-serif text-lg text-foreground">No accounts yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Link a bank or load demo data to populate your private office.
            </p>
          </LuxCard>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {items.map((item) => {
            const accts = acctsByItem(item.id);
            const acctIds = accts.map((a) => a.id);
            const holds = holdings.filter((h) => acctIds.includes(h.account_id));
            const isDemo = item.institution_name?.includes("(Demo)");
            return (
              <LuxCard key={item.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isDemo ? "bg-gold/15 text-gold" : "bg-primary/15 text-primary"}`}>
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
                      {accts.length} acct
                      {holds.length > 0 ? ` · ${holds.length} holdings` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => onDisconnect(item.id, item.institution_name)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {accts.length > 0 && (
                  <div className="mt-3 divide-y divide-white/[0.04] rounded-xl border border-white/[0.04] bg-white/[0.02]">
                    {accts.map((a) => (
                      <div key={a.id} className="flex items-center justify-between px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-foreground">
                            {a.name}
                            {a.mask ? <span className="text-muted-foreground"> ····{a.mask}</span> : null}
                          </p>
                          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            {labelForType(a.subtype, a.type)}
                          </p>
                        </div>
                        <p className="font-mono text-sm tabular-nums text-foreground">
                          <MoneyText value={a.current_balance != null ? fmtCurrency(Number(a.current_balance)) : "—"} />
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {holds.length > 0 && (
                  <div className="mt-3">
                    <p className="label-mono mb-1.5">Holdings</p>
                    <div className="divide-y divide-white/[0.04] rounded-xl border border-white/[0.04] bg-white/[0.02]">
                      {holds.slice(0, 6).map((h) => {
                        const value = Number(h.institution_value) || 0;
                        const cost = Number(h.cost_basis) || 0;
                        const gain = cost > 0 ? value - cost : null;
                        const gainPct = cost > 0 ? ((value - cost) / cost) * 100 : null;
                        return (
                          <div key={h.id} className="flex items-center justify-between px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-foreground">
                                {h.ticker ?? h.name ?? "Security"}
                              </p>
                              <p className="font-mono text-[10px] text-muted-foreground">
                                {h.quantity != null ? `${Number(h.quantity).toFixed(4)} sh` : ""}
                                {gain != null ? (
                                  <span className={gain >= 0 ? " text-success" : " text-destructive"}>
                                    {" · "}
                                    {gain >= 0 ? "+" : ""}
                                    {fmtCurrency(gain, { compact: true })} ({gainPct?.toFixed(1)}%)
                                  </span>
                                ) : null}
                              </p>
                            </div>
                            <p className="font-mono text-sm tabular-nums text-foreground">
                              <MoneyText value={fmtCurrency(value)} />
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </LuxCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function labelForType(subtype: string | null, type: string) {
  const map: Record<string, string> = {
    checking: "Checking",
    savings: "Savings",
    brokerage: "Taxable Brokerage",
    ira: "IRA",
    "401k": "401(k)",
    roth: "Roth IRA",
    crypto: "Crypto",
    "credit card": "Credit",
  };
  return map[subtype ?? ""] ?? subtype ?? type;
}

// =================== Properties Tab ===================
function PropertiesTab({
  properties,
  onAdd,
  onDelete,
}: {
  properties: Property[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <button
        onClick={onAdd}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground glow-violet"
      >
        <Plus className="h-4 w-4" /> Add property
      </button>
      {properties.length === 0 ? (
        <LuxCard className="mt-5 p-6 text-center">
          <Home className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-3 font-serif text-lg text-foreground">No properties</p>
          <p className="mt-1 text-xs text-muted-foreground">Add real estate to track equity in your net worth.</p>
        </LuxCard>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {properties.map((p) => {
            const equity = p.estimated_value - p.mortgage_balance;
            return (
              <LuxCard key={p.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Home className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-base text-foreground">{p.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{p.address}</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <Mini label="Value" value={fmtCurrency(p.estimated_value, { compact: true })} />
                      <Mini label="Mortgage" value={fmtCurrency(p.mortgage_balance, { compact: true })} />
                      <Mini label="Equity" value={fmtCurrency(equity, { compact: true })} positive />
                    </div>
                  </div>
                  <button
                    onClick={() => onDelete(p.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </LuxCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-mono text-xs tabular-nums ${positive ? "text-success" : "text-foreground"}`}>
        <MoneyText value={value} fallback="•••" />
      </p>
    </div>
  );
}

// =================== Insurance Tab ===================
function InsuranceTab({
  policies,
  onParsed,
  onDelete,
  showToast,
}: {
  policies: Policy[];
  onParsed: () => void;
  onDelete: (id: string) => void;
  showToast: (k: "ok" | "err", m: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const { setSyncing } = useWealth();

  const handleFile = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      showToast("err", "File too large (max 8 MB)");
      return;
    }
    setParsing(true);
    setSyncing(true, "AI parsing your policy…");
    try {
      const base64 = await fileToBase64(file);
      const upload = await uploadWealthDocument({
        data: { folder: "insurance", fileName: file.name, base64, mimeType: file.type },
      });
      if (!upload.ok) throw new Error(upload.error ?? "Upload failed");

      const parsed = await parseInsurancePdf({
        data: { fileName: file.name, base64, mimeType: file.type },
      });

      if (!parsed.ok || !parsed.extracted) {
        // still save the document with manual placeholder
        await upsertInsurancePolicy({
          data: {
            policy_type: "other",
            insurer_name: file.name.replace(/\.[^.]+$/, ""),
            document_path: upload.path,
            document_url: upload.url,
            parsed_by_ai: false,
          },
        });
        showToast("err", parsed.error ?? "AI parse failed — saved as draft");
      } else {
        const e = parsed.extracted;
        await upsertInsurancePolicy({
          data: {
            policy_type: e.policy_type,
            insurer_name: e.insurer_name,
            policy_number: e.policy_number ?? null,
            coverage_amount: e.coverage_amount ?? null,
            premium_amount: e.premium_amount ?? null,
            premium_frequency: e.premium_frequency ?? "monthly",
            renewal_date: e.renewal_date ?? null,
            beneficiaries: e.beneficiaries ?? [],
            document_path: upload.path,
            document_url: upload.url,
            parsed_by_ai: true,
            raw_extraction: e,
          },
        });
      }
      onParsed();
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : "Failed");
    } finally {
      setParsing(false);
      setSyncing(false);
    }
  };

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={parsing}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground glow-violet disabled:opacity-50"
      >
        {parsing ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="h-4 w-4" />
        )}
        {parsing ? "Parsing with AI…" : "Upload policy (AI parses)"}
      </button>
      <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
        PDF or photo · Lovable AI extracts fields automatically
      </p>

      {policies.length === 0 ? (
        <LuxCard className="mt-5 p-6 text-center">
          <Shield className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-3 font-serif text-lg text-foreground">No policies yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload a life, home, auto, or umbrella policy and the AI will parse coverage, premium and renewal.
          </p>
        </LuxCard>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {policies.map((p) => (
            <LuxCard key={p.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-violet">
                  <Shield className="h-4 w-4 text-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-serif text-base capitalize text-foreground">{p.policy_type}</p>
                    {p.parsed_by_ai && (
                      <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gold">
                        <Sparkles className="h-2.5 w-2.5" /> AI ✦
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">{p.insurer_name}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <Mini label="Coverage" value={p.coverage_amount ? fmtCurrency(p.coverage_amount, { compact: true }) : "—"} />
                    <Mini label="Premium" value={p.premium_amount ? fmtCurrency(p.premium_amount) : "—"} />
                    <Mini label="Renewal" value={p.renewal_date ? new Date(p.renewal_date).toLocaleDateString() : "—"} />
                  </div>
                </div>
                <button
                  onClick={() => onDelete(p.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </LuxCard>
          ))}
        </div>
      )}
    </div>
  );
}

// =================== Estate Tab ===================
function EstateTab({
  documents,
  onAdd,
  onDelete,
}: {
  documents: EstateDoc[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <button
        onClick={onAdd}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground glow-violet"
      >
        <Upload className="h-4 w-4" /> Upload estate document
      </button>
      {documents.length === 0 ? (
        <LuxCard className="mt-5 p-6 text-center">
          <Scroll className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-3 font-serif text-lg text-foreground">No documents</p>
          <p className="mt-1 text-xs text-muted-foreground">Will, POA, healthcare directive — upload PDFs to your private vault.</p>
        </LuxCard>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {documents.map((d) => (
            <LuxCard key={d.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-gold">
                  <Scroll className="h-4 w-4 text-background" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-serif text-base text-foreground">{d.title}</p>
                    <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${statusStyle(d.status)}`}>
                      {d.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-[11px] capitalize text-muted-foreground">{d.document_type.replace(/_/g, " ")}</p>
                  <div className="mt-2 flex gap-2">
                    {d.document_url && (
                      <a
                        href={d.document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[10px] font-medium text-foreground hover:bg-white/[0.06]"
                      >
                        View PDF
                      </a>
                    )}
                    <button className="rounded-full bg-primary/15 px-3 py-1 text-[10px] font-medium text-primary">
                      Share with attorney
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => onDelete(d.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </LuxCard>
          ))}
        </div>
      )}
    </div>
  );
}

function statusStyle(status: string) {
  if (status === "current") return "bg-success/15 text-success";
  if (status === "needs_review") return "bg-warning/15 text-warning";
  return "bg-destructive/15 text-destructive";
}

// =================== Activity Tab ===================
function ActivityTab({ transactions }: { transactions: Tx[] }) {
  if (transactions.length === 0) {
    return (
      <LuxCard className="p-6 text-center">
        <Receipt className="mx-auto h-6 w-6 text-primary" />
        <p className="mt-3 font-serif text-lg text-foreground">No transactions yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Connect a bank or load demo data to see your transaction feed.
        </p>
      </LuxCard>
    );
  }
  // cash flow this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthly = transactions.filter((t) => new Date(t.date) >= monthStart);
  const income = monthly.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const spending = monthly.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      <LuxCard className="p-4">
        <p className="label-mono">This month · cash flow</p>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <Mini label="Income" value={fmtCurrency(income, { compact: true })} positive />
          <Mini label="Spending" value={fmtCurrency(spending, { compact: true })} />
          <Mini label="Net" value={fmtCurrency(income - spending, { compact: true })} positive={income - spending >= 0} />
        </div>
      </LuxCard>

      <p className="label-mono mt-5 mb-2">Recent activity</p>
      <LuxCard className="divide-y divide-white/[0.04]">
        {transactions.slice(0, 30).map((t) => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-[10px] font-mono text-primary">
              {(t.merchant_name ?? t.name).slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{t.merchant_name ?? t.name}</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {t.category?.replace(/_/g, " ") ?? "—"} · {new Date(t.date).toLocaleDateString()}
              </p>
            </div>
            <p className={`font-mono text-sm tabular-nums ${t.amount < 0 ? "text-success" : "text-foreground"}`}>
              <MoneyText value={`${t.amount < 0 ? "+" : "-"}${fmtCurrency(Math.abs(t.amount))}`} />
            </p>
          </div>
        ))}
      </LuxCard>
    </div>
  );
}

// =================== Modals ===================
function PropertyFormModal({
  onClose,
  onSaved,
  onError,
}: {
  onClose: () => void;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [value, setValue] = useState("");
  const [mortgage, setMortgage] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() || !address.trim() || !value) {
      onError("Name, address, and value are required");
      return;
    }
    setSaving(true);
    const res = await upsertProperty({
      data: {
        name: name.trim(),
        address: address.trim(),
        estimated_value: Number(value),
        mortgage_balance: Number(mortgage) || 0,
      },
    });
    setSaving(false);
    res.ok ? onSaved() : onError(res.error ?? "Failed");
  };

  return (
    <Modal title="Add property" onClose={onClose}>
      <Field label="Name" placeholder="Primary residence" value={name} onChange={setName} />
      <Field label="Address" placeholder="123 Main St, City, ST" value={address} onChange={setAddress} />
      <Field label="Estimated value (USD)" placeholder="850000" value={value} onChange={setValue} type="number" />
      <Field label="Mortgage balance (USD)" placeholder="320000" value={mortgage} onChange={setMortgage} type="number" />
      <p className="mt-1 text-center font-mono text-[10px] text-muted-foreground">
        Zillow auto-valuation coming soon
      </p>
      <button
        onClick={submit}
        disabled={saving}
        className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground glow-violet disabled:opacity-50"
      >
        {saving ? "Saving…" : "Add property"}
      </button>
    </Modal>
  );
}

function EstateFormModal({
  onClose,
  onSaved,
  onError,
}: {
  onClose: () => void;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"will" | "healthcare_directive" | "power_of_attorney" | "trust" | "other">("will");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim()) return onError("Title required");
    setSaving(true);
    try {
      let document_path: string | null = null;
      let document_url: string | null = null;
      if (file) {
        if (file.size > 8 * 1024 * 1024) throw new Error("File too large (max 8 MB)");
        const base64 = await fileToBase64(file);
        const up = await uploadWealthDocument({
          data: { folder: "estate", fileName: file.name, base64, mimeType: file.type },
        });
        if (!up.ok) throw new Error(up.error ?? "Upload failed");
        document_path = up.path;
        document_url = up.url;
      }
      const res = await upsertEstateDocument({
        data: {
          title: title.trim(),
          document_type: type,
          status: "current",
          document_path,
          document_url,
        },
      });
      if (!res.ok) throw new Error(res.error ?? "Failed");
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Upload estate document" onClose={onClose}>
      <Field label="Document title" placeholder="Last Will & Testament" value={title} onChange={setTitle} />
      <div>
        <p className="label-mono mb-1.5">Type</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(["will", "healthcare_directive", "power_of_attorney", "trust", "other"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-full border px-3 py-1.5 text-[11px] capitalize transition-all ${
                type === t
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-white/[0.08] bg-white/[0.02] text-muted-foreground"
              }`}
            >
              {t.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <p className="label-mono mb-1.5">Attach PDF (optional)</p>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] px-4 py-3 text-xs text-muted-foreground hover:bg-white/[0.04]">
          <Upload className="h-3.5 w-3.5" />
          {file ? file.name : "Choose file"}
          <input
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      <button
        onClick={submit}
        disabled={saving}
        className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground glow-violet disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save document"}
      </button>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="mb-3">
      <p className="label-mono mb-1.5">{label}</p>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none"
      />
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-[430px] rounded-t-3xl border border-white/[0.08] bg-card p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="font-serif text-xl text-foreground">{title}</p>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.04]">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
