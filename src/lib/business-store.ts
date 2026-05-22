// Local-storage backed Business workspace.
// Mirrors the pattern used for eligibility/company profiles — single source of truth
// in the browser, with a stable schema versioned key. The store is intentionally
// dependency-free so any component (incl. the home dashboard) can subscribe.

export type EntityType = "LLC" | "S-Corp" | "C-Corp" | "Partnership" | "Sole Prop";
export type ExitStrategy = "M&A" | "IPO" | "Family Transfer" | "MBO";
export type SuccessionStatus = "Not Started" | "In Progress" | "Complete";
export type DocStatus = "current" | "review" | "missing";

export type BusinessAsset = {
  id: string;
  name: string;
  type: "Equipment" | "Real Estate" | "Receivables" | "Inventory" | "Other";
  value: number;
  source?: "manual" | "ai";
  aiAccountId?: string; // aggregated_accounts.id when source = "ai"
  aiReasoning?: string;
};

export type BusinessLiability = {
  id: string;
  name: string;
  lender: string;
  balance: number;
  monthlyPayment: number;
  interestRate: number;
  source?: "manual" | "ai";
  aiAccountId?: string;
  aiReasoning?: string;
};

export type Partner = {
  id: string;
  name: string;
  pct: number;
};

export type FundingRound = {
  id: string;
  label: string;
  date: string;
  amount: number;
  valuation: number;
};

export type BusinessInsurance = {
  id: string;
  type: "Key Person" | "Liability" | "D&O" | "Business Interruption";
  insurer: string;
  coverage: number;
  premium: number;
  premiumFreq: "monthly" | "annual";
  status: "active" | "renewal due" | "expired";
  renewalDate: string | null;
  parsedByAI?: boolean;
};

export type BusinessDocument = {
  id: string;
  name: string;
  category:
    | "Articles of Incorporation"
    | "Operating Agreement"
    | "Tax Return"
    | "Buy-Sell Agreement"
    | "Succession Plan"
    | "Exit Planning"
    | "Other";
  uploadedAt: string;
  status: DocStatus;
};

export type RevenuePoint = { month: string; revenue: number; expenses: number };

export type BusinessState = {
  setupComplete: boolean;
  name: string;
  entityType: EntityType;
  valuation: number;
  valuationLastYear: number;
  annualRevenue: number;
  revenueMoM: number; // pct change month-over-month
  netProfit: number;
  netProfitMargin: number; // pct
  cashFlow: number;
  nextTaxDue: string | null; // ISO date
  cpa: { name: string; firm: string; contact: string } | null;
  bankConnected: boolean;
  bankLastSync: string | null;
  revenueHistory: RevenuePoint[];
  assets: BusinessAsset[];
  liabilities: BusinessLiability[];
  ownership: {
    yourPct: number;
    partners: Partner[];
    vesting?: {
      cliffDate: string;
      fullVestDate: string;
      progressPct: number;
    } | null;
    funding: FundingRound[];
  };
  insurance: BusinessInsurance[];
  succession: {
    status: SuccessionStatus;
    successorName: string;
    successorRole: string;
    buySellSigned: boolean;
    attorney: string;
    wizardStep?: number; // last step reached in the transition wizard (1-5)
    wizardCompleted?: boolean;
  };
  exit: {
    targetValuation: number;
    targetDate: string; // ISO
    strategy: ExitStrategy;
    readinessScore: number; // 0..100
  };
  documents: BusinessDocument[];
  updatedAt: string;
};

const STORAGE_KEY = "aether.business.v1";

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function emptyBusiness(): BusinessState {
  return {
    setupComplete: false,
    name: "",
    entityType: "LLC",
    valuation: 0,
    valuationLastYear: 0,
    annualRevenue: 0,
    revenueMoM: 0,
    netProfit: 0,
    netProfitMargin: 0,
    cashFlow: 0,
    nextTaxDue: null,
    cpa: null,
    bankConnected: false,
    bankLastSync: null,
    revenueHistory: [],
    assets: [],
    liabilities: [],
    ownership: { yourPct: 100, partners: [], vesting: null, funding: [] },
    insurance: [],
    succession: {
      status: "Not Started",
      successorName: "",
      successorRole: "",
      buySellSigned: false,
      attorney: "",
    },
    exit: {
      targetValuation: 0,
      targetDate: "",
      strategy: "M&A",
      readinessScore: 0,
    },
    documents: [],
    updatedAt: new Date().toISOString(),
  };
}

