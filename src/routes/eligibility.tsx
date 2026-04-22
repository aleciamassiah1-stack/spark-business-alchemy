import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  AlertCircle,
  XCircle,
  Globe,
  Wallet,
  Sparkles,
  Building2,
  Home,
  Shield,
  ScrollText,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";

export const Route = createFileRoute("/eligibility")({
  head: () => ({
    meta: [
      { title: "Integration Eligibility — Æther Wealth" },
      {
        name: "description",
        content: "See which integrations are available for your country, accounts, and goals.",
      },
    ],
  }),
  component: EligibilityPage,
});

// ── Data ────────────────────────────────────────────────────────────

type CountryCode = "US" | "CA" | "GB" | "EU" | "AU" | "OTHER";
type AccountType =
  | "bank"
  | "investments"
  | "crypto"
  | "property"
  | "insurance"
  | "business";
type UseCase = "personal" | "family" | "advisor" | "estate";

const COUNTRIES: { code: CountryCode; label: string; flag: string }[] = [
  { code: "US", label: "United States", flag: "🇺🇸" },
  { code: "CA", label: "Canada", flag: "🇨🇦" },
  { code: "GB", label: "United Kingdom", flag: "🇬🇧" },
  { code: "EU", label: "European Union", flag: "🇪🇺" },
  { code: "AU", label: "Australia", flag: "🇦🇺" },
  { code: "OTHER", label: "Somewhere else", flag: "🌍" },
];

const ACCOUNT_TYPES: { key: AccountType; label: string; icon: typeof Building2; hint: string }[] = [
  { key: "bank", label: "Bank accounts", icon: Wallet, hint: "Checking, savings, credit cards" },
  { key: "investments", label: "Investments", icon: Sparkles, hint: "Brokerage, retirement, ETFs" },
  { key: "crypto", label: "Crypto", icon: Globe, hint: "Exchanges & wallets" },
  { key: "property", label: "Real estate", icon: Home, hint: "Homes & rentals" },
  { key: "insurance", label: "Life insurance", icon: Shield, hint: "Term, whole, universal" },
  { key: "business", label: "Business / commercial", icon: Building2, hint: "QuickBooks, Xero, biz banking" },
];

const USE_CASES: { key: UseCase; label: string; hint: string }[] = [
  { key: "personal", label: "Personal net worth", hint: "Track your own wealth in one place" },
  { key: "family", label: "Family office view", hint: "Multiple members, shared visibility" },
  { key: "advisor", label: "Work with my advisor", hint: "Read-only sharing for an RIA / CPA" },
  { key: "estate", label: "Legacy & estate planning", hint: "Beneficiaries, wills, trust docs" },
];

// ── Eligibility logic ──────────────────────────────────────────────

type Status = "ready" | "available" | "manual" | "unavailable";

type ChecklistItem = {
  id: string;
  provider: string;
  category: string;
  icon: typeof Building2;
  status: Status;
  summary: string;
  whatYouGet: string;
  next: string;
  link?: { label: string; to: string };
  external?: { label: string; href: string };
};

