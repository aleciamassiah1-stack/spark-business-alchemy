import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Users, BarChart3, Settings, HelpCircle, Bell, LogOut, ChevronRight, Building2, Link as LinkIcon } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { useAuth } from "@/lib/auth-context";
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
  const navigate = useNavigate();

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
        <NavGroup title="Wealth tools">
          <NavRow to="/timeline" icon={BarChart3} label="Net Worth Timeline" desc="Wealth over time" />
          <NavRow to="/beneficiaries" icon={Users} label="Beneficiaries" desc="Who inherits what" />
          <NavRow to="/family" icon={Users} label="Family Vault" desc="Linked household accounts" />
        </NavGroup>

        <NavGroup title="Connections">
          <NavRow to="/connections" icon={LinkIcon} label="Linked Institutions" desc="Plaid · banks, brokerage, investments" />
          <NavRow to="/more" icon={Building2} label="Banking" desc="Manage cash & transfers" />
        </NavGroup>

        <NavGroup title="Account">
          <NavRow to="/notifications" icon={Bell} label="Notifications" desc="Push or encrypted email" />
          <NavRow to="/preferences" icon={Settings} label="Preferences" desc="Currency, region, privacy" />
          <NavRow to="/support" icon={HelpCircle} label="Concierge support" desc="24/7 private line" />
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