// Seed a sensible demo dataset so screens look populated immediately after setup.
export function seedFromQuickSetup(input: {
  name: string;
  entityType: EntityType;
  annualRevenue: number;
  valuation?: number;
}): BusinessState {
  const base = emptyBusiness();
  const revenue = Math.max(0, input.annualRevenue);
  const valuation = input.valuation && input.valuation > 0 ? input.valuation : Math.round(revenue * 2.4);
  const months = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
  const monthly = revenue / 12;
  const revenueHistory: RevenuePoint[] = months.map((m, i) => {
    const factor = 0.85 + i * 0.05;
    return {
      month: m,
      revenue: Math.round(monthly * factor),
      expenses: Math.round(monthly * factor * 0.62),
    };
  });

  return {
    ...base,
    setupComplete: true,
    name: input.name,
    entityType: input.entityType,
    valuation,
    valuationLastYear: Math.round(valuation * 0.88),
    annualRevenue: revenue,
    revenueMoM: 4.2,
    netProfit: Math.round(revenue * 0.18),
    netProfitMargin: 18,
    cashFlow: Math.round(revenue * 0.06),
    nextTaxDue: nextQuarterEnd(),
    revenueHistory,
    ownership: { yourPct: 100, partners: [], vesting: null, funding: [] },
    exit: {
      targetValuation: Math.round(valuation * 2),
      targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 5).toISOString(),
      strategy: "M&A",
      readinessScore: 22,
    },
  };
}

// Rich demo dataset for the test/reviewer account. Populates every section
// of the business workspace so screens look fully lived-in.
export function seedDemoBusiness(): BusinessState {
  const base = seedFromQuickSetup({
    name: "Whitfield Ventures LLC",
    entityType: "LLC",
    annualRevenue: 2_400_000,
    valuation: 6_200_000,
  });

  const assets: BusinessAsset[] = [
    { id: makeId(), name: "Headquarters Building", type: "Real Estate", value: 1_850_000, source: "manual" },
    { id: makeId(), name: "Production Equipment", type: "Equipment", value: 420_000, source: "manual" },
    { id: makeId(), name: "Accounts Receivable", type: "Receivables", value: 285_000, source: "manual" },
    { id: makeId(), name: "Inventory on Hand", type: "Inventory", value: 162_000, source: "manual" },
  ];

  const liabilities: BusinessLiability[] = [
    { id: makeId(), name: "Commercial Mortgage", lender: "First Republic Bank", balance: 1_180_000, monthlyPayment: 8_420, interestRate: 5.25, source: "manual" },
    { id: makeId(), name: "Equipment Loan", lender: "Wells Fargo", balance: 142_000, monthlyPayment: 3_180, interestRate: 6.4, source: "manual" },
    { id: makeId(), name: "Revolving Line of Credit", lender: "JPMorgan Chase", balance: 86_000, monthlyPayment: 1_950, interestRate: 8.1, source: "manual" },
  ];

  const partners: Partner[] = [
    { id: makeId(), name: "Catherine Whitfield", pct: 25 },
    { id: makeId(), name: "Marcus Holloway", pct: 10 },
  ];

  const funding: FundingRound[] = [
    { id: makeId(), label: "Founders", date: "2018-03-15", amount: 250_000, valuation: 1_000_000 },
    { id: makeId(), label: "Seed", date: "2020-09-01", amount: 800_000, valuation: 3_200_000 },
    { id: makeId(), label: "Series A", date: "2023-06-12", amount: 2_500_000, valuation: 12_000_000 },
  ];

  const insurance: BusinessInsurance[] = [
    { id: makeId(), type: "Key Person", insurer: "Northwestern Mutual", coverage: 3_000_000, premium: 4_800, premiumFreq: "annual", status: "active", renewalDate: "2026-09-12", parsedByAI: false },
    { id: makeId(), type: "Liability", insurer: "Chubb", coverage: 5_000_000, premium: 612, premiumFreq: "monthly", status: "active", renewalDate: "2026-11-30", parsedByAI: false },
    { id: makeId(), type: "D&O", insurer: "AIG", coverage: 2_000_000, premium: 3_400, premiumFreq: "annual", status: "renewal due", renewalDate: "2026-06-01", parsedByAI: false },
    { id: makeId(), type: "Business Interruption", insurer: "Travelers", coverage: 1_500_000, premium: 285, premiumFreq: "monthly", status: "active", renewalDate: "2027-01-15", parsedByAI: false },
  ];

  const documents: BusinessDocument[] = [
    { id: makeId(), name: "Articles of Incorporation.pdf", category: "Articles of Incorporation", uploadedAt: "2018-03-20T10:00:00Z", status: "current" },
    { id: makeId(), name: "Operating Agreement (2023).pdf", category: "Operating Agreement", uploadedAt: "2023-07-01T10:00:00Z", status: "current" },
    { id: makeId(), name: "2024 Federal Tax Return.pdf", category: "Tax Return", uploadedAt: "2025-04-10T10:00:00Z", status: "current" },
    { id: makeId(), name: "Buy-Sell Agreement.pdf", category: "Buy-Sell Agreement", uploadedAt: "2023-08-15T10:00:00Z", status: "review" },
    { id: makeId(), name: "Succession Plan Draft.pdf", category: "Succession Plan", uploadedAt: "2025-01-22T10:00:00Z", status: "review" },
  ];

  return {
    ...base,
    cpa: { name: "David Chen, CPA", firm: "Chen & Associates", contact: "david@chencpa.com" },
    bankConnected: true,
    bankLastSync: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    assets,
    liabilities,
    ownership: {
      yourPct: 65,
      partners,
      vesting: {
        cliffDate: "2019-03-15",
        fullVestDate: "2026-03-15",
        progressPct: 88,
      },
      funding,
    },
    insurance,
    succession: {
      status: "In Progress",
      successorName: "Catherine Whitfield",
      successorRole: "COO → CEO",
      buySellSigned: true,
      attorney: "Holloway & Sterne LLP",
    },
    exit: {
      ...base.exit,
      readinessScore: 64,
    },
    documents,
  };
}

