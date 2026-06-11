// Mock data for Æther Wealth
export const netWorth = {
  total: 4_287_540,
  ytdChange: 12.4,
  ytdAmount: 472_180,
};

export const allocation = {
  investments: 2_840_000,
  banking: 612_540,
  trust: 835_000,
};

export const recentActivity = [
  { id: 1, type: "buy", title: "Purchased VTI", amount: 25000, date: "2 hours ago" },
  { id: 2, type: "dividend", title: "AAPL Dividend", amount: 1842, date: "Yesterday" },
  { id: 3, type: "premium", title: "Life Insurance Premium", amount: -485, date: "2 days ago" },
  { id: 4, type: "transfer", title: "Trust Distribution", amount: 12500, date: "5 days ago" },
  { id: 5, type: "review", title: "Will reviewed by counsel", amount: 0, date: "1 week ago" },
];

export const advisor = {
  name: "Eleanor Whitfield",
  title: "Senior Wealth Advisor",
  firm: "Æther Wealth Private Office",
  nextMeeting: "Tue, May 6 · 10:30 AM",
  initials: "EW",
};

export type Holding = {
  ticker: string;
  name: string;
  type: "ETF" | "Stock" | "Bond" | "REIT";
  shares: number;
  price: number;
  value: number;
  ytd: number;
  spark: number[];
};

export const holdings: Holding[] = [
  { ticker: "VTI", name: "Vanguard Total Market", type: "ETF", shares: 4200, price: 268.42, value: 1_127_364, ytd: 14.2, spark: [240, 245, 242, 250, 255, 252, 260, 265, 268] },
  { ticker: "AAPL", name: "Apple Inc.", type: "Stock", shares: 1850, price: 224.18, value: 414_733, ytd: 18.6, spark: [190, 195, 200, 198, 210, 215, 220, 222, 224] },
  { ticker: "BND", name: "Vanguard Total Bond", type: "Bond", shares: 5800, price: 73.84, value: 428_272, ytd: 2.8, spark: [72, 72.5, 72.8, 73, 73.2, 73.4, 73.5, 73.7, 73.84] },
  { ticker: "VNQ", name: "Vanguard Real Estate", type: "REIT", shares: 1200, price: 92.15, value: 110_580, ytd: 6.4, spark: [86, 87, 88, 89, 90, 91, 91.5, 92, 92.15] },
  { ticker: "MSFT", name: "Microsoft", type: "Stock", shares: 920, price: 428.50, value: 394_220, ytd: 22.1, spark: [380, 385, 395, 400, 410, 415, 420, 425, 428] },
  { ticker: "VXUS", name: "Vanguard Intl Stock", type: "ETF", shares: 2400, price: 64.20, value: 154_080, ytd: 8.9, spark: [58, 59, 60, 61, 62, 63, 63.5, 64, 64.2] },
  { ticker: "TLT", name: "20+ Yr Treasury", type: "Bond", shares: 1800, price: 88.95, value: 160_110, ytd: -1.2, spark: [92, 91, 90.5, 90, 89.5, 89, 88.8, 88.9, 88.95] },
];

export type Policy = {
  id: string;
  type: "Life" | "Home" | "Umbrella" | "Auto" | "Disability";
  provider: string;
  coverage: number;
  premium: number;
  status: "Active" | "Renewal Due" | "Pending";
  policyNumber: string;
};

export const policies: Policy[] = [
  { id: "p1", type: "Life", provider: "Northwestern Mutual", coverage: 5_000_000, premium: 485, status: "Active", policyNumber: "NWM-8842-LF" },
  { id: "p2", type: "Home", provider: "Chubb Masterpiece", coverage: 3_200_000, premium: 412, status: "Active", policyNumber: "CHB-2241-HM" },
  { id: "p3", type: "Umbrella", provider: "Chubb Excess", coverage: 10_000_000, premium: 178, status: "Active", policyNumber: "CHB-9981-UM" },
  { id: "p4", type: "Auto", provider: "PURE Insurance", coverage: 1_000_000, premium: 248, status: "Renewal Due", policyNumber: "PUR-3382-AT" },
  { id: "p5", type: "Disability", provider: "Guardian", coverage: 2_400_000, premium: 295, status: "Active", policyNumber: "GRD-1124-DI" },
];

export type TrustAccount = {
  id: string;
  name: string;
  type: string;
  value: number;
  beneficiaries: number;
  trustee: string;
};

export const trustAccounts: TrustAccount[] = [
  { id: "t1", name: "Whitfield Family Revocable Trust", type: "Revocable Living", value: 485_000, beneficiaries: 4, trustee: "Self & Spouse" },
  { id: "t2", name: "Heritage Irrevocable Trust", type: "Irrevocable", value: 350_000, beneficiaries: 2, trustee: "First Republic Trust Co." },
];

