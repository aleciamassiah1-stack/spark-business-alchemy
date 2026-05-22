import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  Wallet,
  Banknote,
  Receipt,
  Building2,
  FileText,
  Sparkles,
  ShieldCheck,
  Users,
  Crown,
  CalendarClock,
  Info,
  X,
  CheckCircle2,
  ScrollText,
  Upload,
  Link2,
  Wand2,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { MoneyText, HideToggle } from "@/components/HideToggle";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { UpgradeWall } from "@/components/UpgradeWall";
import { SectionHeader } from "@/components/SectionHeader";
import { BusinessQuickSetup } from "@/components/BusinessQuickSetup";
import { classifyBusinessAccounts } from "@/lib/business-ai.functions";
import { Button } from "@/components/ui/button";
import {
  TaxReturnReviewModal,
  type TaxReturnReviewDraft,
  type TaxReturnReviewSource,
} from "@/components/TaxReturnReviewModal";
import { fmtCurrency, fmtPct } from "@/lib/format";
import { parseTaxReturnDocuments } from "@/lib/wealth.functions";
import {
  type BusinessState,
  type BusinessAsset,
  type BusinessLiability,
  type BusinessInsurance,
  type BusinessDocument,
  type Partner,
  type FundingRound,
  type EntityType,
  type ExitStrategy,
  loadBusiness,
  saveBusiness,
  subscribeBusiness,
  makeAsset,
  makeLiability,
  makePartner,
  makeFundingRound,
  makeInsurance,
  makeDocument,
  seedDemoBusiness,
  computeSuccessionReadiness,
  computeExitReadiness,
  nextTransitionAction,
  dateToHorizon,
} from "@/lib/business-store";
import { useIsTestAccount } from "@/lib/test-account";
import { ReadinessRing } from "@/components/ReadinessRing";
import { TransitionPlanWizard } from "@/components/TransitionPlanWizard";

export const Route = createFileRoute("/business")({
  head: () => ({
    meta: [
      { title: "Business — Æther Wealth" },
      { name: "description", content: "Your business — valuation, financials, ownership and exit, in one private view." },
    ],
  }),
  component: BusinessRoute,
});

function BusinessRoute() {
  return (
    <RequireOnboarding>
      <UpgradeWall
        minTier="private"
        feature="Business Hub"
        description="Track your company's valuation, financials, ownership, and exit planning alongside personal wealth."
        perks={[
          "Live valuation with revenue, EBITDA, and multiples",
          "Cap table, equity grants, and ownership view",
          "Tax return parsing with AI",
          "Exit and succession planning timeline",
        ]}
      >
        <BusinessPage />
      </UpgradeWall>
    </RequireOnboarding>
  );
}

