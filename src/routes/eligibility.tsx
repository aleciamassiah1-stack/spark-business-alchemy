import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  KeyRound,
  Copy,
  Check,
  Mail,
  Plus,
  Pencil,
  Trash2,
  Send,
  Clock,
  ThumbsUp,
  ThumbsDown,
  FileEdit,
} from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

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

  // Items that need a sales/enterprise key
  const enterpriseGated = useMemo(
    () =>
      checklist.filter((c) =>
        ["plaid", "business", "property", "crypto"].includes(c.id) && c.status !== "unavailable",
      ),
    [checklist],
  );

  const [requestOpen, setRequestOpen] = useState(false);

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
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {enterpriseGated.length > 0 && (
              <button
                onClick={() => setRequestOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full gradient-violet px-3 py-1.5 text-[11px] font-medium text-foreground glow-violet"
              >
                <KeyRound className="h-3 w-3" />
                Request access ({enterpriseGated.length})
              </button>
            )}
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              Start over
            </button>
          </div>
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

      <RequestAccessDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        country={countryLabel}
        accounts={accounts}
        useCases={useCases}
        gatedItems={enterpriseGated}
      />
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

// ── Request access modal ───────────────────────────────────────────

const PROVIDER_KEY_MAP: Record<string, { name: string; access: string; contact: string; sla: string }> = {
  plaid: {
    name: "Plaid Production",
    access: "Sales-gated. Sandbox is free; Production requires a signed MSA + per-item pricing.",
    contact: "sales@plaid.com",
    sla: "1–3 business days",
  },
  business: {
    name: "Codat / Rutter",
    access: "Enterprise sales call required for production keys.",
    contact: "sales@codat.io",
    sla: "3–5 business days",
  },
  property: {
    name: "Rentcast / HouseCanary",
    access: "Self-serve free tier (Rentcast) or sales contract (HouseCanary, ATTOM).",
    contact: "support@rentcast.io",
    sla: "Same day for Rentcast; 1–2 weeks for HouseCanary",
  },
  crypto: {
    name: "Coinbase Developer Platform",
    access: "Self-serve OAuth keys via Coinbase Developer Platform.",
    contact: "developer-support@coinbase.com",
    sla: "Same day",
  },
};

type CompanyForm = {
  companyName: string;
  contactName: string;
  email: string;
  role: string;
  monthlyVolume: string;
  notes: string;
};

const COMPANY_STORAGE_KEY = "aether.requestAccess.v1"; // legacy single-profile (migrated)
const PROFILES_STORAGE_KEY = "aether.requestAccess.profiles.v2";

type StoredProfile = CompanyForm & { id: string; label: string };

type ProfilesState = {
  profiles: StoredProfile[];
  activeId: string | null;
};

const emptyForm: CompanyForm = {
  companyName: "",
  contactName: "",
  email: "",
  role: "Founder",
  monthlyVolume: "<1,000",
  notes: "",
};

function makeId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function loadProfilesState(): ProfilesState {
  if (typeof window === "undefined") return { profiles: [], activeId: null };
  try {
    const raw = window.localStorage.getItem(PROFILES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ProfilesState;
      if (Array.isArray(parsed.profiles)) return parsed;
    }
    // Migrate legacy single profile
    const legacy = window.localStorage.getItem(COMPANY_STORAGE_KEY);
    if (legacy) {
      const form = JSON.parse(legacy) as CompanyForm;
      const profile: StoredProfile = {
        ...form,
        id: makeId(),
        label: form.companyName || "Default profile",
      };
      const state: ProfilesState = { profiles: [profile], activeId: profile.id };
      window.localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(state));
      return state;
    }
  } catch { /* ignore */ }
  return { profiles: [], activeId: null };
}

function saveProfilesState(state: ProfilesState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

// ── Request status tracking ────────────────────────────────────────

type RequestStatus = "draft" | "sent" | "approved" | "rejected";

type RequestRecord = {
  status: RequestStatus;
  note: string;
  updatedAt: string;
};

const REQUEST_STATUS_KEY = "aether.requestAccess.status.v1";

type RequestStatusMap = Record<string, Record<string, RequestRecord>>;

function loadRequestStatus(): RequestStatusMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(REQUEST_STATUS_KEY);
    if (raw) return JSON.parse(raw) as RequestStatusMap;
  } catch { /* ignore */ }
  return {};
}