export type EstateDoc = {
  id: string;
  name: string;
  status: "Current" | "Needs Review" | "Missing";
  updated: string;
  lawyer?: string;
};

export const estateDocs: EstateDoc[] = [
  { id: "d1", name: "Last Will & Testament", status: "Current", updated: "Mar 2024" },
  { id: "d2", name: "Healthcare Directive", status: "Current", updated: "Mar 2024" },
  { id: "d3", name: "Power of Attorney", status: "Needs Review", updated: "Aug 2021" },
  { id: "d4", name: "HIPAA Authorization", status: "Current", updated: "Mar 2024" },
  { id: "d5", name: "Letter of Intent", status: "Missing", updated: "—" },
];

export const attorney = {
  name: "Marcus Holloway, Esq.",
  firm: "Holloway & Sterne LLP",
  phone: "+1 (415) 555-0142",
  initials: "MH",
};

export type Beneficiary = {
  id: string;
  name: string;
  relationship: string;
  initials: string;
  allocations: { account: string; pct: number }[];
};

export const beneficiaries: Beneficiary[] = [
  {
    id: "b1", name: "Catherine Whitfield", relationship: "Spouse", initials: "CW",
    allocations: [
      { account: "401(k) — Fidelity", pct: 100 },
      { account: "Life Insurance", pct: 100 },
      { account: "Revocable Trust", pct: 50 },
    ],
  },
  {
    id: "b2", name: "Oliver Whitfield", relationship: "Son", initials: "OW",
    allocations: [
      { account: "Revocable Trust", pct: 25 },
      { account: "529 Plan", pct: 50 },
      { account: "Will — Residual", pct: 50 },
    ],
  },
  {
    id: "b3", name: "Amelia Whitfield", relationship: "Daughter", initials: "AW",
    allocations: [
      { account: "Revocable Trust", pct: 25 },
      { account: "529 Plan", pct: 50 },
      { account: "Will — Residual", pct: 50 },
    ],
  },
];

export const conflicts = [
  {
    id: "c1",
    severity: "high" as const,
    title: "401(k) vs Will mismatch",
    detail: "Your 401(k) names spouse 100%, but your will splits residual estate equally to children. Beneficiary designation supersedes will.",
  },
  {
    id: "c2",
    severity: "medium" as const,
    title: "Life Insurance has no contingent beneficiary",
    detail: "Add a contingent beneficiary in case primary beneficiary predeceases you.",
  },
];

// Net worth timeline data
const generateTimeline = (months: number, base: number, growth: number) => {
  const data: { date: string; value: number; investments: number; banking: number; trust: number }[] = [];
  let value = base;
  const now = new Date();
  for (let i = months; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const noise = (Math.random() - 0.45) * 0.04;
    value = value * (1 + growth / 100 + noise);
    data.push({
      date: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      value: Math.round(value),
      investments: Math.round(value * 0.66),
      banking: Math.round(value * 0.14),
      trust: Math.round(value * 0.20),
    });
  }
  return data;
};

export const timelines = {
  "1M": generateTimeline(1, 4_240_000, 1.1),
  "6M": generateTimeline(6, 3_950_000, 1.4),
  "1Y": generateTimeline(12, 3_650_000, 1.0),
  "All": generateTimeline(36, 1_800_000, 2.2),
};

export type FamilyMember = {
  id: string;
  name: string;
  relationship: string;
  age: number;
  initials: string;
  netWorth: number;
  accounts: { name: string; balance: number }[];
};

export const family: FamilyMember[] = [
  {
    id: "f1", name: "Catherine Whitfield", relationship: "Spouse", age: 48, initials: "CW", netWorth: 1_240_000,
    accounts: [
      { name: "Roth IRA — Schwab", balance: 485_000 },
      { name: "Brokerage — Fidelity", balance: 612_000 },
      { name: "Checking — JPMC", balance: 143_000 },
    ],
  },
  {
    id: "f2", name: "Oliver Whitfield", relationship: "Son", age: 16, initials: "OW", netWorth: 84_000,
    accounts: [
      { name: "529 Plan", balance: 78_000 },
      { name: "UTMA Brokerage", balance: 6_000 },
    ],
  },
  {
    id: "f3", name: "Amelia Whitfield", relationship: "Daughter", age: 14, initials: "AW", netWorth: 76_000,
    accounts: [
      { name: "529 Plan", balance: 72_000 },
      { name: "UTMA Brokerage", balance: 4_000 },
    ],
  },
];
