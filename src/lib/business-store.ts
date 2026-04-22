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
};

export type BusinessLiability = {
  id: string;
  name: string;
  lender: string;
  balance: number;
  monthlyPayment: number;
  interestRate: number;
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