function saveRequestStatus(map: RequestStatusMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REQUEST_STATUS_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

const STATUS_META: Record<RequestStatus, { label: string; icon: typeof Clock; cls: string }> = {
  draft: { label: "Draft", icon: FileEdit, cls: "bg-muted/30 text-muted-foreground border-white/[0.1]" },
  sent: { label: "Sent", icon: Send, cls: "bg-primary/15 text-primary border-primary/30" },
  approved: { label: "Approved", icon: ThumbsUp, cls: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Rejected", icon: ThumbsDown, cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

function RequestStatusTracker({ gatedItems }: { gatedItems: ChecklistItem[] }) {
  const [profilesState, setProfilesState] = useState<ProfilesState>(() => loadProfilesState());
  const [statusMap, setStatusMap] = useState<RequestStatusMap>(() => loadRequestStatus());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  // Re-read whenever the window regains focus (e.g. after editing in the dialog)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = () => {
      setProfilesState(loadProfilesState());
      setStatusMap(loadRequestStatus());
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const activeProfile = profilesState.profiles.find((p) => p.id === profilesState.activeId) ?? null;
  const profileId = activeProfile?.id ?? "__no_profile__";
  const records = statusMap[profileId] ?? {};

  const switchProfile = (id: string) => {
    const next = { ...profilesState, activeId: id };
    setProfilesState(next);
    saveProfilesState(next);
  };

  const updateRecord = (providerId: string, patch: Partial<RequestRecord>) => {
    setStatusMap((prev) => {
      const bucket = { ...(prev[profileId] ?? {}) };
      const current: RequestRecord = bucket[providerId] ?? {
        status: "draft",
        note: "",
        updatedAt: new Date().toISOString(),
      };
      bucket[providerId] = { ...current, ...patch, updatedAt: new Date().toISOString() };
      const next = { ...prev, [profileId]: bucket };
      saveRequestStatus(next);
      return next;
    });
  };

  const setStatus = (providerId: string, status: RequestStatus) => {
    updateRecord(providerId, { status });
    toast.success(`Marked ${STATUS_META[status].label.toLowerCase()}`);
  };

  const startEditNote = (providerId: string) => {
    setEditingId(providerId);
    setNoteDraft(records[providerId]?.note ?? "");
  };

  const saveNote = (providerId: string) => {
    updateRecord(providerId, { note: noteDraft.trim() });
    setEditingId(null);
    setNoteDraft("");
  };

  if (gatedItems.length === 0) return null;

  const counts = gatedItems.reduce(
    (acc, item) => {
      const s = records[item.id]?.status ?? "draft";
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<RequestStatus, number>,
  );

  return (
    <LuxCard className="p-4">
      <div className="min-w-0">
        <p className="label-mono">Request status</p>
        <h3 className="mt-0.5 font-serif text-[18px] leading-tight text-foreground">
          Outreach tracker
        </h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {activeProfile ? `For ${activeProfile.label}` : "Tracking unsaved drafts"} ·{" "}
          {counts.approved ?? 0} approved · {counts.sent ?? 0} sent · {counts.draft ?? 0} draft
          {counts.rejected ? ` · ${counts.rejected} rejected` : ""}
        </p>
      </div>

      {profilesState.profiles.length > 1 && (
        <div className="mt-3">
          <label className="mb-1 block font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            Tracking for profile
          </label>
          <select
            value={profilesState.activeId ?? ""}
            onChange={(e) => switchProfile(e.target.value)}
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-1.5 text-xs text-foreground focus:border-primary/40 focus:outline-none"
          >
            {profilesState.profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {gatedItems.map((item) => {
          const record = records[item.id];
          const status = record?.status ?? "draft";
          const meta = STATUS_META[status];
          const Icon = meta.icon;
          const providerName = PROVIDER_KEY_MAP[item.id]?.name ?? item.provider;
          const isEditing = editingId === item.id;

          return (
            <div key={item.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{providerName}</p>
                  <p className="text-[10px] text-muted-foreground">{item.category}</p>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.cls}`}>
                  <Icon className="h-2.5 w-2.5" />
                  {meta.label}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {(["draft", "sent", "approved", "rejected"] as RequestStatus[]).map((s) => {
                  const active = status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setStatus(item.id, s)}
                      className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                        active
                          ? STATUS_META[s].cls
                          : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {STATUS_META[s].label}
                    </button>
                  );
                })}
              </div>

              {isEditing ? (
                <div className="mt-2 space-y-1.5">
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="e.g. Sent via sales@plaid.com Apr 22, awaiting MSA"
                    rows={2}
                    className="w-full resize-none rounded-md border border-primary/40 bg-white/[0.04] px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveNote(item.id)}
                      className="rounded-md bg-primary/20 px-2 py-1 text-[10px] font-medium text-primary"
                    >
                      Save note
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-[11px] text-muted-foreground">
                    {record?.note ? (
                      record.note
                    ) : (
                      <span className="italic text-muted-foreground/60">No notes yet</span>
                    )}
                  </p>
                  <button
                    onClick={() => startEditNote(item.id)}
                    className="inline-flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                    {record?.note ? "Edit" : "Add note"}
                  </button>
                </div>
              )}

              {record?.updatedAt && (
                <p className="mt-1.5 text-[9px] text-muted-foreground/60">
                  Updated {new Date(record.updatedAt).toLocaleString()}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </LuxCard>
  );
}

function RequestAccessDialog({
  open,
  onOpenChange,
  country,
  accounts,
  useCases,
  gatedItems,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  country: string;
  accounts: AccountType[];
  useCases: UseCase[];
  gatedItems: ChecklistItem[];
}) {
  const [state, setState] = useState<ProfilesState>(() => loadProfilesState());
  const activeProfile = useMemo(
    () => state.profiles.find((p) => p.id === state.activeId) ?? null,
    [state],
  );
  const [form, setForm] = useState<CompanyForm>(() => {
    const initial = loadProfilesState();
    const active = initial.profiles.find((p) => p.id === initial.activeId);
    return active
      ? { companyName: active.companyName, contactName: active.contactName, email: active.email, role: active.role, monthlyVolume: active.monthlyVolume, notes: active.notes }
      : emptyForm;
  });
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Re-hydrate from saved state every time dialog opens
  useEffect(() => {
    if (!open) return;
    const fresh = loadProfilesState();
    setState(fresh);
    const active = fresh.profiles.find((p) => p.id === fresh.activeId);
    if (active) {
      setForm({
        companyName: active.companyName,
        contactName: active.contactName,
        email: active.email,
        role: active.role,
        monthlyVolume: active.monthlyVolume,
        notes: active.notes,
      });
    }
  }, [open]);

  // Auto-persist current form into the active profile (or create one if none exists yet)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!form.companyName && !form.contactName && !form.email) return;
    setState((prev) => {
      let next: ProfilesState;
      if (prev.activeId && prev.profiles.some((p) => p.id === prev.activeId)) {
        next = {
          ...prev,
          profiles: prev.profiles.map((p) =>
            p.id === prev.activeId
              ? { ...p, ...form, label: p.label || form.companyName || "Untitled" }
              : p,
          ),
        };
      } else {
        const id = makeId();
        const profile: StoredProfile = {
          ...form,
          id,
          label: form.companyName || "Untitled profile",
        };
        next = { profiles: [...prev.profiles, profile], activeId: id };
      }
      saveProfilesState(next);
      return next;
    });
  }, [form]);

  const switchProfile = (id: string) => {
    const target = state.profiles.find((p) => p.id === id);
    if (!target) return;
    const next = { ...state, activeId: id };
    setState(next);
    saveProfilesState(next);
    setForm({
      companyName: target.companyName,
      contactName: target.contactName,
      email: target.email,
      role: target.role,
      monthlyVolume: target.monthlyVolume,
      notes: target.notes,
    });
    setRenaming(false);
    toast.success(`Switched to ${target.label}`);
  };

  const addNewProfile = () => {
    const id = makeId();
    const profile: StoredProfile = {
      ...emptyForm,
      id,
      label: `Profile ${state.profiles.length + 1}`,
    };
    const next = { profiles: [...state.profiles, profile], activeId: id };
    setState(next);
    saveProfilesState(next);
    setForm({ ...emptyForm });
    setRenaming(false);
  };

  const deleteActiveProfile = () => {
    if (!activeProfile) return;
    const remaining = state.profiles.filter((p) => p.id !== activeProfile.id);
    const nextActive = remaining[0]?.id ?? null;
    const next: ProfilesState = { profiles: remaining, activeId: nextActive };
    setState(next);
    saveProfilesState(next);
    if (nextActive) {
      const t = remaining[0]!;
      setForm({
        companyName: t.companyName,
        contactName: t.contactName,
        email: t.email,
        role: t.role,
        monthlyVolume: t.monthlyVolume,
        notes: t.notes,
      });
    } else {
      setForm({ ...emptyForm });
    }
    toast.success(`Deleted ${activeProfile.label}`);
  };

  const startRename = () => {
    if (!activeProfile) return;
    setRenameValue(activeProfile.label);
    setRenaming(true);
  };

  const commitRename = () => {
    if (!activeProfile) return;
    const label = renameValue.trim() || activeProfile.label;
    const next = {
      ...state,
      profiles: state.profiles.map((p) => (p.id === activeProfile.id ? { ...p, label } : p)),
    };
    setState(next);
    saveProfilesState(next);
    setRenaming(false);
  };

  const canSubmit =
    form.companyName.trim() && form.contactName.trim() && /\S+@\S+\.\S+/.test(form.email);


  // Auto-derived context from eligibility answers
  const accountLabels = useMemo(
    () => accounts.map((a) => ACCOUNT_TYPES.find((t) => t.key === a)?.label ?? a).join(", "),
    [accounts],
  );
  const useCaseLabels = useMemo(
    () => useCases.map((u) => USE_CASES.find((t) => t.key === u)?.label ?? u).join(", "),
    [useCases],
  );
  const inferredVolume = useMemo(() => {
    // Heuristic: family / advisor / multiple account types → larger volume
    const breadth = accounts.length + (useCases.includes("family") ? 2 : 0) + (useCases.includes("advisor") ? 2 : 0);
    if (breadth >= 7) return "10,000–50,000";
    if (breadth >= 5) return "1,000–10,000";
    return "<1,000";
  }, [accounts, useCases]);
  const inferredNotes = useMemo(() => {
    const bits: string[] = [];
    if (useCases.includes("family")) bits.push("multi-member household with shared visibility");
    if (useCases.includes("advisor")) bits.push("read-only sharing with an RIA / CPA");
    if (useCases.includes("estate")) bits.push("legacy & estate planning workflows");
    if (useCases.includes("personal")) bits.push("personal net worth tracking");
    return bits.length ? `Primary workflows: ${bits.join("; ")}.` : "";
  }, [useCases]);

  const emailTemplates = useMemo(() => {
    return gatedItems.map((item) => {
      const meta = PROVIDER_KEY_MAP[item.id] ?? {
        name: item.provider,
        access: "Contact provider for production access.",
        contact: "—",
        sla: "—",
      };
      const subject = `[${form.companyName || "Your Company"}] Production access request — ${meta.name}`;
      const body = `Hi ${meta.name} team,

I'm ${form.contactName || "[Your Name]"}, ${form.role || "Founder"} at ${form.companyName || "[Company]"}. We're building a wealth aggregation platform on Æther and would like to request production credentials for ${meta.name}.

Company snapshot
• Company: ${form.companyName || "[Company]"}
• Region: ${country}
• Primary contact: ${form.contactName || "[Name]"} <${form.email || "[email]"}>
• Tracking: ${accountLabels || "—"}
• Use cases: ${useCaseLabels || "—"}
• Estimated monthly volume: ${inferredVolume} connected items
• Use case for ${meta.name}: ${item.category} — ${item.whatYouGet}

What we need
${meta.access}

${inferredNotes ? `Additional context\n${inferredNotes}\n\n` : ""}Please let us know next steps, pricing, and any compliance docs you need from us.

Thanks,
${form.contactName || "[Your Name]"}
${form.companyName || "[Company]"}
${form.email || "[email]"}`;
      return { id: item.id, providerName: meta.name, contact: meta.contact, sla: meta.sla, subject, body };
    });
  }, [gatedItems, form, country, accountLabels, useCaseLabels, inferredVolume, inferredNotes]);

  const handleSubmit = () => {
    try {
      window.localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(form));
    } catch { /* ignore */ }
    setSubmitted(true);
  };

  const copyEmail = async (subject: string, body: string, providerName: string) => {
    const text = `Subject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${providerName} email copied`);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy — select and copy manually.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setSubmitted(false);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto border-white/[0.08] bg-card sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-[22px] leading-tight">
            {submitted ? "Your outreach kit" : "Request integration access"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {submitted
              ? "We pre-filled emails for each gated provider. Copy, paste, and send."
              : "We've pre-filled the context from your answers. Just add your company details."}
          </DialogDescription>
        </DialogHeader>

        {!submitted ? (
          <div className="mt-2 space-y-3">
            {/* Auto-filled summary from eligibility wizard */}
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                  From your answers
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[9px] font-medium text-success">
                  <Check className="h-2.5 w-2.5" />
                  Auto-filled
                </span>
              </div>
              <dl className="mt-2 space-y-1.5 text-[11px]">
                <SummaryRow label="Region" value={country} />
                <SummaryRow label="Tracking" value={accountLabels || "—"} />
                <SummaryRow label="Use cases" value={useCaseLabels || "—"} />
                <SummaryRow label="Est. volume" value={`${inferredVolume} items / mo`} />
              </dl>
            </div>

            {/* Profile picker */}
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                  Company profile
                </p>
                <button
                  onClick={addNewProfile}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/25"
                >
                  <Plus className="h-2.5 w-2.5" />
                  New
                </button>
              </div>

              {state.profiles.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {renaming && activeProfile ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") setRenaming(false);
                        }}
                        className="flex-1 rounded-md border border-primary/40 bg-white/[0.04] px-2 py-1 text-xs text-foreground focus:outline-none"
                      />
                      <button
                        onClick={commitRename}
                        className="rounded-md bg-primary/20 px-2 py-1 text-[10px] font-medium text-primary"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <select
                      value={state.activeId ?? ""}
                      onChange={(e) => switchProfile(e.target.value)}
                      className="w-full rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-1.5 text-xs text-foreground focus:border-primary/40 focus:outline-none"
                    >
                      {state.profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                          {p.companyName && p.label !== p.companyName ? ` — ${p.companyName}` : ""}
                        </option>
                      ))}
                    </select>
                  )}

                  {activeProfile && !renaming && (
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <button
                        onClick={startRename}
                        className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                        Rename
                      </button>
                      <button
                        onClick={deleteActiveProfile}
                        className="inline-flex items-center gap-1 hover:text-destructive hover:underline"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                        Delete
                      </button>
                      <span className="ml-auto inline-flex items-center gap-1 text-success">
                        <Check className="h-2.5 w-2.5" />
                        Auto-saved
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  No saved profiles yet — start typing below and we'll create one for you.
                </p>
              )}
            </div>

            <FormRow label="Company name">
              <input
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="Æther Wealth Inc."
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none"
              />
            </FormRow>
            <div className="grid grid-cols-2 gap-2.5">
              <FormRow label="Your name">
                <input
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  placeholder="Jane Doe"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none"
                />
              </FormRow>
              <FormRow label="Role">
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-foreground focus:border-primary/40 focus:outline-none"
                >
                  <option>Founder</option>
                  <option>CTO</option>
                  <option>Head of Product</option>
                  <option>Compliance</option>
                  <option>Other</option>
                </select>
              </FormRow>
            </div>
            <FormRow label="Work email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@aether.com"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none"
              />
            </FormRow>

            <div className="rounded-lg border border-primary/15 bg-primary/[0.06] p-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
                Providers we'll draft emails for
              </p>
              <ul className="mt-2 space-y-1">
                {gatedItems.map((g) => (
                  <li key={g.id} className="flex items-center gap-2 text-xs text-foreground/80">
                    <KeyRound className="h-3 w-3 text-primary" />
                    {PROVIDER_KEY_MAP[g.id]?.name ?? g.provider}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full gradient-violet px-5 py-2.5 text-xs font-medium text-foreground glow-violet transition-all disabled:opacity-30 disabled:glow-none"
            >
              Generate emails
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            {emailTemplates.map((t) => (
              <div key={t.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                      To · {t.contact} · SLA {t.sla}
                    </p>
                    <h3 className="mt-0.5 text-sm font-medium text-foreground">{t.providerName}</h3>
                  </div>
                  <button
                    onClick={() => copyEmail(t.subject, t.body, t.providerName)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/25"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copy
                  </button>
                </div>
                <div className="mt-2.5 rounded-lg border border-white/[0.06] bg-background/40 p-2.5">
                  <p className="text-[11px] font-medium text-foreground/90">{t.subject}</p>
                  <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-[11px] leading-relaxed text-muted-foreground">
                    {t.body}
                  </pre>
                </div>
                <a
                  href={`mailto:${t.contact}?subject=${encodeURIComponent(t.subject)}&body=${encodeURIComponent(t.body)}`}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  <Mail className="h-3 w-3" />
                  Open in mail app
                </a>
              </div>
            ))}

            <button
              onClick={() => setSubmitted(false)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Edit company details
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <dt className="w-20 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 text-foreground/90">{value}</dd>
    </div>
  );
}
