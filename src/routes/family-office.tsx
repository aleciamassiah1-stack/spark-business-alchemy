import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  Calendar,
  Sparkles,
  Building2,
  Users,
  ShieldCheck,
  FileText,
  ArrowRight,
  Crown,
  Check,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { useAccess } from "@/lib/access-context";
import { submitServiceRequestWithEmail } from "@/lib/service-requests";

export const Route = createFileRoute("/family-office")({
  head: () => ({
    meta: [
      { title: "Family Office — Æther Wealth" },
      {
        name: "description",
        content:
          "Your dedicated Family Office hub: on-call wealth manager, multi-entity rollups, governance calendar, trustee & advisor seats.",
      },
      { property: "og:title", content: "Family Office — Æther Wealth" },
      {
        property: "og:description",
        content:
          "On-call wealth management, white-glove aggregation, governance and consolidated reporting for ultra-high-net-worth families.",
      },
    ],
  }),
  component: () => (
    <RequireOnboarding>
      <FamilyOfficePage />
    </RequireOnboarding>
  ),
});

function FamilyOfficePage() {
  const access = useAccess();
  const isFamily = access.tier === "family" || access.isAdmin;

  if (!access.ready) {
    return (
      <MobileShell>
        <div className="px-5 pt-10 text-center text-sm text-muted-foreground">Loading…</div>
      </MobileShell>
    );
  }

  if (!isFamily) {
    return <UpgradeWall />;
  }

  return <FamilyOfficeHub />;
}

function UpgradeWall() {
  return (
    <MobileShell>
      <div className="px-5 pt-12">
        <LuxCard className="gradient-card border-gold/40 p-6 shadow-[0_0_60px_-15px_oklch(0.82_0.12_85/0.4)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/15">
              <Crown className="h-5 w-5 text-gold" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
                Family Office
              </p>
              <h1 className="font-serif text-xl text-foreground">Reserved tier</h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            This space is reserved for Æther Family Office members — ultra-high-net-worth families
            with multi-entity structures, trustees, and dedicated wealth counsel.
          </p>
          <Link
            to="/pricing"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-gold/50 px-4 py-2.5 text-xs font-medium text-gold hover:bg-gold/10"
          >
            See Family Office <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </LuxCard>
      </div>
    </MobileShell>
  );
}

function FamilyOfficeHub() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      {/* Override the standard violet ambient with a gold one */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[60vh]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, oklch(0.82 0.12 85 / 0.18) 0%, transparent 55%)",
        }}
      />
      <div className="relative mx-auto min-h-screen w-full max-w-[430px]">
        <MobileShell>
          <Hero />
          <ManagerCard />
          <HouseholdLink />
          <QuickActions />
          <EntitiesRollup />
          <Governance />
          <Seats />
          <Reporting />
          <Audit />
        </MobileShell>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <div className="px-5 pt-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold">
          Family Office
        </p>
        <h1 className="mt-1 font-serif text-[34px] leading-tight text-foreground">
          Good day, <span className="text-gradient-gold">family</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your private office, on call.
        </p>
      </motion.div>
    </div>
  );
}

function ManagerCard() {
  return (
    <div className="px-5 pt-5">
      <LuxCard className="border-gold/25 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full gradient-gold text-base font-semibold text-background">
            EW
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
              On-call Wealth Manager
            </p>
            <p className="mt-0.5 font-serif text-lg text-foreground">Eleanor Whitfield</p>
            <p className="text-[11px] text-muted-foreground">
              Senior Counsel · Available 24/7
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <ManagerAction icon={Phone} label="Call" href="tel:+18005550199" />
          <ManagerAction icon={MessageCircle} label="Message" href="/support" internal />
          <ManagerAction icon={Calendar} label="Book" href="/support" internal />
        </div>
      </LuxCard>
    </div>
  );
}

