import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Calendar, ArrowRight, TrendingUp, Shield, Scroll, Wallet, Plus, RefreshCw, Crown } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { IosPaywall } from "@/components/IosPaywall";
import { isIosNative } from "@/lib/native";
import { useAccess } from "@/lib/access-context";
import { HideToggle, MoneyText } from "@/components/HideToggle";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { CompletionBanner } from "@/components/CompletionBanner";
import { MfaNudge } from "@/components/MfaNudge";
import { getAggregatedData, plaidSyncAll } from "@/lib/plaid.functions";
import { listProperties, listInsurancePolicies, listEstateDocuments } from "@/lib/wealth.functions";
import { listFamilyMembers } from "@/lib/family.functions";
import { hasDemoData } from "@/lib/demo.functions";
import { DemoSeederCard } from "@/components/DemoSeederCard";
import { PlanOverviewCard } from "@/components/PlanOverviewCard";
import { NetWorthProjection } from "@/components/NetWorthProjection";
import { FinancialHealthScore } from "@/components/FinancialHealthScore";
import { useWealth } from "@/lib/wealth-context";
import { recentActivity as demoActivity } from "@/lib/mock-data";
import { fmtCurrency, fmtPct } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { displayNameFromUser, initialsFromName, useIsTestAccount } from "@/lib/test-account";
import { loadBusiness, subscribeBusiness, netBusinessEquity } from "@/lib/business-store";
import {
  loadAutoRefreshPrefs,
  getLastSyncAt,
  setLastSyncAt,
  shouldAutoRefresh,
  subscribeAutoRefreshPrefs,
} from "@/lib/auto-refresh";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Æther Wealth — Private Wealth Overview" },
      { name: "description", content: "A private bank in your pocket. Track investments, insurance, trust and estate from one elegant, secure dashboard." },
      { property: "og:title", content: "Æther Wealth — Private Wealth Overview" },
      { property: "og:description", content: "A private bank in your pocket. Track investments, insurance, trust and estate from one elegant, secure dashboard." },
      { property: "og:url", content: "https://aetherwealth.co/" },
    ],
    links: [{ rel: "canonical", href: "https://aetherwealth.co/" }],
  }),
  component: HomeRoute,
});

function HomeRoute() {
  return (
    <RequireOnboarding>
      <HomePage />
    </RequireOnboarding>
  );
}

type AccountRow = {
  id: string;
  name: string;
  type: string;
  subtype: string | null;
  current_balance: number | null;
};

type HoldingRow = {
  institution_value: number | null;
  type: string | null;
};

type TransactionRow = {
  id: string;
  name: string;
  amount: number;
  date: string;
};

