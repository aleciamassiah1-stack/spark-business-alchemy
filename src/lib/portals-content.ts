import {
  Users,
  Scroll,
  Briefcase,
  Landmark,
  Calculator,
  Umbrella,
  Building2,
  Lock,
  Home as HomeIcon,
  UserCheck,
  ClipboardList,
  ShieldCheck,
  FileText,
  HeartHandshake,
  Wallet,
  Mail,
  type LucideIcon,
} from "lucide-react";
import type { PortalContent } from "@/components/AudiencePortal";

export type PortalKey =
  | "families"
  | "attorneys"
  | "advisors"
  | "family-offices"
  | "cpas"
  | "insurance"
  | "household-managers";

export const PORTALS: { key: PortalKey; path: string; label: string; icon: LucideIcon; group: "audience" | "partner" }[] = [
  { key: "families", path: "/portals/families", label: "Families", icon: Users, group: "audience" },
  { key: "attorneys", path: "/portals/attorneys", label: "Estate Planning Attorneys", icon: Scroll, group: "audience" },
  { key: "advisors", path: "/portals/advisors", label: "Financial Advisors", icon: Briefcase, group: "audience" },
  { key: "family-offices", path: "/portals/family-offices", label: "Family Offices", icon: Landmark, group: "audience" },
  { key: "cpas", path: "/portals/cpas", label: "CPAs", icon: Calculator, group: "partner" },
  { key: "insurance", path: "/portals/insurance", label: "Insurance Professionals", icon: Umbrella, group: "partner" },
  { key: "household-managers", path: "/portals/household-managers", label: "Household Managers", icon: Building2, group: "partner" },
];