function BusinessPage() {
  const [state, setState] = useState<BusinessState>(() => loadBusiness());
  const [setupOpen, setSetupOpen] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);

  const navigate = useNavigate();
  const runClassify = useServerFn(classifyBusinessAccounts);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const off = subscribeBusiness(() => setState(loadBusiness()));
    return off;
  }, []);

  const isTestAccount = useIsTestAccount();

  useEffect(() => {
    // Test/reviewer accounts: always force-seed the rich demo dataset on first
    // visit per browser, even if a prior empty state was saved. This guarantees
    // App Review sees a fully populated business workspace.
    if (isTestAccount) {
      const SEED_FLAG = "aether.business.demo-seeded.v2";
      const alreadySeeded =
        typeof window !== "undefined" && window.localStorage.getItem(SEED_FLAG) === "1";
      if (!alreadySeeded || !state.setupComplete || !state.name) {
        const seeded = seedDemoBusiness();
        saveBusiness(seeded);
        setState(seeded);
        if (typeof window !== "undefined") window.localStorage.setItem(SEED_FLAG, "1");
      }
      return;
    }
    if (state.setupComplete) return;
    setSetupOpen(true);
  }, [state.setupComplete, state.name, isTestAccount]);

  const update = (patch: Partial<BusinessState> | ((s: BusinessState) => BusinessState)) => {
    setState((prev) => {
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      saveBusiness(next);
      return next;
    });
  };

  const syncFromBank = async () => {
    setSyncing(true);
    try {
      const res = await runClassify();
      if (!res.ok) {
        if (res.scannedAccountCount === 0) {
          toast.message("No connected bank accounts yet", {
            description: "Connect a bank in Connections, then sync here.",
            action: { label: "Open", onClick: () => navigate({ to: "/connections" }) },
          });
        } else {
          toast.error(res.error ?? "Sync failed");
        }
        return;
      }
      if (res.scannedAccountCount === 0) {
        toast.message("No connected bank accounts yet", {
          description: "Connect a bank in Connections, then sync here.",
          action: { label: "Open", onClick: () => navigate({ to: "/connections" }) },
        });
        return;
      }
      const business = res.classifications.filter((c) => c.isBusiness);
      if (business.length === 0) {
        update({ bankConnected: true, bankLastSync: new Date().toISOString() });
        toast.message("No business accounts detected", {
          description:
            "AI scanned your linked banks but none looked business-related. You can still add assets manually.",
        });
        return;
      }
      update((prev) => {
        // Drop any prior AI-sourced rows so re-syncing is idempotent.
        const manualAssets = prev.assets.filter((a) => a.source !== "ai");
        const manualLiabs = prev.liabilities.filter((l) => l.source !== "ai");
        const newAssets: BusinessAsset[] = [];
        const newLiabs: BusinessLiability[] = [];
        for (const c of business) {
          if (c.classification === "asset") {
            newAssets.push({
              id: `ai_${c.accountId}`,
              name: c.suggestedName,
              type: c.assetType ?? "Other",
              value: Math.max(0, Math.round(c.value)),
              source: "ai",
              aiAccountId: c.accountId,
              aiReasoning: c.reasoning,
            });
          } else if (c.classification === "liability") {
            newLiabs.push({
              id: `ai_${c.accountId}`,
              name: c.suggestedName,
              lender: c.liabilityType ?? "",
              balance: Math.max(0, Math.round(c.value)),
              monthlyPayment: 0,
              interestRate: 0,
              source: "ai",
              aiAccountId: c.accountId,
              aiReasoning: c.reasoning,
            });
          }
        }
        return {
          ...prev,
          assets: [...manualAssets, ...newAssets],
          liabilities: [...manualLiabs, ...newLiabs],
          bankConnected: true,
          bankLastSync: new Date().toISOString(),
        };
      });
      const aCount = business.filter((c) => c.classification === "asset").length;
      const lCount = business.filter((c) => c.classification === "liability").length;
      toast.success(
        `AI classified ${business.length} business account${business.length === 1 ? "" : "s"}`,
        { description: `${aCount} asset(s) · ${lCount} liability(ies)` },
      );
    } catch (e) {
      toast.error("Couldn't classify your business accounts.", { description: e instanceof Error ? e.message : "Please try again." });
    } finally {
      setSyncing(false);
    }
  };

  const valuationDeltaPct =
    state.valuationLastYear > 0
      ? ((state.valuation - state.valuationLastYear) / state.valuationLastYear) * 100
      : 0;

  const totalAssets = useMemo(
    () => state.assets.reduce((s, a) => s + a.value, 0),
    [state.assets],
  );
  const totalLiabilities = useMemo(
    () => state.liabilities.reduce((s, l) => s + l.balance, 0),
    [state.liabilities],
  );
  const equity = totalAssets - totalLiabilities;

  const allocTotal = Math.max(state.annualRevenue + totalAssets + totalLiabilities, 1);
  const alloc = [
    { key: "revenue", label: "Revenue", value: state.annualRevenue, dot: "bg-primary" },
    { key: "assets", label: "Assets", value: totalAssets, dot: "bg-violet-glow" },
    { key: "liabilities", label: "Liabilities", value: totalLiabilities, dot: "bg-gold" },
  ];

  return (
    <MobileShell>
      <div className="px-5 pt-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="label-mono">Business</p>
            <h1 className="font-serif text-2xl text-foreground">
              {state.name || "Your Business"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <HideToggle />
            <button
              onClick={() => setSetupOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
              aria-label="Edit business setup"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5">
        <LuxCard className="gradient-hero p-6">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-gold/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <p className="label-mono">Estimated Valuation</p>
              <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gold">
                {state.entityType}
              </span>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1 font-serif text-[44px] font-light leading-none text-foreground"
            >
              <MoneyText value={fmtCurrency(state.valuation)} />
            </motion.div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <DeltaPill value={valuationDeltaPct} label="vs last year" />
              <button
                onClick={() => setExplainerOpen(true)}
                className="flex items-center gap-1 rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <Info className="h-3 w-3" /> How is this calculated?
              </button>
            </div>

            <div className="mt-6">
              <div className="flex h-2 overflow-hidden rounded-full bg-white/5">
                {alloc.map((b, i) => (
                  <motion.div
                    key={b.key}
                    initial={{ width: 0 }}
                    animate={{ width: `${(b.value / allocTotal) * 100}%` }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className={b.dot}
                  />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {alloc.map((b) => (
                  <div key={b.key}>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${b.dot}`} />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {b.label}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-xs tabular-nums text-foreground">
                      <MoneyText value={fmtCurrency(b.value, { compact: true })} />
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-5 font-mono text-[10px] text-muted-foreground">
              Updated {new Date(state.updatedAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        </LuxCard>
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 pt-5">
        <MetricTile
          icon={TrendingUp}
          label="Annual Revenue"
          value={fmtCurrency(state.annualRevenue, { compact: true })}
          delta={`${state.revenueMoM >= 0 ? "+" : ""}${state.revenueMoM.toFixed(1)}% MoM`}
          deltaTone={state.revenueMoM >= 0 ? "up" : "down"}
          detail={
            <DetailGrid
              rows={[
                ["Monthly avg", fmtCurrency(state.annualRevenue / 12)],
                ["Last quarter", fmtCurrency((state.annualRevenue / 4) * 1.04)],
                ["YoY growth", "+12.4%"],
              ]}
            />
          }
        />
        <MetricTile
          icon={Wallet}
          label="Net Profit"
          value={fmtCurrency(state.netProfit, { compact: true })}
          delta={`${state.netProfitMargin.toFixed(0)}% margin`}
          deltaTone="neutral"
          detail={
            <DetailGrid
              rows={[
                ["Gross margin", `${(state.netProfitMargin + 22).toFixed(0)}%`],
                ["Operating margin", `${(state.netProfitMargin + 6).toFixed(0)}%`],
                ["EBITDA", fmtCurrency(state.netProfit * 1.18)],
              ]}
            />
          }
        />
        <MetricTile
          icon={Banknote}
          label="Total Assets"
          value={fmtCurrency(totalAssets, { compact: true })}
          delta={`${state.assets.length} items`}
          deltaTone="neutral"
          detail={
            <DetailGrid
              rows={state.assets.slice(0, 3).map((a) => [a.name, fmtCurrency(a.value)])}
              empty="Add an asset below"
            />
          }
        />
        <MetricTile
          icon={Receipt}
          label="Total Liabilities"
          value={fmtCurrency(totalLiabilities, { compact: true })}
          delta={`${state.liabilities.length} items`}
          deltaTone="neutral"
          detail={
            <DetailGrid
              rows={state.liabilities.slice(0, 3).map((l) => [l.name, fmtCurrency(l.balance)])}
              empty="Add a liability below"
            />
          }
        />
      </div>

      <div className="mt-8 px-5">
        <SectionHeader title="Financials" />
        <div className="space-y-3 pt-3">
          <LuxCard className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="label-mono">Revenue vs Expenses · 6 mo</p>
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] ${
                  state.cashFlow >= 0
                    ? "bg-success/15 text-success"
                    : "bg-destructive/15 text-destructive"
                }`}
              >
                {state.cashFlow >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                Cash flow {fmtCurrency(state.cashFlow, { compact: true })}
              </span>
            </div>
            <div className="h-44 w-full">
              {state.revenueHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={state.revenueHistory} barCategoryGap={10}>
                    <XAxis
                      dataKey="month"
                      stroke="oklch(0.66 0.03 280)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "oklch(1 0 0 / 0.04)" }}
                      contentStyle={{
                        background: "oklch(0.22 0.03 280)",
                        border: "1px solid oklch(1 0 0 / 0.08)",
                        borderRadius: "0.75rem",
                        fontSize: "11px",
                      }}
                      labelStyle={{ color: "oklch(0.96 0.01 280)", fontFamily: "JetBrains Mono" }}
                      formatter={(v) => fmtCurrency(Number(v) || 0, { compact: true })}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }}
                      iconType="circle"
                      iconSize={6}
                    />
                    <Bar dataKey="revenue" fill="oklch(0.68 0.13 295)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="oklch(0.82 0.12 85)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyInline label="No revenue history" />
              )}
            </div>
          </LuxCard>

          <div className="grid grid-cols-2 gap-3">
            <LuxCard className="p-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-warning" />
                <p className="label-mono">Next tax due</p>
              </div>
              {state.nextTaxDue ? (
                <>
                  <p className="mt-2 font-serif text-lg text-foreground">
                    {new Date(state.nextTaxDue).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <span className="mt-1 inline-flex rounded-full bg-warning/15 px-2 py-0.5 font-mono text-[10px] text-warning">
                    in {Math.max(0, Math.ceil((new Date(state.nextTaxDue).getTime() - Date.now()) / 86400000))} days
                  </span>
                </>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Set a date</p>
              )}
            </LuxCard>

            <LuxCard className="p-4">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                <p className="label-mono">Business bank</p>
              </div>
              {state.bankConnected && state.bankLastSync ? (
                <>
                  <p className="mt-2 font-serif text-sm text-foreground">AI synced</p>
                  <p className="mt-1 font-mono text-[10px] text-success">
                    {new Date(state.bankLastSync).toLocaleDateString()}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Auto-detect business assets &amp; debts
                </p>
              )}
              <button
                onClick={syncFromBank}
                disabled={syncing}
                className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-medium text-primary disabled:opacity-50"
              >
                {syncing ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {state.bankConnected ? "Re-sync" : "Sync from bank"}
              </button>
            </LuxCard>
          </div>


          <LuxCard className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-gold text-xs font-semibold text-background">
                  {state.cpa?.name ? initials(state.cpa.name) : "+"}
                </div>
                <div>
                  <p className="label-mono">CPA on file</p>
                  {state.cpa ? (
                    <>
                      <p className="font-serif text-base text-foreground">{state.cpa.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {state.cpa.firm} · {state.cpa.contact}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">No CPA on file</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  const name = prompt("CPA name", state.cpa?.name ?? "");
                  if (!name) return;
                  const firm = prompt("Firm", state.cpa?.firm ?? "") ?? "";
                  const contact = prompt("Email or phone", state.cpa?.contact ?? "") ?? "";
                  update({ cpa: { name, firm, contact } });
                }}
                className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[11px] text-foreground"
              >
                {state.cpa ? "Edit" : "Add"}
              </button>
            </div>
          </LuxCard>
        </div>
      </div>

      <div className="mt-8 px-5">
        <SectionHeader title="Assets & Liabilities" />
        <div className="space-y-5 pt-3">
          <AssetsBlock state={state} update={update} />
          <LiabilitiesBlock state={state} update={update} />
          <LuxCard className="gradient-hero p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="label-mono">Net Business Equity</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Feeds your total net worth
                </p>
              </div>
              <p
                className={`font-serif text-2xl ${equity >= 0 ? "text-foreground" : "text-destructive"}`}
              >
                <MoneyText value={fmtCurrency(equity)} />
              </p>
            </div>
          </LuxCard>
        </div>
      </div>

      <div className="mt-8 px-5">
        <SectionHeader title="Ownership" />
        <div className="space-y-3 pt-3">
          <OwnershipBlock state={state} update={update} />
        </div>
      </div>

      <div className="mt-8 px-5">
        <SectionHeader title="Insurance" />
        <div className="space-y-3 pt-3">
          <InsuranceBlock state={state} update={update} />
        </div>
      </div>

      <div className="mt-8 px-5">
        <SectionHeader title="Legacy & Exit" />
        <div className="pt-3">
          <LegacyExitHubCard state={state} update={update} />
        </div>
      </div>

      <div className="mt-8 px-5" data-section="documents">
        <SectionHeader title="Documents" />
        <div className="space-y-3 pt-3">
          <DocumentsBlock state={state} update={update} />
        </div>
      </div>

      <BusinessQuickSetup
        open={setupOpen}
        onClose={() => state.setupComplete && setSetupOpen(false)}
        onComplete={() => setSetupOpen(false)}
      />

      <ExplainerSheet open={explainerOpen} onClose={() => setExplainerOpen(false)} />
    </MobileShell>
  );
}

function DeltaPill({ value, label }: { value: number; label?: string }) {
  const positive = value >= 0;
  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${
        positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
      }`}
    >
      {positive ? (
        <ArrowUpRight className="h-3 w-3" strokeWidth={2.4} />
      ) : (
        <ArrowDownRight className="h-3 w-3" strokeWidth={2.4} />
      )}
      <span className="font-mono text-[11px]">{fmtPct(value)}</span>
      {label && <span className="font-mono text-[10px] opacity-70">{label}</span>}
    </span>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  delta,
  deltaTone,
  detail,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  delta: string;
  deltaTone: "up" | "down" | "neutral";
  detail: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const tone =
    deltaTone === "up"
      ? "text-success"
      : deltaTone === "down"
        ? "text-destructive"
        : "text-muted-foreground";
  return (
    <LuxCard
      className={`overflow-hidden ${open ? "col-span-2" : ""}`}
      onClick={() => setOpen((v) => !v)}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <Icon className="h-4 w-4 text-primary" />
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
        <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-serif text-xl text-foreground">
          <MoneyText value={value} fallback="••••" />
        </p>
        <p className={`mt-1 font-mono text-[10px] ${tone}`}>{delta}</p>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.06] px-4 py-3">{detail}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </LuxCard>
  );
}

function DetailGrid({ rows, empty }: { rows: Array<[string, string]>; empty?: string }) {
  if (rows.length === 0) {
    return <p className="text-center text-[11px] text-muted-foreground">{empty ?? "—"}</p>;
  }
  return (
    <div className="space-y-1.5">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{k}</span>
          <span className="font-mono text-[11px] tabular-nums text-foreground">
            <MoneyText value={v} />
          </span>
        </div>
      ))}
    </div>
  );
}

function AssetsBlock({
  state,
  update,
}: {
  state: BusinessState;
  update: (p: (s: BusinessState) => BusinessState) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const addAsset = () => {
    const a = makeAsset({ name: "New asset", value: 0 });
    update((s) => ({ ...s, assets: [...s.assets, a] }));
    setOpenId(a.id);
  };
  const editField = <K extends keyof BusinessAsset>(id: string, field: K, value: BusinessAsset[K]) => {
    update((s) => ({
      ...s,
      assets: s.assets.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    }));
  };
  const remove = (id: string) =>
    update((s) => ({ ...s, assets: s.assets.filter((a) => a.id !== id) }));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-medium text-muted-foreground">Assets</p>
        <span className="font-mono text-[10px] text-muted-foreground">
          {state.assets.length} items
        </span>
      </div>
      {state.assets.length === 0 ? (
        <EmptyState
          icon={Building2}
          line="Add equipment, real estate, receivables, or inventory."
          cta="Add Asset"
          onClick={addAsset}
        />
      ) : (
        <div className="space-y-2">
          {state.assets.map((a) => {
            const isOpen = openId === a.id;
            return (
              <LuxCard key={a.id} className="overflow-hidden">
                <button
                  onClick={() => setOpenId(isOpen ? null : a.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-sm text-foreground">{a.name}</p>
                    <span className="rounded-full bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      {a.type}
                    </span>
                  </div>
                  <p className="font-mono text-sm tabular-nums text-foreground">
                    <MoneyText value={fmtCurrency(a.value, { compact: true })} />
                  </p>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 border-t border-white/[0.06] px-4 py-4">
                        <InlineField label="Name">
                          <input
                            value={a.name}
                            onChange={(e) => editField(a.id, "name", e.target.value)}
                            className="luxe-input"
                          />
                        </InlineField>
                        <InlineField label="Type">
                          <select
                            value={a.type}
                            onChange={(e) =>
                              editField(a.id, "type", e.target.value as BusinessAsset["type"])
                            }
                            className="luxe-input"
                          >
                            {(["Equipment", "Real Estate", "Receivables", "Inventory", "Other"] as const).map(
                              (t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ),
                            )}
                          </select>
                        </InlineField>
                        <InlineField label="Value (USD)">
                          <input
                            inputMode="numeric"
                            value={a.value}
                            onChange={(e) =>
                              editField(a.id, "value", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)
                            }
                            className="luxe-input font-mono tabular-nums"
                          />
                        </InlineField>
                        <button
                          onClick={() => remove(a.id)}
                          className="flex items-center gap-1.5 text-[11px] text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </LuxCard>
            );
          })}
        </div>
      )}
      {state.assets.length > 0 && <AddBtn onClick={addAsset}>Add Asset</AddBtn>}
    </div>
  );
}

function LiabilitiesBlock({
  state,
  update,
}: {
  state: BusinessState;
  update: (p: (s: BusinessState) => BusinessState) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const add = () => {
    const l = makeLiability({ name: "New liability" });
    update((s) => ({ ...s, liabilities: [...s.liabilities, l] }));
    setOpenId(l.id);
  };
  const editField = <K extends keyof BusinessLiability>(
    id: string,
    field: K,
    value: BusinessLiability[K],
  ) => {
    update((s) => ({
      ...s,
      liabilities: s.liabilities.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    }));
  };
  const remove = (id: string) =>
    update((s) => ({ ...s, liabilities: s.liabilities.filter((l) => l.id !== id) }));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-medium text-muted-foreground">Liabilities</p>
        <span className="font-mono text-[10px] text-muted-foreground">
          {state.liabilities.length} items
        </span>
      </div>
      {state.liabilities.length === 0 ? (
        <EmptyState
          icon={Receipt}
          line="Track loans, credit lines and payables."
          cta="Add Liability"
          onClick={add}
        />
      ) : (
        <div className="space-y-2">
          {state.liabilities.map((l) => {
            const isOpen = openId === l.id;
            return (
              <LuxCard key={l.id} className="overflow-hidden">
                <button
                  onClick={() => setOpenId(isOpen ? null : l.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/15">
                    <Receipt className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-sm text-foreground">{l.name}</p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">
                      {l.lender || "—"} · {l.interestRate.toFixed(2)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm tabular-nums text-foreground">
                      <MoneyText value={fmtCurrency(l.balance, { compact: true })} />
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {fmtCurrency(l.monthlyPayment)}/mo
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-3 border-t border-white/[0.06] px-4 py-4">
                        <InlineField label="Name">
                          <input
                            value={l.name}
                            onChange={(e) => editField(l.id, "name", e.target.value)}
                            className="luxe-input"
                          />
                        </InlineField>
                        <InlineField label="Lender">
                          <input
                            value={l.lender}
                            onChange={(e) => editField(l.id, "lender", e.target.value)}
                            className="luxe-input"
                          />
                        </InlineField>
                        <InlineField label="Balance">
                          <input
                            inputMode="numeric"
                            value={l.balance}
                            onChange={(e) =>
                              editField(l.id, "balance", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)
                            }
                            className="luxe-input font-mono"
                          />
                        </InlineField>
                        <InlineField label="Monthly">
                          <input
                            inputMode="numeric"
                            value={l.monthlyPayment}
                            onChange={(e) =>
                              editField(
                                l.id,
                                "monthlyPayment",
                                Number(e.target.value.replace(/[^0-9]/g, "")) || 0,
                              )
                            }
                            className="luxe-input font-mono"
                          />
                        </InlineField>
                        <InlineField label="Interest %">
                          <input
                            inputMode="decimal"
                            value={l.interestRate}
                            onChange={(e) =>
                              editField(l.id, "interestRate", Number(e.target.value) || 0)
                            }
                            className="luxe-input font-mono"
                          />
                        </InlineField>
                        <div className="col-span-2">
                          <button
                            onClick={() => remove(l.id)}
                            className="flex items-center gap-1.5 text-[11px] text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </LuxCard>
            );
          })}
        </div>
      )}
      {state.liabilities.length > 0 && <AddBtn onClick={add}>Add Liability</AddBtn>}
    </div>
  );
}

function OwnershipBlock({
  state,
  update,
}: {
  state: BusinessState;
  update: (p: (s: BusinessState) => BusinessState) => void;
}) {
  const partnersTotal = state.ownership.partners.reduce((s, p) => s + (p.pct || 0), 0);
  const yourPct = Math.max(0, 100 - partnersTotal);

  const storedYourPct = state.ownership.yourPct;
  useEffect(() => {
    if (storedYourPct !== yourPct) {
      update((s) => ({ ...s, ownership: { ...s.ownership, yourPct } }));
    }
  }, [partnersTotal, storedYourPct, yourPct, update]);

  const addPartner = () => {
    const p = makePartner({ name: "New partner", pct: 0 });
    update((s) => ({ ...s, ownership: { ...s.ownership, partners: [...s.ownership.partners, p] } }));
  };
  const editPartner = <K extends keyof Partner>(id: string, field: K, value: Partner[K]) => {
    update((s) => ({
      ...s,
      ownership: {
        ...s.ownership,
        partners: s.ownership.partners.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
      },
    }));
  };
  const removePartner = (id: string) =>
    update((s) => ({
      ...s,
      ownership: { ...s.ownership, partners: s.ownership.partners.filter((p) => p.id !== id) },
    }));

  const addRound = () => {
    const r = makeFundingRound({ label: "Series A", amount: 0, valuation: 0 });
    update((s) => ({ ...s, ownership: { ...s.ownership, funding: [...s.ownership.funding, r] } }));
  };
  const editRound = <K extends keyof FundingRound>(
    id: string,
    field: K,
    value: FundingRound[K],
  ) => {
    update((s) => ({
      ...s,
      ownership: {
        ...s.ownership,
        funding: s.ownership.funding.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
      },
    }));
  };
  const removeRound = (id: string) =>
    update((s) => ({
      ...s,
      ownership: { ...s.ownership, funding: s.ownership.funding.filter((r) => r.id !== id) },
    }));

  const segments: Array<{ key: string; label: string; pct: number; color: string }> = [
    { key: "you", label: "You", pct: yourPct, color: "bg-primary" },
    ...state.ownership.partners.map((p, i) => ({
      key: p.id,
      label: p.name || `Partner ${i + 1}`,
      pct: p.pct,
      color: i % 2 === 0 ? "bg-violet-glow" : "bg-gold",
    })),
  ];

  return (
    <>
      <LuxCard className="p-5">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="label-mono">Your ownership</p>
            <p className="mt-1 font-serif text-[40px] leading-none text-foreground">
              {yourPct.toFixed(1)}%
            </p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              Stake value{" "}
              <MoneyText value={fmtCurrency((yourPct / 100) * state.valuation)} />
            </p>
          </div>
          <Crown className="h-6 w-6 text-gold" />
        </div>

        <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-white/5">
          {segments.map((seg, i) => (
            <motion.div
              key={seg.key}
              initial={{ width: 0 }}
              animate={{ width: `${seg.pct}%` }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.6 }}
              className={seg.color}
              title={`${seg.label} · ${seg.pct.toFixed(1)}%`}
            />
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {state.ownership.partners.length === 0 ? (
            <p className="text-center text-[11px] text-muted-foreground">No partners yet</p>
          ) : (
            state.ownership.partners.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={p.name}
                  onChange={(e) => editPartner(p.id, "name", e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground focus:outline-none"
                  placeholder="Partner name"
                />
                <input
                  inputMode="decimal"
                  value={p.pct}
                  onChange={(e) => editPartner(p.id, "pct", Number(e.target.value) || 0)}
                  className="w-16 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-right font-mono text-xs tabular-nums text-foreground focus:outline-none"
                />
                <span className="font-mono text-[10px] text-muted-foreground">%</span>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {fmtCurrency((p.pct / 100) * state.valuation, { compact: true })}
                </span>
                <button onClick={() => removePartner(p.id)} className="text-muted-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={addPartner}
            className="flex-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] text-foreground"
          >
            <Plus className="mr-1 inline h-3 w-3" />
            Add Partner
          </button>
          <button
            onClick={addRound}
            className="flex-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] text-foreground"
          >
            <Plus className="mr-1 inline h-3 w-3" />
            Add Funding
          </button>
        </div>
      </LuxCard>

      {state.ownership.vesting && (
        <LuxCard className="p-4">
          <p className="label-mono">Vesting schedule</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full gradient-violet"
              style={{ width: `${state.ownership.vesting.progressPct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
            <span>Cliff {state.ownership.vesting.cliffDate}</span>
            <span>{state.ownership.vesting.progressPct}%</span>
            <span>Full {state.ownership.vesting.fullVestDate}</span>
          </div>
        </LuxCard>
      )}

      {state.ownership.funding.length > 0 && (
        <LuxCard className="p-4">
          <p className="label-mono mb-2">Funding history</p>
          <div className="space-y-2">
            {state.ownership.funding.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <input
                  value={r.label}
                  onChange={(e) => editRound(r.id, "label", e.target.value)}
                  className="w-20 bg-transparent text-sm text-foreground focus:outline-none"
                />
                <input
                  type="date"
                  value={r.date}
                  onChange={(e) => editRound(r.id, "date", e.target.value)}
                  className="bg-transparent font-mono text-[10px] text-muted-foreground focus:outline-none"
                />
                <input
                  inputMode="numeric"
                  value={r.amount}
                  onChange={(e) =>
                    editRound(r.id, "amount", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)
                  }
                  placeholder="Amount"
                  className="min-w-0 flex-1 bg-transparent text-right font-mono text-xs tabular-nums text-foreground focus:outline-none"
                />
                <span className="font-mono text-[10px] text-muted-foreground">@</span>
                <input
                  inputMode="numeric"
                  value={r.valuation}
                  onChange={(e) =>
                    editRound(r.id, "valuation", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)
                  }
                  placeholder="Valuation"
                  className="w-24 bg-transparent text-right font-mono text-xs tabular-nums text-foreground focus:outline-none"
                />
                <button onClick={() => removeRound(r.id)} className="text-muted-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </LuxCard>
      )}
    </>
  );
}

function InsuranceBlock({
  state,
  update,
}: {
  state: BusinessState;
  update: (p: (s: BusinessState) => BusinessState) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const add = (parsed = false) => {
    const ins = makeInsurance({
      type: "Liability",
      insurer: parsed ? "Hartford" : "",
      coverage: parsed ? 2_000_000 : 0,
      premium: parsed ? 4800 : 0,
      premiumFreq: "annual",
      status: "active",
      renewalDate: parsed ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 200).toISOString().slice(0, 10) : null,
      parsedByAI: parsed,
    });
    update((s) => ({ ...s, insurance: [...s.insurance, ins] }));
    setOpenId(ins.id);
  };

  const editField = <K extends keyof BusinessInsurance>(
    id: string,
    field: K,
    value: BusinessInsurance[K],
  ) => {
    update((s) => ({
      ...s,
      insurance: s.insurance.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    }));
  };
  const remove = (id: string) =>
    update((s) => ({ ...s, insurance: s.insurance.filter((i) => i.id !== id) }));

  if (state.insurance.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        line="Add Key Person, Liability, D&O or Business Interruption coverage."
        cta="Upload Policy PDF"
        onClick={() => add(true)}
        secondaryCta="Add Manually"
        onSecondary={() => add(false)}
      />
    );
  }

  return (
    <>
      <div className="space-y-2">
        {state.insurance.map((i) => {
          const isOpen = openId === i.id;
          return (
            <LuxCard key={i.id} className="overflow-hidden">
              <button
                onClick={() => setOpenId(isOpen ? null : i.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-violet">
                  <ShieldCheck className="h-4 w-4 text-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-serif text-sm text-foreground">{i.type}</p>
                    <span
                      className={`rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                        i.status === "active"
                          ? "bg-success/15 text-success"
                          : i.status === "renewal due"
                            ? "bg-warning/15 text-warning"
                            : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {i.status}
                    </span>
                    {i.parsedByAI && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 font-mono text-[9px] text-primary">
                        <Sparkles className="h-2.5 w-2.5" /> AI
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {i.insurer || "—"}
                    {i.renewalDate && ` · renews ${i.renewalDate}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm tabular-nums text-foreground">
                    <MoneyText value={fmtCurrency(i.coverage, { compact: true })} />
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    ${i.premium}/{i.premiumFreq.slice(0, 2)}
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-3 border-t border-white/[0.06] px-4 py-4">
                      <InlineField label="Type">
                        <select
                          value={i.type}
                          onChange={(e) =>
                            editField(i.id, "type", e.target.value as BusinessInsurance["type"])
                          }
                          className="luxe-input"
                        >
                          {(["Key Person", "Liability", "D&O", "Business Interruption"] as const).map(
                            (t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ),
                          )}
                        </select>
                      </InlineField>
                      <InlineField label="Insurer">
                        <input
                          value={i.insurer}
                          onChange={(e) => editField(i.id, "insurer", e.target.value)}
                          className="luxe-input"
                        />
                      </InlineField>
                      <InlineField label="Coverage">
                        <input
                          inputMode="numeric"
                          value={i.coverage}
                          onChange={(e) =>
                            editField(i.id, "coverage", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)
                          }
                          className="luxe-input font-mono"
                        />
                      </InlineField>
                      <InlineField label="Premium">
                        <input
                          inputMode="numeric"
                          value={i.premium}
                          onChange={(e) =>
                            editField(i.id, "premium", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)
                          }
                          className="luxe-input font-mono"
                        />
                      </InlineField>
                      <InlineField label="Renewal">
                        <input
                          type="date"
                          value={i.renewalDate ?? ""}
                          onChange={(e) => editField(i.id, "renewalDate", e.target.value || null)}
                          className="luxe-input"
                        />
                      </InlineField>
                      <InlineField label="Status">
                        <select
                          value={i.status}
                          onChange={(e) =>
                            editField(i.id, "status", e.target.value as BusinessInsurance["status"])
                          }
                          className="luxe-input"
                        >
                          <option value="active">active</option>
                          <option value="renewal due">renewal due</option>
                          <option value="expired">expired</option>
                        </select>
                      </InlineField>
                      <div className="col-span-2 flex gap-2">
                        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] text-foreground">
                          <FileText className="h-3.5 w-3.5" /> View Policy
                        </button>
                        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-full gradient-violet px-3 py-2 text-[11px] font-medium text-foreground glow-violet">
                          File Claim
                        </button>
                      </div>
                      <button
                        onClick={() => remove(i.id)}
                        className="col-span-2 flex items-center gap-1.5 text-[11px] text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete policy
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </LuxCard>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => add(true)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-2.5 text-[11px] font-medium text-primary"
        >
          <Sparkles className="h-3.5 w-3.5" /> Upload Policy PDF
        </button>
        <button
          onClick={() => add(false)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-[11px] text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Add Manually
        </button>
      </div>
    </>
  );
}

function LegacyExitHubCard({
  state,
  update,
}: {
  state: BusinessState;
  update: (p: (s: BusinessState) => BusinessState) => void;
}) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  const successionReady = computeSuccessionReadiness(state);
  const exitReady = computeExitReadiness(state);
  const combined = Math.round((successionReady + exitReady) / 2);
  const action = nextTransitionAction(state);

  const started = state.succession.wizardStep && state.succession.wizardStep > 1;
  const completed = !!state.succession.wizardCompleted;
  const status = completed ? "Plan complete" : started ? "In progress" : "Not started";
  const statusTone = completed
    ? "bg-success/15 text-success"
    : started
      ? "bg-warning/15 text-warning"
      : "bg-muted/40 text-muted-foreground";

  const horizon = dateToHorizon(state.exit.targetDate);
  const horizonLabel =
    horizon === "<2y" ? "Within 2 years"
      : horizon === "3-5y" ? "in 3 – 5 years"
        : horizon === "5-10y" ? "in 5 – 10 years"
          : horizon === "10y+" ? "10+ years out"
            : "Timeline TBD";

  function openWizard(step: number | "documents" | "support") {
    if (step === "documents") {
      const el = document.querySelector('[data-section="documents"]');
      if (el) (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (step === "support") {
      window.location.href = "/support";
      return;
    }
    setWizardStep(step);
    setWizardOpen(true);
  }

  return (
    <>
      <LuxCard className="overflow-hidden">
        {/* Hero band */}
        <div className="relative px-5 pt-5 pb-4">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <div className="mb-3 flex items-center justify-between">
              <p className="label-mono">Legacy & Exit</p>
              <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${statusTone}`}>{status}</span>
            </div>
            <p className="font-serif text-lg leading-tight text-foreground">
              {completed || started
                ? <>Your business is <span className="text-gradient-violet">{combined}% ready</span> for a smooth transition</>
                : <>Plan your transition in <span className="text-gradient-violet">5 quick steps</span></>}
            </p>
            {(completed || started) && (
              <p className="mt-1 text-[12px] text-muted-foreground">
                {state.exit.strategy ? `${labelForStrategyShort(state.exit.strategy)} · ${horizonLabel}` : horizonLabel}
              </p>
            )}
          </div>

          {/* Readiness rings */}
          <div className="relative mt-5 flex items-center justify-around">
            <ReadinessRing value={successionReady} label="Succession" tone="violet" />
            <ReadinessRing value={exitReady} label="Exit" tone="gold" />
          </div>
        </div>

        {/* Summary chips when started */}
        {(started || completed) && (
          <div className="grid grid-cols-2 gap-px border-t border-white/[0.04] bg-white/[0.02]">
            <SummaryChip
              label="Target"
              value={state.exit.targetValuation > 0 ? fmtCurrency(state.exit.targetValuation, { compact: true }) : "—"}
            />
            <SummaryChip
              label="Successor"
              value={state.succession.successorName || "Not chosen"}
            />
          </div>
        )}

        {/* Next action CTA */}
        <div className="border-t border-white/[0.04] p-4">
          <button
            type="button"
            onClick={() => openWizard(action.target)}
            className="flex w-full items-center justify-between rounded-2xl gradient-violet px-4 py-3.5 text-left glow-violet"
          >
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-wider text-foreground/70">Next step</p>
              <p className="truncate text-sm text-foreground">{action.label}</p>
              <p className="truncate text-[11px] text-foreground/70">{action.helper}</p>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-foreground" />
          </button>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => openWizard(started ? 5 : 1)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] py-2.5 text-[11px] text-foreground"
            >
              {started ? <><Pencil className="h-3.5 w-3.5" /> Edit plan</> : <><Sparkles className="h-3.5 w-3.5" /> Start the wizard</>}
            </button>
            <button
              type="button"
              onClick={() => openWizard(5)}
              className="flex items-center justify-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-[11px] text-muted-foreground"
              disabled={!started && !completed}
            >
              Recap
            </button>
          </div>
        </div>
      </LuxCard>

      <TransitionPlanWizard
        open={wizardOpen}
        initialStep={wizardStep}
        state={state}
        update={update}
        onClose={() => setWizardOpen(false)}
      />
    </>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/40 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-[13px] text-foreground">{value}</p>
    </div>
  );
}

function labelForStrategyShort(s: ExitStrategy): string {
  if (s === "M&A") return "Sale to another company";
  if (s === "Family Transfer") return "Pass to family";
  if (s === "MBO") return "Sell to your team";
  return "IPO";
}

function DocumentsBlock({
  state,
  update,
}: {
  state: BusinessState;
  update: (p: (s: BusinessState) => BusinessState) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewDraft, setReviewDraft] = useState<TaxReturnReviewDraft | null>(null);
  const [reviewFileName, setReviewFileName] = useState<string | undefined>();
  const [reviewSources, setReviewSources] = useState<TaxReturnReviewSource[] | undefined>();
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Array<{ name: string }>>([]);

  const totalAssets = state.assets.reduce((s, a) => s + a.value, 0);
  const totalLiabilities = state.liabilities.reduce((s, l) => s + l.balance, 0);

  const remove = (id: string) =>
    update((s) => ({ ...s, documents: s.documents.filter((d) => d.id !== id) }));
  const editField = <K extends keyof BusinessDocument>(
    id: string,
    field: K,
    value: BusinessDocument[K],
  ) => {
    update((s) => ({
      ...s,
      documents: s.documents.map((d) => (d.id === id ? { ...d, [field]: value } : d)),
    }));
  };

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    if (files.length > 8) {
      setParseStatus("Up to 8 files per upload");
      return;
    }
    const oversized = files.find((f) => f.size > 8 * 1024 * 1024);
    if (oversized) {
      setParseStatus(`"${oversized.name}" exceeds 8 MB`);
      return;
    }
    setParsing(true);
    setParseStatus(
      files.length > 1 ? `Reading ${files.length} files…` : "Reading file…",
    );
    try {
      const payloads = await Promise.all(
        files.map(async (file) => ({
          fileName: file.name,
          base64: await fileToBase64(file),
          mimeType: file.type || "application/pdf",
        })),
      );
      setParseStatus(
        files.length > 1
          ? `AI extracting & aggregating ${files.length} documents…`
          : "AI extracting financials…",
      );
      const parsed = await parseTaxReturnDocuments({ data: { files: payloads } });

      const fallbackName = files[0].name.replace(/\.[^.]+$/, "");
      let draft: TaxReturnReviewDraft;
      let sources: TaxReturnReviewSource[] = [];

      if (!parsed.ok || !parsed.aggregated) {
        draft = {
          form_type: "other",
          tax_year: null,
          business_name: fallbackName,
          revenue: null,
          net_profit: null,
          total_assets: null,
          total_liabilities: null,
          cost_of_goods_sold: null,
          total_expenses: null,
          depreciation: null,
          officer_compensation: null,
          notes: parsed.error ?? "AI could not extract values — review manually.",
          parsed_by_ai: false,
          apply: { revenue: false, net_profit: false, total_assets: false, total_liabilities: false },
        };
        sources = parsed.aggregated?.sources ?? [];
        setParseStatus(parsed.error ?? "AI parse failed — review manually");
      } else {
        const e = parsed.aggregated;
        draft = {
          form_type: e.form_type ?? "other",
          tax_year: e.tax_year ?? null,
          business_name: e.business_name ?? fallbackName,
          revenue: e.revenue ?? null,
          net_profit: e.net_profit ?? null,
          total_assets: e.total_assets ?? null,
          total_liabilities: e.total_liabilities ?? null,
          cost_of_goods_sold: e.cost_of_goods_sold ?? null,
          total_expenses: e.total_expenses ?? null,
          depreciation: e.depreciation ?? null,
          officer_compensation: e.officer_compensation ?? null,
          notes: e.notes ?? null,
          parsed_by_ai: true,
          apply: {
            revenue: e.revenue != null,
            net_profit: e.net_profit != null,
            total_assets: e.total_assets != null,
            total_liabilities: e.total_liabilities != null,
          },
        };
        sources = e.sources ?? [];
        setParseStatus(null);
      }

      setPendingFiles(files.map((f) => ({ name: f.name })));
      setReviewDraft(draft);
      setReviewFileName(
        files.length === 1
          ? files[0].name
          : `${files.length} documents · ${files[0].name}`,
      );
      setReviewSources(sources.length > 0 ? sources : undefined);
      setReviewError(null);
      setReviewOpen(true);
    } catch (err) {
      setParseStatus(err instanceof Error ? err.message : "Failed to process files");
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmApply = (draft: TaxReturnReviewDraft) => {
    update((s) => {
      let next: BusinessState = { ...s };

      // Apply selected scalar financials
      if (draft.apply.revenue && draft.revenue != null) {
        const newRev = draft.revenue;
        const prevRev = next.annualRevenue;
        const mom = prevRev > 0 ? ((newRev - prevRev) / prevRev) * 100 : next.revenueMoM;
        next = { ...next, annualRevenue: newRev, revenueMoM: Number(mom.toFixed(2)) };
      }
      if (draft.apply.net_profit && draft.net_profit != null) {
        const np = draft.net_profit;
        const refRevenue = draft.apply.revenue && draft.revenue != null ? draft.revenue : next.annualRevenue;
        const margin = refRevenue > 0 ? (np / refRevenue) * 100 : next.netProfitMargin;
        next = { ...next, netProfit: np, netProfitMargin: Number(margin.toFixed(1)) };
      }

      // For total assets/liabilities, replace any prior tax-return roll-up line
      // and add a single fresh line so user-managed items are preserved.
      const yearLabel = draft.tax_year ? ` ${draft.tax_year}` : "";
      const taxAssetMarker = "Tax Return — Assets";
      const taxLiabMarker = "Tax Return — Liabilities";

      if (draft.apply.total_assets && draft.total_assets != null) {
        const stripped = next.assets.filter((a) => !a.name.startsWith(taxAssetMarker));
        const userTotal = stripped.reduce((s, a) => s + a.value, 0);
        const delta = Math.max(0, draft.total_assets - userTotal);
        const line = makeAsset({
          name: `${taxAssetMarker}${yearLabel}`,
          type: "Other",
          value: delta,
        });
        next = { ...next, assets: [...stripped, line] };
      }
      if (draft.apply.total_liabilities && draft.total_liabilities != null) {
        const stripped = next.liabilities.filter((l) => !l.name.startsWith(taxLiabMarker));
        const userTotal = stripped.reduce((s, l) => s + l.balance, 0);
        const delta = Math.max(0, draft.total_liabilities - userTotal);
        const line = makeLiability({
          name: `${taxLiabMarker}${yearLabel}`,
          lender: "Per tax return",
          balance: delta,
        });
        next = { ...next, liabilities: [...stripped, line] };
      }

      // File every uploaded source document in the documents list. Schedules go
      // in as "Tax Return" too — they're part of the return package.
      const docsToAdd = pendingFiles.map((f) =>
        makeDocument({
          name: f.name || "Tax Return.pdf",
          category: "Tax Return",
          status: "current",
        }),
      );
      next = { ...next, documents: [...next.documents, ...docsToAdd] };

      return next;
    });

    setReviewOpen(false);
    setReviewDraft(null);
    setReviewSources(undefined);
    setPendingFiles([]);
    setParseStatus("Applied to your business");
    window.setTimeout(() => setParseStatus(null), 2500);
  };

  const handleCloseReview = () => {
    setReviewOpen(false);
    setReviewDraft(null);
    setReviewSources(undefined);
    setPendingFiles([]);
    setReviewError(null);
  };

  const triggerUpload = () => fileRef.current?.click();

  const addManual = () => {
    const name = prompt("Document name", "Operating Agreement.pdf");
    if (!name) return;
    const d = makeDocument({ name, category: "Operating Agreement" });
    update((s) => ({ ...s, documents: [...s.documents, d] }));
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const fs = Array.from(e.target.files ?? []);
          if (fs.length > 0) handleFiles(fs);
          e.target.value = "";
        }}
      />

      <LuxCard className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-gold">
            <Wand2 className="h-4 w-4 text-background" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-base text-foreground">Upload tax return &amp; schedules</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              Drop the main return plus any schedules (Schedule C, L, K-1, E, Form 4562). AI
              extracts and aggregates them — you review every value before anything is applied.
            </p>
          </div>
        </div>
        <button
          onClick={triggerUpload}
          disabled={parsing}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground glow-violet disabled:opacity-50"
        >
          {parsing ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> {parseStatus ?? "Working…"}
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" /> Upload &amp; AI parse
            </>
          )}
        </button>
        {!parsing && parseStatus && (
          <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
            {parseStatus}
          </p>
        )}
      </LuxCard>

      {state.documents.length > 0 ? (
        <div className="space-y-2 pt-2">
          {state.documents.map((d) => (
            <LuxCard key={d.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15">
                  <FileText className="h-4 w-4 text-gold" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-sm text-foreground">{d.name}</p>
                  <select
                    value={d.category}
                    onChange={(e) =>
                      editField(d.id, "category", e.target.value as BusinessDocument["category"])
                    }
                    className="bg-transparent font-mono text-[10px] text-muted-foreground focus:outline-none"
                  >
                    {(["Articles of Incorporation", "Operating Agreement", "Tax Return", "Buy-Sell Agreement", "Succession Plan", "Exit Planning", "Other"] as const).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <span
                  className={`rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase ${
                    d.status === "current"
                      ? "bg-success/15 text-success"
                      : d.status === "review"
                        ? "bg-warning/15 text-warning"
                        : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {d.status}
                </span>
                <button onClick={() => remove(d.id)} className="text-muted-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </LuxCard>
          ))}
        </div>
      ) : (
        <p className="px-1 pt-2 text-center text-[11px] text-muted-foreground">
          Vault for formation docs, tax returns, agreements and exit plans.
        </p>
      )}

      <button
        onClick={addManual}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] py-2.5 text-[11px] text-foreground"
      >
        <Plus className="h-3.5 w-3.5" /> Add document manually
      </button>

      <TaxReturnReviewModal
        open={reviewOpen}
        initial={reviewDraft}
        fileName={reviewFileName}
        sources={reviewSources}
        current={{
          annualRevenue: state.annualRevenue,
          netProfit: state.netProfit,
          totalAssets,
          totalLiabilities,
        }}
        onClose={handleCloseReview}
        onSave={handleConfirmApply}
        error={reviewError}
      />
    </>
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

function ExplainerSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[430px] rounded-t-3xl border-t border-white/[0.06] gradient-card p-6 pb-8"
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/10" />
            <h3 className="font-serif text-xl text-foreground">How valuation is calculated</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              We use a blended approach, weighted by signal quality:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-foreground">
              <li>
                <span className="font-mono text-xs text-primary">·</span> Revenue multiple — sector
                benchmark applied to your annual revenue
              </li>
              <li>
                <span className="font-mono text-xs text-primary">·</span> Asset-based — total
                business assets minus liabilities
              </li>
              <li>
                <span className="font-mono text-xs text-primary">·</span> Last funding round, when
                available, anchors the upper bound
              </li>
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Your number updates as financials, assets and liabilities change.
            </p>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-full gradient-violet py-2.5 text-sm font-medium text-foreground glow-violet"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InlineField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function AddBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] py-2.5 text-[11px] text-foreground"
    >
      <Plus className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

function EmptyState({
  icon: Icon,
  line,
  cta,
  onClick,
  secondaryCta,
  onSecondary,
}: {
  icon: typeof Briefcase;
  line: string;
  cta: string;
  onClick: () => void;
  secondaryCta?: string;
  onSecondary?: () => void;
}) {
  return (
    <LuxCard className="px-5 py-7 text-center">
      <Icon className="mx-auto h-6 w-6 text-muted-foreground" />
      <p className="mt-2 text-xs text-muted-foreground">{line}</p>
      <div className="mt-4 flex justify-center gap-2">
        <button
          onClick={onClick}
          className="inline-flex items-center gap-1.5 rounded-full gradient-violet px-4 py-2 text-xs font-medium text-foreground glow-violet"
        >
          <Plus className="h-3.5 w-3.5" /> {cta}
        </button>
        {secondaryCta && (
          <button
            onClick={onSecondary}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs text-foreground"
          >
            {secondaryCta}
          </button>
        )}
      </div>
    </LuxCard>
  );
}

function EmptyInline({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
      {label}
    </div>
  );
}

function initials(s: string) {
  return s
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
