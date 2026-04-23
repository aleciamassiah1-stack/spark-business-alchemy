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
  Pencil,
  History,
  ListChecks,
  ChevronDown,
  ExternalLink,
  Circle,
} from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { InsuranceReviewModal, type InsuranceReviewDraft } from "@/components/InsuranceReviewModal";
import { setLastSyncAt } from "@/lib/auto-refresh";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { fmtCurrency } from "@/lib/format";
import { HideToggle, MoneyText } from "@/components/HideToggle";
import { useWealth } from "@/lib/wealth-context";
import {
  plaidCreateLinkToken,
  plaidExchangeToken,
  plaidSyncAll,
  plaidDisconnectItem,
  plaidGetEnvironment,
  getAggregatedData,
} from "@/lib/plaid.functions";
import {
  listProperties,
  upsertProperty,
  deleteProperty,
  estimatePropertyValue,
  savePropertyValuation,
  listPropertyValuations,
  deletePropertyValuation,
  uploadPropertyImage,
  type PropertyValuation,
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
  component: () => (
    <RequireOnboarding>
      <ConnectionsPage />
    </RequireOnboarding>
  ),
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
type Property = { id: string; name: string; address: string; estimated_value: number; mortgage_balance: number; image_url: string | null; beds: number | null; baths: number | null; sqft: number | null };
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
  const [historyProperty, setHistoryProperty] = useState<Property | null>(null);
  const [showEstateForm, setShowEstateForm] = useState(false);
  const [rules, setRules] = useState<TransactionRule[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [showRuleForm, setShowRuleForm] = useState<TransactionRule | "new" | null>(null);
  const [quickRuleTx, setQuickRuleTx] = useState<Tx | null>(null);
  const [plaidEnv, setPlaidEnv] = useState<"sandbox" | "production" | null>(null);

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
    plaidGetEnvironment().then((r) => setPlaidEnv(r.environment)).catch(() => {});
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
      setLastSyncAt();
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
            plaidEnv={plaidEnv}
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
            onShowHistory={(p) => setHistoryProperty(p)}
            onRunValuation={async (p) => {
              setSyncing(true, "Running AI valuation…");
              try {
                const est = await estimatePropertyValue({
                  data: {
                    address: p.address,
                    beds: p.beds,
                    baths: p.baths,
                    sqft: p.sqft,
                    property_type: "residential",
                  },
                });
                if (!est.ok || !est.valuation) {
                  showToast("err", est.error ?? "Could not estimate value");
                  return;
                }
                const saveRes = await savePropertyValuation({
                  data: {
                    property_id: p.id,
                    valuation: est.valuation,
                    input_address: p.address,
                    input_beds: p.beds,
                    input_baths: p.baths,
                    input_sqft: p.sqft,
                    source: "ai",
                  },
                });
                if (!saveRes.ok) {
                  showToast("err", saveRes.error ?? "Failed to save valuation");
                  return;
                }
                showToast("ok", `AI estimate: ${fmtCurrency(est.valuation.estimated_value, { compact: true })}`);
                setHistoryProperty(p);
              } catch (err) {
                showToast("err", err instanceof Error ? err.message : "Estimation failed");
              } finally {
                setSyncing(false);
              }
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

      {historyProperty && (
        <ValuationHistoryModal
          property={historyProperty}
          onClose={() => setHistoryProperty(null)}
          onError={(m) => showToast("err", m)}
          onSaved={async () => {
            await loadAll();
            showToast("ok", "Valuation saved to history");
          }}
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
  plaidEnv,
  onConnect,
  onSeedDemo,
  onClearDemo,
  onDisconnect,
}: {
  items: Item[];
  accounts: Account[];
  holdings: Holding[];
  linking: boolean;
  plaidEnv: "sandbox" | "production" | null;
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
        {plaidEnv === "production"
          ? "Plaid Production · sign in with your real bank, brokerage, or Robinhood credentials"
          : plaidEnv === "sandbox"
            ? "Plaid Sandbox · use credentials user_good / pass_good"
            : "Detecting environment…"}
      </p>

      <PlaidLiveChecklist plaidEnv={plaidEnv} itemCount={items.length} />


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
  onShowHistory,
  onRunValuation,
}: {
  properties: Property[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onShowHistory: (p: Property) => void;
  onRunValuation: (p: Property) => void | Promise<void>;
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
            const ltv = p.estimated_value > 0 ? (p.mortgage_balance / p.estimated_value) * 100 : 0;
            return (
              <LuxCard key={p.id} className="overflow-hidden p-0">
                {p.image_url ? (
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <img
                      src={p.image_url}
                      alt={p.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <button
                      onClick={() => onDelete(p.id)}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-md hover:bg-destructive/70 hover:text-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="font-serif text-lg leading-tight text-white">{p.name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-white/70">{p.address}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 px-4 pt-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Home className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-base text-foreground">{p.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{p.address}</p>
                    </div>
                    <button
                      onClick={() => onDelete(p.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div className="p-4">
                  {(p.beds || p.baths || p.sqft) && (
                    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
                      {p.beds ? <span>{p.beds} bd</span> : null}
                      {p.baths ? <span>· {p.baths} ba</span> : null}
                      {p.sqft ? <span>· {Number(p.sqft).toLocaleString()} sf</span> : null}
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <Mini label="Value" value={fmtCurrency(p.estimated_value, { compact: true })} />
                    <Mini label="Mortgage" value={fmtCurrency(p.mortgage_balance, { compact: true })} />
                    <Mini label="Equity" value={fmtCurrency(equity, { compact: true })} positive />
                  </div>
                  <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                      style={{ width: `${Math.min(100, Math.max(0, 100 - ltv))}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                    <span>{(100 - ltv).toFixed(0)}% equity</span>
                    <span>LTV {ltv.toFixed(0)}%</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => onRunValuation(p)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[10px] font-medium text-primary-foreground glow-violet"
                    >
                      <Sparkles className="h-3 w-3" /> Get AI valuation
                    </button>
                    <button
                      onClick={() => onShowHistory(p)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[10px] font-medium text-primary"
                    >
                      <History className="h-3 w-3" /> History
                    </button>
                  </div>
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
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewDraft, setReviewDraft] = useState<InsuranceReviewDraft | null>(null);
  const [reviewFileName, setReviewFileName] = useState<string | undefined>();
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [pendingDoc, setPendingDoc] = useState<{
    path: string | null;
    url: string | null;
    raw: unknown;
  } | null>(null);
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

      const fallbackName = file.name.replace(/\.[^.]+$/, "");
      let draft: InsuranceReviewDraft;
      let raw: unknown = null;

      if (!parsed.ok || !parsed.extracted) {
        draft = {
          policy_type: "other",
          insurer_name: fallbackName,
          policy_number: null,
          coverage_amount: null,
          premium_amount: null,
          premium_frequency: "monthly",
          renewal_date: null,
          status: "active",
          beneficiaries: [],
          parsed_by_ai: false,
        };
        showToast("err", parsed.error ?? "AI parse failed — review manually");
      } else {
        const e = parsed.extracted;
        raw = e;
        draft = {
          policy_type: e.policy_type ?? "other",
          insurer_name: e.insurer_name ?? fallbackName,
          policy_number: e.policy_number ?? null,
          coverage_amount: e.coverage_amount ?? null,
          premium_amount: e.premium_amount ?? null,
          premium_frequency: e.premium_frequency ?? "monthly",
          renewal_date: e.renewal_date ?? null,
          status: "active",
          beneficiaries: e.beneficiaries ?? [],
          parsed_by_ai: true,
        };
      }

      setPendingDoc({ path: upload.path, url: upload.url, raw });
      setReviewDraft(draft);
      setReviewFileName(file.name);
      setReviewError(null);
      setReviewOpen(true);
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : "Failed");
    } finally {
      setParsing(false);
      setSyncing(false);
    }
  };

  const handleConfirmSave = async (draft: InsuranceReviewDraft) => {
    setReviewSaving(true);
    setReviewError(null);
    try {
      const res = await upsertInsurancePolicy({
        data: {
          policy_type: draft.policy_type,
          insurer_name: draft.insurer_name,
          policy_number: draft.policy_number,
          coverage_amount: draft.coverage_amount,
          premium_amount: draft.premium_amount,
          premium_frequency: draft.premium_frequency,
          renewal_date: draft.renewal_date,
          status: draft.status,
          beneficiaries: draft.beneficiaries,
          document_path: pendingDoc?.path ?? null,
          document_url: pendingDoc?.url ?? null,
          parsed_by_ai: draft.parsed_by_ai,
          raw_extraction: pendingDoc?.raw ?? null,
        },
      });
      if (!res.ok) throw new Error(res.error ?? "Save failed");
      setReviewOpen(false);
      setReviewDraft(null);
      setPendingDoc(null);
      showToast("ok", "Policy saved");
      onParsed();
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setReviewSaving(false);
    }
  };

  const handleCloseReview = () => {
    if (reviewSaving) return;
    setReviewOpen(false);
    setReviewDraft(null);
    setPendingDoc(null);
    setReviewError(null);
  };

  return (
    <div>
      <InsuranceReviewModal
        open={reviewOpen}
        initial={reviewDraft}
        fileName={reviewFileName}
        onClose={handleCloseReview}
        onSave={handleConfirmSave}
        saving={reviewSaving}
        error={reviewError}
      />
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
        PDF or photo · review extracted fields before saving
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
                    <a
                      href={d.document_url ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      aria-disabled={!d.document_url}
                      className={`rounded-full px-3 py-1 text-[10px] font-medium ${
                        d.document_url
                          ? "bg-primary/15 text-primary"
                          : "bg-white/[0.04] text-muted-foreground pointer-events-none"
                      }`}
                    >
                      Share with attorney
                    </a>
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
function ActivityTab({
  transactions,
  rules,
  onQuickRule,
}: {
  transactions: Tx[];
  rules: TransactionRule[];
  onQuickRule: (t: Tx) => void;
}) {
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
  // cash flow this month — using effective category (custom overrides original)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthly = transactions.filter((t) => new Date(t.date) >= monthStart);
  const income = monthly.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const spending = monthly.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const customizedCount = transactions.filter((t) => t.custom_category).length;

  return (
    <div>
      <LuxCard className="p-4">
        <p className="label-mono">This month · cash flow</p>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <Mini label="Income" value={fmtCurrency(income, { compact: true })} positive />
          <Mini label="Spending" value={fmtCurrency(spending, { compact: true })} />
          <Mini label="Net" value={fmtCurrency(income - spending, { compact: true })} positive={income - spending >= 0} />
        </div>
        {rules.length > 0 && (
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {rules.length} rule{rules.length === 1 ? "" : "s"} · {customizedCount} txns recategorized
          </p>
        )}
      </LuxCard>

      <p className="label-mono mt-5 mb-2">Recent activity</p>
      <LuxCard className="divide-y divide-white/[0.04]">
        {transactions.slice(0, 30).map((t) => {
          const effectiveCategory = t.custom_category ?? t.category;
          const isCustom = !!t.custom_category;
          return (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-[10px] font-mono text-primary">
                {(t.merchant_name ?? t.name).slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{t.merchant_name ?? t.name}</p>
                <div className="flex items-center gap-1.5">
                  <p
                    className={`truncate font-mono text-[10px] uppercase tracking-wider ${
                      isCustom ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {isCustom && <Tag className="mr-1 inline h-2.5 w-2.5" />}
                    {effectiveCategory?.replace(/_/g, " ") ?? "—"}
                  </p>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    · {new Date(t.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <p
                className={`font-mono text-sm tabular-nums ${t.amount < 0 ? "text-success" : "text-foreground"}`}
              >
                <MoneyText value={`${t.amount < 0 ? "+" : "-"}${fmtCurrency(Math.abs(t.amount))}`} />
              </p>
              <button
                onClick={() => onQuickRule(t)}
                aria-label="Create rule from this transaction"
                className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.03] text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
              >
                <Tag className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
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
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [value, setValue] = useState("");
  const [mortgage, setMortgage] = useState("");
  const [saving, setSaving] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [valuation, setValuation] = useState<PropertyValuation | null>(null);

  const estimate = async () => {
    if (!address.trim() || address.trim().length < 5) {
      onError("Enter an address first");
      return;
    }
    setEstimating(true);
    setValuation(null);
    try {
      const res = await estimatePropertyValue({
        data: {
          address: address.trim(),
          beds: beds ? Number(beds) : null,
          baths: baths ? Number(baths) : null,
          sqft: sqft ? Number(sqft) : null,
        },
      });
      if (!res.ok || !res.valuation) {
        onError(res.error ?? "Could not estimate value");
      } else {
        setValuation(res.valuation);
        setValue(String(Math.round(res.valuation.estimated_value)));
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Estimation failed");
    } finally {
      setEstimating(false);
    }
  };

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      onError("Please choose an image file");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      onError("Image too large (max 6 MB)");
      return;
    }
    setUploadingImage(true);
    try {
      const base64 = await fileToBase64(file);
      const up = await uploadPropertyImage({
        data: { fileName: file.name, base64, mimeType: file.type },
      });
      if (!up.ok || !up.url) throw new Error(up.error ?? "Upload failed");
      setImageUrl(up.url);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

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
        beds: beds ? Number(beds) : null,
        baths: baths ? Number(baths) : null,
        sqft: sqft ? Number(sqft) : null,
        image_url: imageUrl,
      },
    });
    // If we have an AI valuation and the property was created, persist the snapshot
    if (res.ok && res.id && valuation) {
      try {
        await savePropertyValuation({
          data: {
            property_id: res.id,
            valuation,
            input_address: address.trim(),
            input_beds: beds ? Number(beds) : null,
            input_baths: baths ? Number(baths) : null,
            input_sqft: sqft ? Number(sqft) : null,
            source: "ai",
          },
        });
      } catch (err) {
        console.warn("Failed to save valuation snapshot:", err);
      }
    }
    setSaving(false);
    if (res.ok) onSaved();
    else onError(res.error ?? "Failed");
  };

  const confidenceColor =
    valuation?.confidence === "high"
      ? "text-success bg-success/15"
      : valuation?.confidence === "medium"
        ? "text-gold bg-gold/15"
        : "text-muted-foreground bg-white/[0.06]";

  return (
    <Modal title="Add property" onClose={onClose}>
      <div className="mb-3">
        <p className="label-mono mb-1.5">Photo (optional)</p>
        {imageUrl ? (
          <div className="relative overflow-hidden rounded-xl">
            <img src={imageUrl} alt="Property" className="aspect-[16/10] w-full object-cover" />
            <button
              onClick={() => setImageUrl(null)}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] px-4 py-6 text-xs text-muted-foreground hover:bg-white/[0.04]">
            {uploadingImage ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {uploadingImage ? "Uploading…" : "Upload photo of the home"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImage(f);
              }}
            />
          </label>
        )}
      </div>
      <Field label="Name" placeholder="Primary residence" value={name} onChange={setName} />
      <Field label="Address" placeholder="123 Main St, City, ST" value={address} onChange={setAddress} />
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Field label="Beds" placeholder="3" value={beds} onChange={setBeds} type="number" />
        <Field label="Baths" placeholder="2" value={baths} onChange={setBaths} type="number" />
        <Field label="Sqft" placeholder="1800" value={sqft} onChange={setSqft} type="number" />
      </div>
      <button
        onClick={estimate}
        disabled={estimating || !address.trim()}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/10 py-2.5 text-xs font-medium text-primary disabled:opacity-50"
      >
        {estimating ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {estimating ? "Estimating with AI…" : "Estimate value with AI"}
      </button>

      {valuation && (
        <div className="mb-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-3">
          <div className="flex items-baseline justify-between">
            <p className="font-serif text-2xl text-foreground">
              {fmtCurrency(valuation.estimated_value, { compact: true })}
            </p>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${confidenceColor}`}
            >
              {valuation.confidence} confidence
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            Range: {fmtCurrency(valuation.value_low, { compact: true })} –{" "}
            {fmtCurrency(valuation.value_high, { compact: true })}
            {valuation.price_per_sqft
              ? ` · $${Math.round(valuation.price_per_sqft)}/sqft`
              : ""}
          </p>
          {valuation.market_summary && (
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {valuation.market_summary}
            </p>
          )}
          {valuation.comps.length > 0 && (
            <div className="mt-3">
              <p className="label-mono mb-1.5">Comparable sales</p>
              <div className="flex flex-col gap-1.5">
                {valuation.comps.slice(0, 4).map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2 py-1.5 text-[11px]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-foreground">{c.address}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {[
                          c.beds ? `${c.beds}bd` : null,
                          c.baths ? `${c.baths}ba` : null,
                          c.sqft ? `${c.sqft.toLocaleString()}sf` : null,
                          c.distance_mi ? `${c.distance_mi.toFixed(1)}mi` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                    <p className="font-mono tabular-nums text-foreground">
                      {fmtCurrency(c.sold_price, { compact: true })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {valuation.assumptions && (
            <p className="mt-2 font-mono text-[10px] italic text-muted-foreground">
              Assumptions: {valuation.assumptions}
            </p>
          )}
          <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            AI estimate · not an appraisal
          </p>
        </div>
      )}

      <Field
        label="Estimated value (USD)"
        placeholder="850000"
        value={value}
        onChange={setValue}
        type="number"
      />
      <Field
        label="Mortgage balance (USD)"
        placeholder="320000"
        value={mortgage}
        onChange={setMortgage}
        type="number"
      />
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
        className="flex max-h-[88dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-3xl border border-white/[0.08] bg-card p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="font-serif text-xl text-foreground">{title}</p>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.04]">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
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

// =================== Rules Tab ===================
function RulesTab({
  rules,
  onCreate,
  onEdit,
  onDelete,
  onReapply,
}: {
  rules: TransactionRule[];
  onCreate: () => void;
  onEdit: (r: TransactionRule) => void;
  onDelete: (id: string) => void;
  onReapply: () => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="label-mono">Categorization rules</p>
        <div className="flex gap-2">
          {rules.length > 0 && (
            <button
              onClick={onReapply}
              className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" />
              Re-apply
            </button>
          )}
          <button
            onClick={onCreate}
            className="flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-[11px] text-primary transition-colors hover:bg-primary/25"
          >
            <Plus className="h-3 w-3" />
            New rule
          </button>
        </div>
      </div>

      {rules.length === 0 ? (
        <LuxCard className="p-6 text-center">
          <Tag className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-3 font-serif text-lg text-foreground">No rules yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create rules to map merchants to categories. Lower priority numbers run first.
          </p>
          <button
            onClick={onCreate}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-4 py-2 text-xs text-primary transition-colors hover:bg-primary/25"
          >
            <Plus className="h-3.5 w-3.5" />
            Create first rule
          </button>
        </LuxCard>
      ) : (
        <div className="space-y-2">
          {rules.map((r) => (
            <LuxCard key={r.id} className={`p-4 ${r.enabled ? "" : "opacity-50"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                      #{r.priority}
                    </span>
                    <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
                    {!r.enabled && (
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        Off
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-primary">
                    <Tag className="mr-1 inline h-2.5 w-2.5" />
                    {r.category}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.merchant_pattern && (
                      <RulePill label={`merchant ${r.match_type} "${r.merchant_pattern}"`} />
                    )}
                    {r.description_keyword && <RulePill label={`desc has "${r.description_keyword}"`} />}
                    {(r.amount_min != null || r.amount_max != null) && (
                      <RulePill label={`amount ${r.amount_min ?? "0"}–${r.amount_max ?? "∞"}`} />
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => onEdit(r)}
                    aria-label="Edit rule"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(r.id)}
                    aria-label="Delete rule"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </LuxCard>
          ))}
        </div>
      )}
    </div>
  );
}

function RulePill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
      {label}
    </span>
  );
}

// =================== Rule Form Modal ===================
function RuleFormModal({
  rule,
  categorySuggestions,
  onClose,
  onSaved,
  onError,
}: {
  rule: TransactionRule | null;
  categorySuggestions: string[];
  onClose: () => void;
  onSaved: (updated: number) => void;
  onError: (m: string) => void;
}) {
  const [name, setName] = useState(rule?.name ?? "");
  const [category, setCategory] = useState(rule?.category ?? "");
  const [priority, setPriority] = useState(rule?.priority ?? 100);
  const [merchantPattern, setMerchantPattern] = useState(rule?.merchant_pattern ?? "");
  const [matchType, setMatchType] = useState<"exact" | "contains" | "starts_with">(
    rule?.match_type ?? "contains",
  );
  const [descriptionKeyword, setDescriptionKeyword] = useState(rule?.description_keyword ?? "");
  const [amountMin, setAmountMin] = useState(rule?.amount_min?.toString() ?? "");
  const [amountMax, setAmountMax] = useState(rule?.amount_max?.toString() ?? "");
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim()) {
      onError("Name and category are required");
      return;
    }
    setSaving(true);
    const res = await upsertRule({
      data: {
        id: rule?.id,
        name: name.trim(),
        category: category.trim(),
        priority,
        merchant_pattern: merchantPattern.trim() || null,
        match_type: matchType,
        description_keyword: descriptionKeyword.trim() || null,
        amount_min: amountMin ? Number(amountMin) : null,
        amount_max: amountMax ? Number(amountMax) : null,
        enabled,
      },
    });
    setSaving(false);
    if (res.ok) onSaved(res.updated);
    else onError(res.error ?? "Failed to save rule");
  };

  return (
    <RuleModalShell onClose={onClose} title={rule ? "Edit rule" : "New rule"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <RuleField label="Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Coffee shops → Food"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
            autoFocus
          />
        </RuleField>

        <RuleField label="Category" hint="What to label matching transactions">
          <input
            type="text"
            list="rule-cat-suggestions"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Food & Dining"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
          />
          <datalist id="rule-cat-suggestions">
            {categorySuggestions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </RuleField>

        <div>
          <p className="label-mono mb-2">Match conditions (AND)</p>
          <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
            <RuleField label="Merchant pattern" hint="Match against merchant or transaction name">
              <div className="flex gap-2">
                <select
                  value={matchType}
                  onChange={(e) => setMatchType(e.target.value as typeof matchType)}
                  className="w-32 shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-xs text-foreground outline-none focus:border-primary/40"
                >
                  <option value="contains">contains</option>
                  <option value="exact">exact</option>
                  <option value="starts_with">starts with</option>
                </select>
                <input
                  type="text"
                  value={merchantPattern}
                  onChange={(e) => setMerchantPattern(e.target.value)}
                  placeholder="e.g. Starbucks"
                  className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
                />
              </div>
            </RuleField>

            <RuleField label="Description keyword" hint="Optional — substring of transaction name">
              <input
                type="text"
                value={descriptionKeyword}
                onChange={(e) => setDescriptionKeyword(e.target.value)}
                placeholder="e.g. autopay"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
              />
            </RuleField>

            <div className="grid grid-cols-2 gap-2">
              <RuleField label="Amount min">
                <input
                  type="number"
                  step="0.01"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
                />
              </RuleField>
              <RuleField label="Amount max">
                <input
                  type="number"
                  step="0.01"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  placeholder="∞"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
                />
              </RuleField>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <RuleField label="Priority" hint="Lower = runs first">
            <input
              type="number"
              min={1}
              max={9999}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value) || 100)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
            />
          </RuleField>
          <RuleField label="Status">
            <button
              type="button"
              onClick={() => setEnabled((v) => !v)}
              className={`flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm transition-colors ${
                enabled ? "text-success" : "text-muted-foreground"
              }`}
            >
              {enabled ? "Enabled" : "Disabled"}
              <span
                className={`h-5 w-9 rounded-full p-0.5 transition-colors ${
                  enabled ? "bg-success/30" : "bg-white/[0.08]"
                }`}
              >
                <span
                  className={`block h-4 w-4 rounded-full bg-foreground transition-transform ${
                    enabled ? "translate-x-4" : ""
                  }`}
                />
              </span>
            </button>
          </RuleField>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-white/[0.08] bg-white/[0.02] py-2.5 text-xs text-muted-foreground transition-colors hover:bg-white/[0.05]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-full bg-primary py-2.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save & apply"}
          </button>
        </div>
      </form>
    </RuleModalShell>
  );
}

// =================== Quick Rule Modal (inline) ===================
function QuickRuleModal({
  tx,
  categorySuggestions,
  onClose,
  onSaved,
  onError,
}: {
  tx: Tx;
  categorySuggestions: string[];
  onClose: () => void;
  onSaved: (updated: number) => void;
  onError: (m: string) => void;
}) {
  const merchant = tx.merchant_name ?? tx.name;
  const [category, setCategory] = useState(tx.custom_category ?? tx.category ?? "");
  const [matchType, setMatchType] = useState<"exact" | "contains">("contains");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim()) {
      onError("Pick a category");
      return;
    }
    setSaving(true);
    const res = await quickCreateRule({
      data: { merchant, category: category.trim(), matchType },
    });
    setSaving(false);
    if (res.ok) onSaved(res.updated);
    else onError(res.error ?? "Failed to create rule");
  };

  return (
    <RuleModalShell onClose={onClose} title="Always categorize as…">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="label-mono">Merchant</p>
          <p className="mt-1 truncate text-sm text-foreground">{merchant}</p>
        </div>

        <RuleField label="Category">
          <input
            type="text"
            list="quick-cat-suggestions"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Food & Dining"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
            autoFocus
          />
          <datalist id="quick-cat-suggestions">
            {categorySuggestions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </RuleField>

        <RuleField label="Match" hint="How should we match this merchant in future transactions?">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMatchType("contains")}
              className={`flex-1 rounded-full py-2 text-xs transition-colors ${
                matchType === "contains"
                  ? "bg-primary/20 text-primary"
                  : "bg-white/[0.03] text-muted-foreground"
              }`}
            >
              Contains
            </button>
            <button
              type="button"
              onClick={() => setMatchType("exact")}
              className={`flex-1 rounded-full py-2 text-xs transition-colors ${
                matchType === "exact"
                  ? "bg-primary/20 text-primary"
                  : "bg-white/[0.03] text-muted-foreground"
              }`}
            >
              Exact match
            </button>
          </div>
        </RuleField>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-white/[0.08] bg-white/[0.02] py-2.5 text-xs text-muted-foreground transition-colors hover:bg-white/[0.05]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-full bg-primary py-2.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Create rule"}
          </button>
        </div>
      </form>
    </RuleModalShell>
  );
}

// =================== Shared rule modal helpers ===================
function RuleModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/[0.08] bg-card p-5 shadow-2xl sm:rounded-3xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function RuleField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <p className="label-mono mb-1.5">{label}</p>
      {children}
      {hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
    </label>
  );
}

// =================== Valuation History Modal ===================
type ValuationRecord = {
  id: string;
  estimated_value: number;
  value_low: number;
  value_high: number;
  confidence: string;
  price_per_sqft: number | null;
  comps: PropertyValuation["comps"];
  market_summary: string | null;
  assumptions: string | null;
  input_address: string | null;
  input_beds: number | null;
  input_baths: number | null;
  input_sqft: number | null;
  source: string;
  created_at: string;
};

function ValuationHistoryModal({
  property,
  onClose,
  onSaved,
  onError,
}: {
  property: Property;
  onClose: () => void;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [valuations, setValuations] = useState<ValuationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [estimating, setEstimating] = useState(false);
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await listPropertyValuations({ data: { property_id: property.id } });
      setValuations((res.valuations as unknown as ValuationRecord[]) ?? []);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property.id]);

  const runEstimate = async () => {
    setEstimating(true);
    try {
      const est = await estimatePropertyValue({
        data: {
          address: property.address,
          beds: beds ? Number(beds) : null,
          baths: baths ? Number(baths) : null,
          sqft: sqft ? Number(sqft) : null,
        },
      });
      if (!est.ok || !est.valuation) {
        onError(est.error ?? "Could not estimate value");
        return;
      }
      const saveRes = await savePropertyValuation({
        data: {
          property_id: property.id,
          valuation: est.valuation,
          input_address: property.address,
          input_beds: beds ? Number(beds) : null,
          input_baths: baths ? Number(baths) : null,
          input_sqft: sqft ? Number(sqft) : null,
          source: "ai",
        },
      });
      if (!saveRes.ok) {
        onError(saveRes.error ?? "Failed to save valuation");
        return;
      }
      await refresh();
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Estimation failed");
    } finally {
      setEstimating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this valuation from history?")) return;
    const res = await deletePropertyValuation({ data: { id } });
    if (!res.ok) {
      onError(res.error ?? "Delete failed");
      return;
    }
    await refresh();
  };

  const confidenceClass = (c: string) =>
    c === "high"
      ? "text-success bg-success/15"
      : c === "medium"
        ? "text-gold bg-gold/15"
        : "text-muted-foreground bg-white/[0.06]";

  return (
    <Modal title={`Valuation history · ${property.name}`} onClose={onClose}>
      <p className="mb-3 text-[11px] text-muted-foreground">{property.address}</p>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <Field label="Beds" placeholder="3" value={beds} onChange={setBeds} type="number" />
        <Field label="Baths" placeholder="2" value={baths} onChange={setBaths} type="number" />
        <Field label="Sqft" placeholder="1800" value={sqft} onChange={setSqft} type="number" />
      </div>
      <button
        onClick={runEstimate}
        disabled={estimating}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-xs font-medium text-primary-foreground glow-violet disabled:opacity-50"
      >
        {estimating ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {estimating ? "Estimating with AI…" : "Run new AI estimate & save"}
      </button>

      <p className="label-mono mb-2">History</p>
      {loading ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
      ) : valuations.length === 0 ? (
        <LuxCard className="p-5 text-center">
          <History className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-2 text-xs text-muted-foreground">
            No saved valuations yet. Run a new AI estimate above.
          </p>
        </LuxCard>
      ) : (
        <div className="flex flex-col gap-2">
          {valuations.map((v) => (
            <LuxCard key={v.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="font-serif text-lg text-foreground">
                      {fmtCurrency(v.estimated_value, { compact: true })}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${confidenceClass(v.confidence)}`}
                    >
                      {v.confidence}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {fmtCurrency(v.value_low, { compact: true })} –{" "}
                    {fmtCurrency(v.value_high, { compact: true })}
                    {v.price_per_sqft ? ` · $${Math.round(v.price_per_sqft)}/sqft` : ""}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {new Date(v.created_at).toLocaleString()} · {v.source}
                  </p>
                  {v.market_summary && (
                    <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      {v.market_summary}
                    </p>
                  )}
                  {v.comps && v.comps.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-primary">
                        {v.comps.length} comp{v.comps.length === 1 ? "" : "s"}
                      </summary>
                      <div className="mt-1.5 flex flex-col gap-1">
                        {v.comps.slice(0, 5).map((c, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2 py-1 text-[10px]"
                          >
                            <p className="min-w-0 flex-1 truncate text-foreground">{c.address}</p>
                            <p className="font-mono tabular-nums text-foreground">
                              {fmtCurrency(c.sold_price, { compact: true })}
                            </p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(v.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                  aria-label="Delete valuation"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </LuxCard>
          ))}
        </div>
      )}
    </Modal>
  );
}