function evaluate(country: CountryCode, accounts: AccountType[], useCases: UseCase[]): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const wantsBank = accounts.includes("bank");
  const wantsInv = accounts.includes("investments");
  const wantsCrypto = accounts.includes("crypto");
  const wantsProp = accounts.includes("property");
  const wantsIns = accounts.includes("insurance");
  const wantsBiz = accounts.includes("business");

  // Plaid — banking + investments
  if (wantsBank || wantsInv) {
    const plaidCountries: CountryCode[] = ["US", "CA", "GB", "EU"];
    const supported = plaidCountries.includes(country);
    items.push({
      id: "plaid",
      provider: "Plaid",
      category: "Bank & investment aggregation",
      icon: Wallet,
      status: supported ? "ready" : "unavailable",
      summary: supported
        ? `Live in ${country}. Sandbox is enabled — switch to Production for real institutions.`
        : `Plaid does not officially support ${country} yet. Consider regional aggregators (e.g. Basiq for AU).`,
      whatYouGet:
        "Real-time balances, transactions, and investment holdings from 12,000+ institutions.",
      next: supported
        ? "Open Connections → Accounts → Connect institution. For production access, request Plaid Production keys."
        : country === "AU"
          ? "Look at Basiq (AU), TrueLayer (UK/EU), or Salt Edge as alternatives."
          : "Tell us your region and we'll suggest the best regional aggregator.",
      link: { label: "Open Connections", to: "/connections" },
      external: supported
        ? { label: "Plaid production access", href: "https://dashboard.plaid.com/overview/production" }
        : undefined,
    });
  }

  // Crypto
  if (wantsCrypto) {
    items.push({
      id: "crypto",
      provider: "Coinbase / WalletConnect",
      category: "Crypto holdings",
      icon: Globe,
      status: "available",
      summary:
        "Plaid covers some custodial crypto (Coinbase). For self-custody wallets, WalletConnect is the standard.",
      whatYouGet: "Token balances, NFT positions, and on-chain net worth.",
      next:
        "Add a Coinbase OAuth integration for custodial accounts, plus WalletConnect for hardware/software wallets.",
      external: { label: "Coinbase developer docs", href: "https://docs.cdp.coinbase.com/" },
    });
  }

  // Property
  if (wantsProp) {
    const usOnly: CountryCode[] = ["US"];
    const supported = usOnly.includes(country);
    items.push({
      id: "property",
      provider: supported ? "Rentcast / HouseCanary / ATTOM" : "Manual valuation",
      category: "Real estate AVM",
      icon: Home,
      status: supported ? "available" : "manual",
      summary: supported
        ? "Best-in-class US automated valuation models. Rentcast is the cheapest to onboard."
        : `Most AVMs are US-only. In ${country}, you can still track properties with manual valuations and AI estimates.`,
      whatYouGet: supported
        ? "Per-address estimated value, comps, rent estimates, and market trends."
        : "Manual entry with periodic AI-assisted re-valuations.",
      next: supported
        ? "Sign up for Rentcast (free tier available) and add the API key in backend secrets."
        : "Use Properties → Add property and update estimated values quarterly.",
      link: { label: "Manage properties", to: "/connections" },
      external: supported
        ? { label: "Rentcast pricing", href: "https://www.rentcast.io/api" }
        : undefined,
    });
  }

  // Insurance — always manual upload (no real API)
  if (wantsIns) {
    items.push({
      id: "insurance",
      provider: "AI document parsing",
      category: "Life insurance",
      icon: Shield,
      status: "ready",
      summary:
        "There is no universal life insurance API. We extract policy details from your PDF using AI.",
      whatYouGet:
        "Coverage amount, premiums, beneficiaries, and renewal dates parsed from policy PDFs.",
      next: "Upload your policy on Connections → Insurance. Already wired up — no extra setup.",
      link: { label: "Upload a policy", to: "/connections" },
    });
  }

  // Business
  if (wantsBiz) {
    items.push({
      id: "business",
      provider: "Codat / Rutter",
      category: "Business accounting",
      icon: Building2,
      status: "available",
      summary:
        "Codat and Rutter unify QuickBooks, Xero, FreshBooks, NetSuite, and Sage behind one API.",
      whatYouGet: "P&L, balance sheet, AR/AP, and bank feeds for owned businesses.",
      next:
        "Pick Codat (better enterprise) or Rutter (better DX/pricing). Both need a sales call to onboard.",
      external: { label: "Codat docs", href: "https://docs.codat.io/" },
    });
  }

  // Estate / legacy → always available via doc vault
  if (useCases.includes("estate")) {
    items.push({
      id: "estate",
      provider: "Encrypted document vault",
      category: "Estate & legacy docs",
      icon: ScrollText,
      status: "ready",
      summary:
        "Wills, trusts, POAs, healthcare directives — stored encrypted with beneficiary access rules.",
      whatYouGet: "Versioned document storage with expiration tracking and beneficiary sharing.",
      next: "Use Legacy → Documents to upload. Already enabled.",
      link: { label: "Open Legacy", to: "/legacy" },
    });
  }

  // Advisor sharing
  if (useCases.includes("advisor")) {
    items.push({
      id: "advisor",
      provider: "Read-only sharing",
      category: "Advisor / CPA access",
      icon: Sparkles,
      status: "available",
      summary:
        "Generate a read-only link your RIA or CPA can use. No write access, full audit trail.",
      whatYouGet: "Scoped link with optional expiration and per-section visibility.",
      next: "Coming soon — we'll surface advisor sharing under Preferences once enabled.",
    });
  }

  // Family office
  if (useCases.includes("family")) {
    items.push({
      id: "family",
      provider: "Multi-member household",
      category: "Family office",
      icon: Sparkles,
      status: "available",
      summary:
        "Add up to 6 members with role-based visibility (owner, partner, beneficiary, advisor).",
      whatYouGet: "Combined net worth view with per-member privacy controls.",
      next: "Open Family → Add member to invite a partner or beneficiary.",
      link: { label: "Open Family", to: "/family" },
    });
  }

  return items;
}