function nextQuarterEnd(): string {
  const d = new Date();
  const m = d.getMonth();
  const quarterEndMonth = [2, 5, 8, 11].find((q) => q >= m) ?? 2;
  const year = quarterEndMonth >= m ? d.getFullYear() : d.getFullYear() + 1;
  return new Date(year, quarterEndMonth, 15).toISOString();
}

export function loadBusiness(): BusinessState {
  if (typeof window === "undefined") return emptyBusiness();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyBusiness();
    const parsed = JSON.parse(raw) as Partial<BusinessState>;
    return { ...emptyBusiness(), ...parsed };
  } catch {
    return emptyBusiness();
  }
}

export function saveBusiness(state: BusinessState): void {
  if (typeof window === "undefined") return;
  const next = { ...state, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("aether:business:changed"));
}

// Reactive helpers ----------------------------------------------------------
export function subscribeBusiness(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("aether:business:changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("aether:business:changed", handler);
    window.removeEventListener("storage", handler);
  };
}

export function netBusinessEquity(state: BusinessState): number {
  const a = state.assets.reduce((s, x) => s + (x.value || 0), 0);
  const l = state.liabilities.reduce((s, x) => s + (x.balance || 0), 0);
  return a - l;
}

export function makeAsset(partial: Partial<BusinessAsset> = {}): BusinessAsset {
  return {
    id: makeId(),
    name: partial.name ?? "New asset",
    type: partial.type ?? "Equipment",
    value: partial.value ?? 0,
  };
}

export function makeLiability(partial: Partial<BusinessLiability> = {}): BusinessLiability {
  return {
    id: makeId(),
    name: partial.name ?? "New liability",
    lender: partial.lender ?? "",
    balance: partial.balance ?? 0,
    monthlyPayment: partial.monthlyPayment ?? 0,
    interestRate: partial.interestRate ?? 0,
  };
}

export function makePartner(partial: Partial<Partner> = {}): Partner {
  return { id: makeId(), name: partial.name ?? "New partner", pct: partial.pct ?? 0 };
}

export function makeFundingRound(partial: Partial<FundingRound> = {}): FundingRound {
  return {
    id: makeId(),
    label: partial.label ?? "Seed",
    date: partial.date ?? new Date().toISOString().slice(0, 10),
    amount: partial.amount ?? 0,
    valuation: partial.valuation ?? 0,
  };
}

export function makeInsurance(partial: Partial<BusinessInsurance> = {}): BusinessInsurance {
  return {
    id: makeId(),
    type: partial.type ?? "Liability",
    insurer: partial.insurer ?? "",
    coverage: partial.coverage ?? 0,
    premium: partial.premium ?? 0,
    premiumFreq: partial.premiumFreq ?? "annual",
    status: partial.status ?? "active",
    renewalDate: partial.renewalDate ?? null,
    parsedByAI: partial.parsedByAI ?? false,
  };
}

export function makeDocument(partial: Partial<BusinessDocument> = {}): BusinessDocument {
  return {
    id: makeId(),
    name: partial.name ?? "Document.pdf",
    category: partial.category ?? "Other",
    uploadedAt: partial.uploadedAt ?? new Date().toISOString(),
    status: partial.status ?? "current",
  };
}
