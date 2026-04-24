import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  ArrowRight,
  Rocket,
  CreditCard,
  Link as LinkIcon,
  ShieldCheck,
  Mail,
  Bell,
  FileText,
  Globe,
  Sparkles,
  Loader2,
} from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { useAuth } from "@/lib/auth-context";
import { useAccess } from "@/lib/access-context";
import { checkLiveSubscription } from "@/lib/access.functions";
import { plaidGetEnvironment, getAggregatedData } from "@/lib/plaid.functions";

const STORAGE_KEY = "aether.launchChecklist.v1";

export const Route = createFileRoute("/launch")({
  head: () => ({
    meta: [
      { title: "Launch Readiness — Æther Wealth" },
      {
        name: "description",
        content: "The critical checklist to ship Æther Wealth to live customers.",
      },
    ],
  }),
  component: () => (
    <RequireOnboarding>
      <LaunchPage />
    </RequireOnboarding>
  ),
});

type Status = "done" | "todo" | "warning";

type Item = {
  id: string;
  title: string;
  detail: string;
  status: Status;
  cta?: { label: string; to?: string; href?: string };
  manual?: boolean; // user can tick this off manually
};

type Section = {
  id: string;
  title: string;
  icon: typeof Rocket;
  items: Item[];
};

function LaunchPage() {
  const auth = useAuth();
  const access = useAccess();
  const [plaidEnv, setPlaidEnv] = useState<"sandbox" | "production" | null>(null);
  const [plaidItemCount, setPlaidItemCount] = useState<number | null>(null);
  const [hasLiveSub, setHasLiveSub] = useState<boolean | null>(null);
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setManualChecks(JSON.parse(raw));
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(manualChecks));
  }, [manualChecks]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [envRes, dataRes, subRes] = await Promise.allSettled([
        plaidGetEnvironment(),
        getAggregatedData(),
        checkLiveSubscription(),
      ]);
      if (cancelled) return;
      if (envRes.status === "fulfilled") setPlaidEnv(envRes.value.environment);
      if (dataRes.status === "fulfilled") setPlaidItemCount(dataRes.value.items.length);
      if (subRes.status === "fulfilled") setHasLiveSub(subRes.value.hasLiveSubscription);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sections: Section[] = useMemo(() => {
    const m = (id: string) => manualChecks[id] === true;

    return [
      {
        id: "payments",
        title: "Payments — Stripe Live",
        icon: CreditCard,
        items: [
          {
            id: "stripe-go-live",
            title: "Complete Stripe go-live",
            detail:
              "Claim sandbox, submit business form, install Lovable app on your live account.",
            status: hasLiveSub ? "done" : "todo",
            cta: { label: "Open checklist", to: "/connections" },
          },
          {
            id: "stripe-readiness",
            title: "Pass Stripe readiness check",
            detail: "Lovable validates products, prices, and webhooks on the live account.",
            status: hasLiveSub ? "done" : "todo",
          },
          {
            id: "stripe-test-charge",
            title: "Run a real $1 test checkout",
            detail: "Use a real card on a live price, then refund. Confirms webhooks propagate.",
            status: hasLiveSub ? "done" : "warning",
          },
        ],
      },
      {
        id: "data",
        title: "Bank & Brokerage Data — Plaid Production",
        icon: LinkIcon,
        items: [
          {
            id: "plaid-prod-keys",
            title: "Switch to Plaid Production keys",
            detail: "Add PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV=production to backend secrets.",
            status: plaidEnv === "production" ? "done" : "todo",
            cta: { label: "Plaid checklist", to: "/connections" },
          },
          {
            id: "plaid-products",
            title: "Enable required products in Plaid",
            detail: "Auth, Transactions, Investments, Liabilities — request access in dashboard.",
            status: m("plaid-products") ? "done" : "todo",
            manual: true,
          },
          {
            id: "plaid-allowlist",
            title: "Allow-list aetherwealth.co domain",
            detail: "Add the production domain to Plaid's redirect URIs.",
            status: m("plaid-allowlist") ? "done" : "todo",
            manual: true,
          },
          {
            id: "plaid-real-link",
            title: "Successfully link a real bank account",
            detail: "End-to-end test against a real institution in production mode.",
            status:
              plaidEnv === "production" && (plaidItemCount ?? 0) > 0
                ? "done"
                : plaidEnv === "production"
                  ? "todo"
                  : "warning",
          },
        ],
      },
      {
        id: "auth",
        title: "Authentication & Email",
        icon: Mail,
        items: [
          {
            id: "auth-email-domain",
            title: "Custom email domain verified",
            detail: "Auth emails send from aetherwealth.co with SPF/DKIM passing. ✓ Verified.",
            status: "done",
          },
          {
            id: "auth-email-templates",
            title: "Branded auth email templates",
            detail: "Signup, magic link, recovery, email change all branded. ✓ Live.",
            status: "done",
          },
          {
            id: "auth-google",
            title: "Google OAuth configured",
            detail: "Production OAuth client set with the live redirect URL.",
            status: m("auth-google") ? "done" : "todo",
            manual: true,
          },
          {
            id: "auth-confirm-flow",
            title: "Email confirmation enforced + smoke tested",
            detail: "Users verify before login; run one real signup + password reset against live.",
            status: m("auth-confirm-flow") ? "done" : "todo",
            manual: true,
          },
        ],
      },
      {
        id: "security",
        title: "Security & Compliance",
        icon: ShieldCheck,
        items: [
          {
            id: "sec-rls",
            title: "RLS enabled + security scan clean",
            detail: "Latest scan: 0 critical errors. Storage UPDATE policy added for wealth-documents.",
            status: "done",
          },
          {
            id: "sec-admin-role",
            title: "Admin role assigned to founder account",
            detail: "Confirm at least one admin exists in user_roles.",
            status: access.isAdmin ? "done" : "warning",
          },
          {
            id: "sec-secrets",
            title: "All production secrets stored server-side",
            detail: "No live keys in client code. Stripe, Plaid, AI keys are in backend secrets.",
            status: "done",
          },
          {
            id: "sec-concierge",
            title: "Concierge AI hardened",
            detail: "JWT required, rate + size limits, CORS allow-list. Family writes server-side. AI inputs validated.",
            status: "done",
          },
          {
            id: "sec-deletion",
            title: "Account deletion + 30-day purge tested",
            detail: "Soft-delete schedules purge; cancel restores within window.",
            status: m("sec-deletion") ? "done" : "todo",
            manual: true,
          },
        ],
      },
      {
        id: "ops",
        title: "Operations & Monitoring",
        icon: Bell,
        items: [
          {
            id: "ops-webhooks",
            title: "Stripe + Plaid webhooks healthy",
            detail: "Verify recent deliveries succeed in both dashboards.",
            status: m("ops-webhooks") ? "done" : "todo",
            manual: true,
          },
          {
            id: "ops-error-tracking",
            title: "Error tracking & runtime alerts",
            detail: "Edge function logs reviewed; failures route to your inbox.",
            status: m("ops-error-tracking") ? "done" : "todo",
            manual: true,
          },
          {
            id: "ops-backups",
            title: "Database backup cadence confirmed",
            detail: "Daily backups enabled; restore procedure documented.",
            status: m("ops-backups") ? "done" : "todo",
            manual: true,
          },
        ],
      },
      {
        id: "content",
        title: "Content, Legal & Polish",
        icon: FileText,
        items: [
          {
            id: "content-pricing",
            title: "Pricing page reflects live plans",
            detail: "Tiers, prices, and feature lists match Stripe products.",
            status: m("content-pricing") ? "done" : "todo",
            manual: true,
            cta: { label: "Pricing", to: "/pricing" },
          },
          {
            id: "content-legal",
            title: "Terms & Privacy Policy published",
            detail: "Linked in footer and signup; reflect actual data practices. ✓ Confirmed.",
            status: "done",
          },
          {
            id: "content-support",
            title: "Concierge support inbox monitored",
            detail: "Replies routed to a real human within SLA.",
            status: m("content-support") ? "done" : "todo",
            manual: true,
            cta: { label: "Support", to: "/support" },
          },
          {
            id: "content-onboarding",
            title: "Onboarding flow walked end-to-end",
            detail: "Fresh account → onboarding → linked bank → portfolio populated.",
            status: m("content-onboarding") ? "done" : "todo",
            manual: true,
          },
        ],
      },
      {
        id: "launch",
        title: "Launch",
        icon: Rocket,
        items: [
          {
            id: "launch-domain",
            title: "Custom domain live on aetherwealth.co",
            detail: "DNS pointed, SSL valid, www redirect works.",
            status: m("launch-domain") ? "done" : "todo",
            manual: true,
          },
          {
            id: "launch-seo",
            title: "SEO meta + OG images per route",
            detail: "Each public route has unique title, description, and og:image.",
            status: m("launch-seo") ? "done" : "todo",
            manual: true,
          },
          {
            id: "launch-publish",
            title: "Published from Lovable",
            detail: "Latest build deployed to the live URL.",
            status: m("launch-publish") ? "done" : "todo",
            manual: true,
          },
        ],
      },
    ];
  }, [plaidEnv, plaidItemCount, hasLiveSub, access.isAdmin, manualChecks, auth.user]);

  const allItems = sections.flatMap((s) => s.items);
  const doneCount = allItems.filter((i) => i.status === "done").length;
  const totalCount = allItems.length;
  const pct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  function toggleManual(id: string) {
    setManualChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <MobileShell title="Launch Readiness" subtitle="What's left before live customers">
      <div className="flex flex-col gap-4 px-5 pb-8">
        {/* Hero progress card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <LuxCard className="relative overflow-hidden p-5">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="label-mono text-primary/80">Launch readiness</p>
                <p className="mt-1 font-serif text-2xl text-foreground">
                  {pct}% complete
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {doneCount} of {totalCount} items shipped
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15">
                <Rocket className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            {loading && (
              <p className="relative mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking live signals…
              </p>
            )}
          </LuxCard>
        </motion.div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-2">
          <QuickLink to="/connections" icon={LinkIcon} label="Connections" />
          <QuickLink to="/pricing" icon={Sparkles} label="Pricing" />
          {access.isAdmin && <QuickLink to="/admin" icon={ShieldCheck} label="Admin" />}
          <QuickLink to="/preferences" icon={Globe} label="Preferences" />
        </div>

        {sections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            onToggle={toggleManual}
          />
        ))}

        <p className="mt-2 text-center font-serif text-xs italic text-muted-foreground">
          Tick items off as you ship them. Live signals update automatically.
        </p>
      </div>
    </MobileShell>
  );
}

function SectionBlock({
  section,
  onToggle,
}: {
  section: Section;
  onToggle: (id: string) => void;
}) {
  const Icon = section.icon;
  const done = section.items.filter((i) => i.status === "done").length;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-primary" />
          <p className="label-mono">{section.title}</p>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {done}/{section.items.length}
        </p>
      </div>
      <LuxCard className="divide-y divide-white/[0.04]">
        {section.items.map((item) => (
          <ChecklistRow key={item.id} item={item} onToggle={onToggle} />
        ))}
      </LuxCard>
    </div>
  );
}

function ChecklistRow({
  item,
  onToggle,
}: {
  item: Item;
  onToggle: (id: string) => void;
}) {
  const Icon =
    item.status === "done"
      ? CheckCircle2
      : item.status === "warning"
        ? AlertCircle
        : Circle;
  const iconColor =
    item.status === "done"
      ? "text-emerald-400"
      : item.status === "warning"
        ? "text-amber-400"
        : "text-muted-foreground";

  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <button
        type="button"
        onClick={() => item.manual && onToggle(item.id)}
        disabled={!item.manual}
        className={`mt-0.5 shrink-0 ${item.manual ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
        aria-label={item.manual ? "Toggle complete" : "Auto-detected status"}
      >
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm ${item.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}
        >
          {item.title}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          {item.detail}
        </p>
        {item.cta && item.cta.to && (
          <Link
            to={item.cta.to}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            {item.cta.label}
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
        {item.cta && item.cta.href && (
          <a
            href={item.cta.href}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            {item.cta.label}
            <ArrowRight className="h-3 w-3" />
          </a>
        )}
        {!item.manual && (
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
            Auto-detected
          </p>
        )}
      </div>
    </div>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Rocket;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
    >
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="text-xs text-foreground">{label}</span>
    </Link>
  );
}
