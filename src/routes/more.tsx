import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  Bell,
  LogOut,
  ChevronRight,
  Building2,
  Link as LinkIcon,
  Sparkles,
  Crown,
  ArrowRight,
  ShieldCheck,
  Rocket,
} from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";

import { useAuth } from "@/lib/auth-context";
import { useAccess } from "@/lib/access-context";
import { isIosNative } from "@/lib/native";
import { toast } from "sonner";

export const Route = createFileRoute("/more")({
  head: () => ({
    meta: [
      { title: "More — Æther Wealth" },
      { name: "description", content: "Settings and additional tools." },
    ],
  }),
  component: () => (
    <RequireOnboarding>
      <MorePage />
    </RequireOnboarding>
  ),
});

function MorePage() {
  const { signOut } = useAuth();
  const access = useAccess();
  const navigate = useNavigate();
  const hasAccess = access.hasAccess;

  async function handleSignOut() {
    try {
      await signOut();
      toast.success("Signed out");
      navigate({ to: "/signin" });
    } catch {
      toast.error("Could not sign out");
    }
  }

  return (
    <MobileShell title="More" subtitle="Tools & settings">
      <div className="flex flex-col gap-3 px-5">
        {!isIosNative() && (
          <Link
            to="/pricing"
            className="relative flex items-center justify-between overflow-hidden rounded-2xl border border-primary/30 gradient-hero px-4 py-3.5 glow-violet"
          >
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/30 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
                <Crown className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="label-mono text-primary/80">Membership</p>
                <p className="text-sm text-foreground">Compare tiers and upgrade</p>
              </div>
            </div>
            <ArrowRight className="relative h-4 w-4 text-primary" />
          </Link>
        )}
        {!hasAccess && (
          <LuxCard>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                <LogOut className="h-4 w-4 text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-destructive">Sign out</p>
                <p className="text-[11px] text-muted-foreground">Use a different account</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </LuxCard>
        )}

        

        {hasAccess && access.isAdmin && (
          <NavGroup title="Admin">
            <NavRow
              to="/launch"
              icon={Rocket}
              label="Launch Readiness"
              desc="Critical checklist to ship live"
            />
            <NavRow
              to="/admin"
              icon={ShieldCheck}
              label="Admin Console"
              desc="Members, access, and revenue"
            />
          </NavGroup>
        )}

        {hasAccess && (access.tier === "family" || access.isAdmin) && (
          <Link
            to="/family-office"
            className="relative flex items-center justify-between overflow-hidden rounded-2xl border border-gold/40 bg-[oklch(0.20_0.025_280)] px-4 py-3.5 shadow-[0_0_40px_-15px_oklch(0.82_0.12_85/0.45)]"
          >
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gold/20 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15">
                <Crown className="h-4 w-4 text-gold" />
              </div>
              <div>
                <p className="label-mono text-gold/80">Family Office</p>
                <p className="text-sm text-foreground">Your dedicated private office</p>
              </div>
            </div>
            <ArrowRight className="relative h-4 w-4 text-gold" />
          </Link>
        )}

        {hasAccess && (
          <>
            <NavGroup title="Wealth tools">
              <NavRow to="/timeline" icon={BarChart3} label="Net Worth Timeline" desc="Wealth over time" />
              <NavRow to="/beneficiaries" icon={Users} label="Beneficiaries" desc="Who inherits what" />
              <NavRow to="/family" icon={Users} label="Family Vault" desc="Linked household accounts" />
            </NavGroup>

            <NavGroup title="Connections">
              <NavRow to="/eligibility" icon={Sparkles} label="Integration eligibility" desc="See what's available in your region" />
              <NavRow to="/connections" icon={LinkIcon} label="Linked Institutions" desc="Plaid · banks, brokerage, investments" />
              <NavRow to="/connections" icon={Building2} label="Banking" desc="Manage cash & transfers" />
            </NavGroup>
          </>
        )}

        <NavGroup title="Account">
          {hasAccess && (
            <>
              <NavRow to="/notifications" icon={Bell} label="Notifications" desc="Push or encrypted email" />
              <NavRow to="/preferences" icon={Settings} label="Preferences" desc="Currency, region, privacy" />
              <NavRow to="/support" icon={HelpCircle} label="Concierge support" desc="24/7 private line" />
            </>
          )}
          {hasAccess && (
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                <LogOut className="h-4 w-4 text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-destructive">Sign out</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </NavGroup>

        <p className="mt-2 text-center font-serif text-xs italic text-muted-foreground">
          Æther Wealth · v1.0 · Private Office Edition
        </p>
      </div>
    </MobileShell>
  );
}

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label-mono mb-2 px-1">{title}</p>
      <LuxCard className="divide-y divide-white/[0.04]">{children}</LuxCard>
    </div>
  );
}

function NavRow({ to, icon: Icon, label, desc }: { to: string; icon: typeof Users; label: string; desc?: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.04]">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{label}</p>
        {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