function ManagerAction({
  icon: Icon,
  label,
  href,
  internal,
}: {
  icon: typeof Phone;
  label: string;
  href: string;
  internal?: boolean;
}) {
  const className =
    "flex flex-col items-center gap-1 rounded-xl border border-gold/20 bg-gold/5 px-2 py-3 text-gold transition-all hover:bg-gold/10";
  const inner = (
    <>
      <Icon className="h-4 w-4" />
      <span className="text-[11px] font-medium">{label}</span>
    </>
  );
  if (internal) {
    return (
      <Link to={href} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {inner}
    </a>
  );
}

function QuickActions() {
  async function submit(
    type: "wealth_manager" | "other" | "meeting",
    subject: string,
    successMsg: string,
  ) {
    try {
      await submitServiceRequestWithEmail({
        type,
        subject,
        body: { message: subject, source: "family-office:quick-actions" },
      });
      toast.success(successMsg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send request");
    }
  }
  return (
    <div className="px-5 pt-5">
      <p className="label-mono mb-2 px-1">White-glove services</p>
      <LuxCard className="divide-y divide-white/[0.04]">
        <ActionRow
          icon={Sparkles}
          title="Set up an account for me"
          desc="Our team will aggregate it on your behalf"
          onClick={() =>
            submit(
              "wealth_manager",
              "Set up an account for me",
              "Request sent. Your wealth manager will be in touch within 24h.",
            )
          }
        />
        <ActionRow
          icon={Building2}
          title="Add an entity (trust, LLC, foundation)"
          desc="We'll structure the rollup and tax treatment"
          onClick={() =>
            submit(
              "other",
              "Add an entity (trust, LLC, foundation)",
              "Entity request received. Expect a call shortly.",
            )
          }
        />
        <ActionRow
          icon={Users}
          title="Schedule a family meeting"
          desc="Annual governance with agenda preparation"
          onClick={() =>
            submit(
              "meeting",
              "Schedule a family meeting",
              "Governance team notified.",
            )
          }
        />
      </LuxCard>
    </div>
  );
}


function HouseholdLink() {
  return (
    <div className="px-5 pt-5">
      <Link to="/household" className="block">
        <LuxCard className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/10">
            <Users className="h-4 w-4 text-gold" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Manage household profiles</p>
            <p className="truncate text-xs text-muted-foreground">
              Add spouse, children, or trusts and invite logins
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </LuxCard>
      </Link>
    </div>
  );
}


function ActionRow({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: typeof Sparkles;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.02]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/10">
        <Icon className="h-4 w-4 text-gold" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-gold/70" />
    </button>
  );
}

function EntitiesRollup() {
  const entities = [
    { name: "Whitfield Family Trust", type: "Revocable Trust", value: "$24.6M" },
    { name: "WF Holdings LLC", type: "Operating Co.", value: "$12.1M" },
    { name: "Whitfield Foundation", type: "501(c)(3)", value: "$3.4M" },
    { name: "Personal — Eleanor", type: "Individual", value: "$8.9M" },
  ];
  return (
    <div className="px-5 pt-6">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="label-mono">Multi-entity rollup</p>
        <span className="font-mono text-[10px] text-muted-foreground">4 entities</span>
      </div>
      <LuxCard className="divide-y divide-white/[0.04]">
        {entities.map((e) => (
          <div key={e.name} className="flex items-center justify-between px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{e.name}</p>
              <p className="text-[11px] text-muted-foreground">{e.type}</p>
            </div>
            <p className="font-mono text-sm tabular-nums text-gold">{e.value}</p>
          </div>
        ))}
        <div className="flex items-center justify-between bg-gold/5 px-4 py-3.5">
          <p className="font-serif text-sm text-foreground">Consolidated</p>
          <p className="font-mono text-sm font-semibold tabular-nums text-gold">$49.0M</p>
        </div>
      </LuxCard>
    </div>
  );
}

function Governance() {
  return (
    <div className="px-5 pt-6">
      <p className="label-mono mb-2 px-1">Governance calendar</p>
      <LuxCard className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10">
            <Calendar className="h-5 w-5 text-gold" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Next family meeting
            </p>
            <p className="font-serif text-base text-foreground">Q3 Family Council</p>
            <p className="text-[11px] text-muted-foreground">Thu, Aug 14 · 4:00 PM ET</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <AgendaItem text="Q2 performance review" done />
          <AgendaItem text="2026 distribution policy" />
          <AgendaItem text="Next-gen onboarding (Charlotte, age 18)" />
          <AgendaItem text="Foundation grant cycle" />
        </div>
      </LuxCard>
    </div>
  );
}

function AgendaItem({ text, done }: { text: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-xs">
      <div
        className={`flex h-4 w-4 items-center justify-center rounded-full ${
          done ? "bg-gold/20" : "border border-gold/30"
        }`}
      >
        {done && <Check className="h-2.5 w-2.5 text-gold" />}
      </div>
      <span className={done ? "text-muted-foreground line-through" : "text-foreground"}>
        {text}
      </span>
    </div>
  );
}

function Seats() {
  const [seats] = useState([
    { name: "Marcus Reed, CPA", role: "Accountant", access: "View · Reporting" },
    { name: "Sarah Chen, Esq.", role: "Estate Attorney", access: "View · Legal" },
    { name: "James Whitfield", role: "Trustee", access: "Full" },
    { name: "Charlotte Whitfield", role: "Beneficiary", access: "View · Personal" },
  ]);
  return (
    <div className="px-5 pt-6">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="label-mono">Trustee & advisor seats</p>
        <button
          onClick={() => toast.success("Invite link copied to clipboard")}
          className="font-mono text-[10px] uppercase tracking-wider text-gold hover:text-gold/80"
        >
          + Invite
        </button>
      </div>
      <LuxCard className="divide-y divide-white/[0.04]">
        {seats.map((s) => (
          <div key={s.name} className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/10 text-[11px] font-semibold text-gold">
              {s.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{s.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {s.role} · {s.access}
              </p>
            </div>
            <ShieldCheck className="h-4 w-4 text-gold/60" />
          </div>
        ))}
      </LuxCard>
    </div>
  );
}

function Reporting() {
  return (
    <div className="px-5 pt-6">
      <p className="label-mono mb-2 px-1">Consolidated reporting</p>
      <LuxCard className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10">
            <FileText className="h-5 w-5 text-gold" />
          </div>
          <div className="flex-1">
            <p className="font-serif text-base text-foreground">Q2 2026 Family Report</p>
            <p className="text-[11px] text-muted-foreground">
              Branded PDF · advisor- and CPA-ready
            </p>
          </div>
        </div>
        <button
          onClick={() => toast.success("Report queued. Delivered to your secure inbox.")}
          className="mt-4 w-full rounded-full border border-gold/40 bg-gold/5 px-4 py-2.5 text-xs font-medium text-gold hover:bg-gold/10"
        >
          Generate report
        </button>
      </LuxCard>
    </div>
  );
}

function Audit() {
  return (
    <div className="px-5 pt-6">
      <p className="label-mono mb-2 px-1">Activity</p>
      <LuxCard className="divide-y divide-white/[0.04]">
        <AuditRow who="Marcus Reed" what="Viewed Q2 entity rollup" when="2h ago" />
        <AuditRow who="Sarah Chen" what="Downloaded estate vault" when="Yesterday" />
        <AuditRow who="Eleanor Whitfield" what="Approved trustee invite" when="2 days ago" />
      </LuxCard>
      <p className="mt-2 px-1 font-mono text-[10px] text-muted-foreground">
        Full audit log retained for fiduciary defense.
      </p>
    </div>
  );
}

function AuditRow({ who, what, when }: { who: string; what: string; when: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{who}</p>
        <p className="text-[11px] text-muted-foreground">{what}</p>
      </div>
      <p className="font-mono text-[10px] text-muted-foreground">{when}</p>
    </div>
  );
}