// ── UI ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "aether.eligibility.v1";

function EligibilityPage() {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [country, setCountry] = useState<CountryCode | null>(null);
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [useCases, setUseCases] = useState<UseCase[]>([]);

  // restore last result if present
  useMemo(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          country: CountryCode;
          accounts: AccountType[];
          useCases: UseCase[];
        };
        setCountry(saved.country);
        setAccounts(saved.accounts);
        setUseCases(saved.useCases);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const checklist = useMemo(
    () => (country ? evaluate(country, accounts, useCases) : []),
    [country, accounts, useCases],
  );

  const canNext = step === 0 ? !!country : step === 1 ? accounts.length > 0 : useCases.length > 0;

  const goNext = () => {
    if (step === 2 && country) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ country, accounts, useCases }),
      );
    }
    setStep((s) => (s < 3 ? ((s + 1) as 0 | 1 | 2 | 3) : s));
  };

  const reset = () => {
    setCountry(null);
    setAccounts([]);
    setUseCases([]);
    setStep(0);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <MobileShell>
      <div className="px-5 pt-6">
        <Link
          to="/more"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <div className="mt-3">
          <p className="label-mono">Setup wizard</p>
          <h1 className="font-serif text-[32px] leading-tight text-foreground">
            Integration eligibility
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Three quick questions. We'll tell you exactly what you can wire up today.
          </p>
        </div>

        {/* Progress */}
        <div className="mt-5 flex items-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= step ? "bg-primary" : "bg-white/[0.08]"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Step {Math.min(step + 1, 4)} of 4
        </p>
      </div>

      <div className="px-5 pt-6">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <StepCard key="0" title="Where are you based?" subtitle="Different regions have different aggregators.">
              <div className="grid grid-cols-2 gap-2.5">
                {COUNTRIES.map((c) => {
                  const active = country === c.code;
                  return (
                    <button
                      key={c.code}
                      onClick={() => setCountry(c.code)}
                      className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm transition-all ${
                        active
                          ? "border-primary/50 bg-primary/15 text-foreground glow-violet"
                          : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-white/[0.15]"
                      }`}
                    >
                      <span className="text-lg">{c.flag}</span>
                      <span className="font-medium">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </StepCard>
          )}

          {step === 1 && (
            <StepCard
              key="1"
              title="What do you want to track?"
              subtitle="Pick everything that applies — you can change later."
            >
              <div className="space-y-2">
                {ACCOUNT_TYPES.map((a) => {
                  const active = accounts.includes(a.key);
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.key}
                      onClick={() =>
                        setAccounts((prev) =>
                          prev.includes(a.key) ? prev.filter((x) => x !== a.key) : [...prev, a.key],
                        )
                      }
                      className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all ${
                        active
                          ? "border-primary/50 bg-primary/15"
                          : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          active ? "bg-primary/25 text-primary" : "bg-white/[0.05] text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{a.label}</p>
                        <p className="text-xs text-muted-foreground">{a.hint}</p>
                      </div>
                      {active ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/40" />
                      )}
                    </button>
                  );
                })}
              </div>
            </StepCard>
          )}

          {step === 2 && (
            <StepCard
              key="2"
              title="How will you use Æther?"
              subtitle="This shapes which collaboration features we surface."
            >
              <div className="space-y-2">
                {USE_CASES.map((u) => {
                  const active = useCases.includes(u.key);
                  return (
                    <button
                      key={u.key}
                      onClick={() =>
                        setUseCases((prev) =>
                          prev.includes(u.key) ? prev.filter((x) => x !== u.key) : [...prev, u.key],
                        )
                      }
                      className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all ${
                        active
                          ? "border-primary/50 bg-primary/15"
                          : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]"
                      }`}
                    >
                      <div className="pt-0.5">
                        {active ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{u.label}</p>
                        <p className="text-xs text-muted-foreground">{u.hint}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </StepCard>
          )}

          {step === 3 && country && (
            <ResultsCard
              key="3"
              country={country}
              accounts={accounts}
              useCases={useCases}
              checklist={checklist}
              onReset={reset}
            />
          )}
        </AnimatePresence>

        {/* Nav buttons */}
        {step < 3 && (
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              onClick={() => setStep((s) => (s > 0 ? ((s - 1) as 0 | 1 | 2 | 3) : s))}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button
              onClick={goNext}
              disabled={!canNext}
              className="inline-flex items-center gap-1.5 rounded-full gradient-violet px-5 py-2.5 text-xs font-medium text-foreground glow-violet transition-all disabled:opacity-30 disabled:glow-none"
            >
              {step === 2 ? "Generate checklist" : "Continue"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </MobileShell>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────

function StepCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <LuxCard className="p-5">
        <h2 className="font-serif text-[22px] leading-tight text-foreground">{title}</h2>
        {subtitle && <p className="mt-1 mb-4 text-xs text-muted-foreground">{subtitle}</p>}
        {!subtitle && <div className="mb-4" />}
        {children}
      </LuxCard>
    </motion.div>
  );
}

function ResultsCard({
  country,
  accounts,
  useCases,
  checklist,
  onReset,
}: {
  country: CountryCode;
  accounts: AccountType[];
  useCases: UseCase[];
  checklist: ChecklistItem[];
  onReset: () => void;
}) {
  const ready = checklist.filter((c) => c.status === "ready").length;
  const total = checklist.length;
  const countryLabel = COUNTRIES.find((c) => c.code === country)?.label ?? country;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      <LuxCard className="gradient-hero p-5">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative">
          <p className="label-mono">Your tailored checklist</p>
          <h2 className="mt-1 font-serif text-[26px] leading-tight text-foreground">
            {ready} ready · {total - ready} to set up
          </h2>
          <p className="mt-2 text-xs text-muted-foreground">
            {countryLabel} · {accounts.length} account type{accounts.length === 1 ? "" : "s"} ·{" "}
            {useCases.length} use case{useCases.length === 1 ? "" : "s"}
          </p>
          <button
            onClick={onReset}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            Start over
          </button>
        </div>
      </LuxCard>

      {checklist.length === 0 && (
        <LuxCard className="p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Pick at least one account type or use case to see recommendations.
          </p>
        </LuxCard>
      )}

      {checklist.map((item) => (
        <ChecklistRow key={item.id} item={item} />
      ))}
    </motion.div>
  );
}

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const Icon = item.icon;
  return (
    <LuxCard className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {item.category}
              </p>
              <h3 className="mt-0.5 text-[15px] font-medium text-foreground">{item.provider}</h3>
            </div>
            <StatusBadge status={item.status} />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.summary}</p>

          <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              What you get
            </p>
            <p className="mt-1 text-xs text-foreground/80">{item.whatYouGet}</p>
          </div>

          <div className="mt-2.5 rounded-lg border border-primary/15 bg-primary/[0.06] p-2.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
              Next step
            </p>
            <p className="mt-1 text-xs text-foreground/80">{item.next}</p>
          </div>

          {(item.link || item.external) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {item.link && (
                <Link
                  to={item.link.to}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/25"
                >
                  {item.link.label}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
              {item.external && (
                <a
                  href={item.external.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.02] px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  {item.external.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </LuxCard>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const config = {
    ready: { label: "Ready now", icon: CheckCircle2, cls: "bg-success/15 text-success border-success/30" },
    available: {
      label: "Available",
      icon: Sparkles,
      cls: "bg-primary/15 text-primary border-primary/30",
    },
    manual: {
      label: "Manual",
      icon: AlertCircle,
      cls: "bg-warning/15 text-warning border-warning/30",
    },
    unavailable: {
      label: "Not in region",
      icon: XCircle,
      cls: "bg-destructive/15 text-destructive border-destructive/30",
    },
  }[status];
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${config.cls}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </span>
  );
}