export const PORTAL_CONTENT: Record<PortalKey, PortalContent> = {
  families: {
    eyebrow: "For Families",
    title: "Keep your family's legacy organized.",
    subtitle: "One secure place for everything that matters across generations.",
    intro:
      "Æther helps families centralize estate documents, insurance, property, and key contacts — so the people you trust always know what to do, and where to look.",
    icon: Users,
    capabilities: [
      { icon: Lock, title: "Family Legacy Vault", copy: "Wills, trusts, directives, and account credentials in encrypted storage." },
      { icon: HomeIcon, title: "Asset Inventory", copy: "Real estate, businesses, insurance, and financial holdings in one view." },
      { icon: HeartHandshake, title: "Beneficiaries & Roles", copy: "Designate trustees, executors, and beneficiaries with clarity." },
      { icon: Users, title: "Family Directory", copy: "Contact information for everyone involved in your family's continuity." },
      { icon: ClipboardList, title: "Annual Review", copy: "Light-touch reminders to keep documents and beneficiaries current." },
      { icon: ShieldCheck, title: "Private by Default", copy: "Bank-grade encryption with granular access controls." },
    ],
    outcomes: [
      "Less stress for spouses and adult children",
      "No more lost documents or forgotten policies",
      "Smoother succession when it matters most",
      "Shared understanding of family wishes",
      "Peace of mind across every generation",
      "A single, trusted source of truth",
    ],
  },
  attorneys: {
    eyebrow: "For Estate Planning Attorneys",
    title: "Extend the value of every estate plan you draft.",
    subtitle: "Stay connected with clients long after signing — without adding admin overhead.",
    intro:
      "Æther gives your clients a private place to live with their plan. Documents stay current, beneficiaries stay aligned, and you stay relevant year after year.",
    icon: Scroll,
    capabilities: [
      { icon: FileText, title: "Plan Storage & Versions", copy: "Wills, trusts, POAs and directives kept alongside ancillary documents." },
      { icon: ClipboardList, title: "Annual Review Workflows", copy: "Trigger structured check-ins so plans don't drift out of date." },
      { icon: UserCheck, title: "Coordinated Advisors", copy: "Loop in CPAs, insurance professionals, and advisors when needed." },
      { icon: Users, title: "Beneficiary Tracking", copy: "Surface stale designations across accounts and policies." },
      { icon: Lock, title: "Privileged Access", copy: "Secure, audit-logged access for your firm and your clients." },
      { icon: ShieldCheck, title: "Continuity of Counsel", copy: "Position your firm as the long-term steward of the plan." },
    ],
    outcomes: [
      "Higher client retention beyond the engagement",
      "Fewer outdated plans returning years later",
      "Cleaner handoffs to executors and trustees",
      "A modern, premium client experience",
      "More referrals from satisfied families",
      "Stronger relationships with allied advisors",
    ],
  },
  advisors: {
    eyebrow: "For Financial Advisors",
    title: "Deliver a premium client experience your competitors can't.",
    subtitle: "Move beyond portfolios into true family wealth stewardship.",
    intro:
      "Æther helps you understand your clients' full picture — assets, documents, insurance, and people — so you can advise from a position of complete context.",
    icon: Briefcase,
    capabilities: [
      { icon: Wallet, title: "Full Net-Worth Picture", copy: "See investments, real estate, business equity, and liabilities together." },
      { icon: FileText, title: "Document Intelligence", copy: "Connect estate documents and policies to the plan you're managing." },
      { icon: Users, title: "Family Engagement", copy: "Bring spouses and next-gen into the conversation, on your terms." },
      { icon: UserCheck, title: "Advisor Coordination", copy: "Collaborate with attorneys, CPAs, and insurance professionals." },
      { icon: ClipboardList, title: "Review Cadence", copy: "Structured annual reviews that surface real planning opportunities." },
      { icon: ShieldCheck, title: "Trust & Security", copy: "Enterprise-grade infrastructure your compliance team will approve." },
    ],
    outcomes: [
      "Deeper share of wallet across the household",
      "Stronger multi-generational client retention",
      "More uncovered planning opportunities",
      "Faster, more accurate annual reviews",
      "A truly differentiated client experience",
      "Earned trust as the family's primary advisor",
    ],
  },
  "family-offices": {
    eyebrow: "For Family Offices",
    title: "A single source of truth for complex families.",
    subtitle: "Manage the operating system behind multi-generational wealth.",
    intro:
      "Æther centralizes the documents, assets, entities, and people behind every family you serve — with the controls and audit trails serious offices require.",
    icon: Landmark,
    capabilities: [
      { icon: Landmark, title: "Multi-Entity Structure", copy: "Trusts, LLCs, holding companies, and operating businesses in one map." },
      { icon: Wallet, title: "Consolidated Reporting", copy: "Roll up balances, valuations, and obligations across the family." },
      { icon: FileText, title: "Governance Documents", copy: "Operating agreements, trust instruments, and family charters." },
      { icon: Users, title: "Stakeholder Directory", copy: "Beneficiaries, trustees, professionals, and household staff." },
      { icon: Lock, title: "Role-Based Access", copy: "Granular permissions per branch, generation, or advisor." },
      { icon: ShieldCheck, title: "Audit & Compliance", copy: "Detailed activity logs for every action across the platform." },
    ],
    outcomes: [
      "Less time chasing scattered information",
      "Cleaner audit and compliance posture",
      "Faster onboarding for new staff and advisors",
      "Better cross-generation continuity",
      "Reduced operational risk",
      "More time for high-value strategic work",
    ],
  },
  cpas: {
    eyebrow: "For CPAs",
    title: "Plan and file with the full picture in view.",
    subtitle: "Bring tax planning closer to estate, business, and personal balance sheets.",
    intro:
      "Æther gives you and your clients shared visibility into the documents and assets that drive tax outcomes — without endless email threads at year end.",
    icon: Calculator,
    capabilities: [
      { icon: FileText, title: "Document Hub", copy: "Returns, K-1s, and supporting docs organized by year and entity." },
      { icon: Wallet, title: "Asset & Entity Map", copy: "Properties, businesses, and accounts linked to their owners." },
      { icon: UserCheck, title: "Advisor Coordination", copy: "Loop in attorneys and financial advisors when it matters." },
      { icon: ClipboardList, title: "Yearly Workflows", copy: "Structured prep and review cycles, with reminders." },
      { icon: Lock, title: "Secure Sharing", copy: "Replace email attachments with audit-logged document access." },
      { icon: ShieldCheck, title: "Compliance-Ready", copy: "Enterprise security designed for sensitive financial data." },
    ],
    outcomes: [
      "Smoother, less stressful tax seasons",
      "Earlier visibility into planning opportunities",
      "Fewer missing or outdated documents",
      "Stronger collaboration with allied advisors",
      "Deeper client relationships year-round",
      "A modern alternative to portal sprawl",
    ],
  },
  insurance: {
    eyebrow: "For Insurance Professionals",
    title: "Keep coverage aligned with the lives it protects.",
    subtitle: "Bring policies into the same place as the family's plan and assets.",
    intro:
      "Æther helps you and your clients see coverage in context — across life, property, liability, and business — so gaps and stale beneficiaries surface early.",
    icon: Umbrella,
    capabilities: [
      { icon: Umbrella, title: "Policy Inventory", copy: "All policies, carriers, and coverage amounts in one place." },
      { icon: HeartHandshake, title: "Beneficiary Tracking", copy: "Surface stale designations across life and retirement accounts." },
      { icon: HomeIcon, title: "Asset Alignment", copy: "Match coverage to actual property and business exposure." },
      { icon: ClipboardList, title: "Annual Reviews", copy: "Structured check-ins that make renewals a planning moment." },
      { icon: UserCheck, title: "Advisor Coordination", copy: "Stay aligned with attorneys, CPAs, and financial advisors." },
      { icon: ShieldCheck, title: "Trusted by Families", copy: "A premium experience that reflects the seriousness of coverage." },
    ],
    outcomes: [
      "Fewer coverage gaps discovered too late",
      "More upsell and cross-sell opportunities",
      "Stronger client retention at renewal",
      "Beneficiary designations that stay current",
      "A more consultative client relationship",
      "Cleaner collaboration with allied advisors",
    ],
  },
  "household-managers": {
    eyebrow: "For Household Managers",
    title: "Run the household with everything documented.",
    subtitle: "Vendors, properties, schedules, and key contacts — in one private hub.",
    intro:
      "Æther gives household managers a structured place to record what's needed to keep a principal's life running smoothly, with handoff continuity built in.",
    icon: Building2,
    capabilities: [
      { icon: HomeIcon, title: "Property Records", copy: "Residences, vehicles, warranties, and maintenance schedules." },
      { icon: Users, title: "Vendor & Staff Directory", copy: "Contacts, agreements, and access permissions in one place." },
      { icon: FileText, title: "Operating Documents", copy: "Manuals, procedures, and key information for the household." },
      { icon: ClipboardList, title: "Recurring Tasks", copy: "Annual reviews and seasonal workflows kept on track." },
      { icon: Lock, title: "Controlled Access", copy: "Granular permissions for staff, vendors, and advisors." },
      { icon: ShieldCheck, title: "Continuity Built-In", copy: "Smooth handoffs when staff or service providers change." },
    ],
    outcomes: [
      "Fewer dropped balls across the household",
      "Cleaner handoffs between staff and vendors",
      "Less reliance on tribal knowledge",
      "A documented, defensible operating system",
      "More time for proactive, high-touch service",
      "Confidence the principal is well cared for",
    ],
  },
};

void Mail;