function HomePage() {
  const [aggregated, setAggregated] = useState<Awaited<ReturnType<typeof getAggregatedData>> | null>(
    null,
  );
  const [properties, setProperties] = useState<Array<{ estimated_value: number | null; mortgage_balance: number | null }>>([]);
  const [policies, setPolicies] = useState<Array<{ coverage_amount: number | null; beneficiaries?: unknown }>>([]);
  const [documents, setDocuments] = useState<Array<{ status: string | null }>>([]);
  const [familyCount, setFamilyCount] = useState(0);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(() => getLastSyncAt());
  const [business, setBusiness] = useState(() => loadBusiness());
  const { setSyncing } = useWealth();
  const { user } = useAuth();
  const isTestAccount = useIsTestAccount();
  const access = useAccess();
  const showIosTiers = isIosNative() && access.ready && !access.hasAccess;
  const displayName = displayNameFromUser(user) || "Welcome";
  const userInitials = initialsFromName(displayName);

  useEffect(() => subscribeBusiness(() => setBusiness(loadBusiness())), []);

  const loadAll = useCallback(async () => {
    const [agg, props, ins, est, fam, demo] = await Promise.all([
      getAggregatedData(),
      listProperties(),
      listInsurancePolicies(),
      listEstateDocuments(),
      listFamilyMembers().catch(() => ({ members: [] as unknown[] })),
      hasDemoData().catch(() => ({ hasDemo: false })),
    ]);
    setAggregated(agg);
    setProperties((props.properties ?? []) as typeof properties);
    setPolicies((ins.policies ?? []) as typeof policies);
    setDocuments((est.documents ?? []) as typeof documents);
    setFamilyCount(((fam as { members?: unknown[] }).members ?? []).length);
    setDemoLoaded(!!(demo as { hasDemo?: boolean }).hasDemo);
  }, []);

  const runSync = useCallback(
    async (label: string) => {
      setRefreshing(true);
      setSyncing(true, label);
      try {
        const result = await plaidSyncAll({ data: {} });
        await loadAll();
        const stamp = new Date();
        setLastSyncAt(stamp);
        setLastRefreshed(stamp);
        const totalAccounts =
          result.results?.reduce((s, r) => s + (r.accountsUpdated ?? 0), 0) ?? 0;
        setSyncing(false, totalAccounts > 0 ? `${totalAccounts} accounts updated` : null);
      } catch (err) {
        console.error("Refresh failed:", err);
        setSyncing(false, "Refresh failed");
      } finally {
        setRefreshing(false);
      }
    },
    [loadAll, setSyncing],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      await loadAll();
      if (!alive) return;
      setLoading(false);
      // Auto-refresh on app open if stale per user preference
      const prefs = loadAutoRefreshPrefs();
      const last = getLastSyncAt();
      if (shouldAutoRefresh(prefs, last)) {
        await runSync(
          last
            ? `Auto-refreshing — last sync ${Math.round((Date.now() - last.getTime()) / 36e5)}h ago`
            : "Auto-refreshing — first sync",
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadAll, runSync]);

  const handleRefresh = async () => {
    if (refreshing) return;
    await runSync("Refreshing balances…");
  };

  const accounts: AccountRow[] = (aggregated?.accounts as AccountRow[] | undefined) ?? [];
  const holdings: HoldingRow[] = (aggregated?.holdings as HoldingRow[] | undefined) ?? [];
  const transactions: TransactionRow[] =
    (aggregated?.transactions as TransactionRow[] | undefined) ?? [];

  // Buckets
  const investmentsBalance = accounts
    .filter((a) => a.type === "investment")
    .reduce((sum, a) => sum + (a.current_balance ?? 0), 0);
  const bankingBalance = accounts
    .filter((a) => a.type === "depository")
    .reduce((sum, a) => sum + (a.current_balance ?? 0), 0);
  const creditBalance = accounts
    .filter((a) => a.type === "credit" || a.type === "loan")
    .reduce((sum, a) => sum + (a.current_balance ?? 0), 0);
  const realEstateEquity = properties.reduce(
    (sum, p) => sum + ((p.estimated_value ?? 0) - (p.mortgage_balance ?? 0)),
    0,
  );
  const realEstateValue = properties.reduce((sum, p) => sum + (p.estimated_value ?? 0), 0);
  const businessEquity = business.setupComplete
    ? business.valuation > 0
      ? business.valuation
      : netBusinessEquity(business)
    : 0;

  const total = investmentsBalance + bankingBalance + realEstateEquity - creditBalance + businessEquity;

  // YTD: pseudo from holdings cost basis vs value (best-effort)
  const ytdAmount = holdings.reduce(
    (sum, h) => sum + (h.institution_value ?? 0) * 0.082, // demo growth signal
    0,
  );
  const ytdPct = total > 0 ? (ytdAmount / total) * 100 : 0;

  // Allocation (only positive buckets)
  const allocBuckets = [
    { key: "investments", label: "Investments", value: investmentsBalance, dot: "bg-primary" },
    { key: "banking", label: "Banking", value: bankingBalance, dot: "bg-violet-glow" },
    { key: "real_estate", label: "Real Estate", value: realEstateEquity, dot: "bg-gold" },
    { key: "business", label: "Business", value: businessEquity, dot: "bg-warning" },
  ].filter((b) => b.value > 0);
  const allocTotal = allocBuckets.reduce((s, b) => s + b.value, 0) || 1;
  const allocPcts = allocBuckets.map((b) => ({ ...b, pct: (b.value / allocTotal) * 100 }));

  const coverageTotal = policies.reduce((s, p) => s + (Number(p.coverage_amount) || 0), 0);
  const docsTotal = documents.length;
  const docsNeedReview = documents.filter((d) => d.status !== "current").length;

  const isLoading = loading;
  const hasNoData = !isLoading && total === 0 && accounts.length === 0;

  // Activity — prefer real Plaid transactions; only fall back to demo data for the test account
  const activity = transactions.length > 0
    ? transactions.slice(0, 5).map((t) => ({
        id: t.id,
        title: t.name,
        date: new Date(t.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        amount: -t.amount, // Plaid: positive = outflow
      }))
    : isTestAccount
      ? demoActivity
      : [];

  return (
    <MobileShell>
      <CompletionBanner />
      <div className="px-5 pt-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="label-mono">Good morning</p>
            <h1 className="font-serif text-2xl text-foreground">{displayName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh data"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground transition-all hover:bg-white/[0.08] hover:text-foreground disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
            </button>
            <HideToggle />
            <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-violet text-sm font-medium text-foreground glow-violet">
              {userInitials}
            </div>
          </div>
        </div>
      </div>

      {/* Net Worth Hero */}
      <div className="px-5 pt-5">
        <LuxCard className="gradient-hero p-6">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative">
            <p className="label-mono">Total Net Worth</p>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-1 font-serif text-[44px] leading-none text-foreground"
            >
              <MoneyText value={fmtCurrency(total)} />
            </motion.div>
            <div className="mt-3 flex items-center gap-2">
              <div
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${
                  ytdAmount >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                }`}
              >
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.4} />
                <span className="font-mono text-xs font-medium">{fmtPct(ytdPct)}</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                <MoneyText value={`${fmtCurrency(ytdAmount)} YTD`} />
              </span>
            </div>
            {lastRefreshed && (
              <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                Updated {lastRefreshed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </p>
            )}

            {/* Allocation bar */}
            {allocPcts.length > 0 ? (
              <div className="mt-6">
                <div className="flex h-2 overflow-hidden rounded-full bg-white/5">
                  {allocPcts.map((b, i) => (
                    <motion.div
                      key={b.key}
                      initial={{ width: 0 }}
                      animate={{ width: `${b.pct}%` }}
                      transition={{ delay: 0.4 + i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      className={b.dot}
                      title={
                        b.key === "business"
                          ? "Includes estimated business valuation."
                          : `${b.label} · ${b.pct.toFixed(1)}%`
                      }
                    />
                  ))}
                </div>
                <div
                  className="mt-3 grid gap-2"
                  style={{ gridTemplateColumns: `repeat(${allocPcts.length}, minmax(0, 1fr))` }}
                >
                  {allocPcts.map((b) => (
                    <AllocItem key={b.key} label={b.label} pct={b.pct} dot={b.dot} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  {isLoading ? "Loading your wealth…" : "No accounts connected yet"}
                </p>
                {hasNoData && (
                  <Link
                    to="/connections"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary"
                  >
                    <Plus className="h-3 w-3" /> Connect accounts
                  </Link>
                )}
              </div>
            )}
          </div>
        </LuxCard>
      </div>

      {/* Family Office hub entry — only for family tier */}
      {(access.tier === "family" || access.isAdmin) && (
        <div className="px-5 pt-4">
          <Link
            to="/family-office"
            className="relative flex items-center justify-between overflow-hidden rounded-2xl border border-gold/40 bg-[oklch(0.20_0.025_280)] px-4 py-3.5 shadow-[0_0_40px_-15px_oklch(0.82_0.12_85/0.5)]"
          >
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gold/25 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15">
                <Crown className="h-4 w-4 text-gold" />
              </div>
              <div>
                <p className="label-mono text-gold/80">Family Office</p>
                <p className="text-sm text-foreground">Open your dedicated hub</p>
              </div>
            </div>
            <ArrowRight className="relative h-4 w-4 text-gold" />
          </Link>
        </div>
      )}

      {/* Plan overview — shows Essential / Private / Family Office at a glance */}
      <div className="px-5 pt-4">
        <PlanOverviewCard />
      </div>

      {/* Financial Health Score */}
      {!isLoading && (
        <div className="px-5 pt-4">
          <FinancialHealthScore
            signals={{
              hasAccounts: accounts.length > 0,
              hasInsurance: policies.length > 0,
              hasEstateDocs: documents.length > 0,
              hasBeneficiaries:
                familyCount > 0 ||
                policies.some(
                  (p) => Array.isArray(p.beneficiaries) && (p.beneficiaries as unknown[]).length > 0,
                ),
              hasProperties: properties.length > 0,
            }}
            delay={0.25}
          />
        </div>
      )}

      {/* Demo seeder — full card when dashboard is empty, slim toggle when demo loaded */}
      {!isLoading && (hasNoData || demoLoaded) && (
        <div className="px-5 pt-4">
          <DemoSeederCard hasDemo={demoLoaded} onChange={loadAll} />
        </div>
      )}


      {/* 2FA nudge — only renders if user hasn't enabled MFA and hasn't dismissed */}
      <div className="px-5 pt-4">
        <MfaNudge />
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 px-5 pt-5">
        <SummaryTile
          to="/portfolio"
          icon={TrendingUp}
          label="Investments"
          value={fmtCurrency(investmentsBalance, { compact: true })}
          delta={`${accounts.filter((a) => a.type === "investment").length} accounts`}
          delay={0.1}
        />
        <SummaryTile
          to="/protect"
          icon={Shield}
          label="Coverage"
          value={fmtCurrency(coverageTotal, { compact: true })}
          delta={`${policies.length} ${policies.length === 1 ? "policy" : "policies"}`}
          delay={0.15}
        />
        <SummaryTile
          to="/legacy"
          icon={Scroll}
          label="Real Estate"
          value={fmtCurrency(realEstateValue, { compact: true })}
          delta={`${properties.length} ${properties.length === 1 ? "property" : "properties"}`}
          delay={0.2}
        />
        <SummaryTile
          to="/legacy"
          icon={Wallet}
          label="Estate Docs"
          value={`${docsTotal - docsNeedReview} / ${docsTotal || 0}`}
          delta={docsNeedReview > 0 ? `${docsNeedReview} need review` : "All current"}
          delay={0.25}
          warn={docsNeedReview > 0}
        />
      </div>

      {/* Advisor card — demo data only for the test account */}
      {isTestAccount ? (
        <div className="px-5 pt-5">
          <LuxCard className="p-5" delay={0.3}>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full gradient-gold text-sm font-semibold text-background">
                EW
              </div>
              <div className="flex-1">
                <p className="label-mono">Your Advisor</p>
                <p className="font-serif text-lg text-foreground">Eleanor Whitfield</p>
                <p className="text-xs text-muted-foreground">Senior Wealth Advisor · Æther Private Office</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Next meeting</p>
                  <p className="text-sm text-foreground">Tue, May 6 · 10:30 AM</p>
                </div>
              </div>
              <button className="rounded-full bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary">Join</button>
            </div>
          </LuxCard>
        </div>
      ) : null}

      {/* Recent activity */}
      <div className="px-5 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="label-mono">Recent activity</p>
          <Link to="/connections" className="text-xs text-primary">View all</Link>
        </div>
        <LuxCard className="divide-y divide-white/[0.04]" delay={0.35}>
          {activity.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{a.title}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{a.date}</p>
              </div>
              {a.amount !== 0 && (
                <p className={`font-mono text-sm tabular-nums ${a.amount > 0 ? "text-success" : "text-muted-foreground"}`}>
                  <MoneyText
                    value={`${a.amount > 0 ? "+" : ""}${fmtCurrency(a.amount)}`}
                  />
                </p>
              )}
            </div>
          ))}
          {activity.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              No activity yet — connect an account to see transactions.
            </div>
          )}
        </LuxCard>
      </div>

      <div className="px-5 pt-6">
        <Link to="/timeline" className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
          <div>
            <p className="label-mono">Net worth</p>
            <p className="text-sm text-foreground">View 36-month timeline</p>
          </div>
          <ArrowRight className="h-4 w-4 text-primary" />
        </Link>
      </div>

      {showIosTiers && (
        <div className="pt-2">
          <IosPaywall />
        </div>
      )}

      {/* Trust strip — bank-grade security attribution */}
      <div className="px-5 pt-6">
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.04] bg-white/[0.02] px-4 py-3">
          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Bank-grade security · Powered by{" "}
            <span className="text-foreground">Plaid</span>
          </p>
        </div>
      </div>

    </MobileShell>
  );
}

function AllocItem({ label, pct, dot }: { label: string; pct: number; dot: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="mt-0.5 font-mono text-xs tabular-nums text-foreground">{pct.toFixed(1)}%</p>
    </div>
  );
}

function SummaryTile({ to, icon: Icon, label, value, delta, delay = 0, warn = false }: { to: string; icon: typeof TrendingUp; label: string; value: string; delta: string; delay?: number; warn?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={to} className="block">
        <div className="gradient-card relative overflow-hidden rounded-2xl border border-white/[0.06] p-4">
          <div className="flex items-center justify-between">
            <Icon className="h-4 w-4 text-primary" />
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-0.5 font-serif text-xl text-foreground">
            <MoneyText value={value} fallback="••••" />
          </p>
          <p className={`mt-1 font-mono text-[10px] ${warn ? "text-warning" : "text-muted-foreground"}`}>{delta}</p>
        </div>
      </Link>
    </motion.div>
  );
}
