import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User as UserIcon, Crown, CreditCard, LogOut, Mail, Calendar, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { MfaPanel } from "@/components/MfaPanel";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { isIosNative } from "@/lib/native";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Æther Wealth" },
      { name: "description", content: "Your private account, plan, and billing." },
    ],
  }),
  component: () => (
    <RequireOnboarding>
      <ProfilePage />
    </RequireOnboarding>
  ),
});

type Subscription = {
  status: string;
  price_id: string;
  product_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  environment: string;
};

const PLAN_LABELS: Record<string, string> = {
  essential_monthly: "Essential — Monthly",
  essential_annual: "Essential — Annual",
  private_monthly: "Private — Monthly",
  private_annual: "Private — Annual",
};

function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("status, price_id, product_id, current_period_end, cancel_at_period_end, environment")
        .eq("user_id", user.id)
        .eq("environment", getStripeEnvironment() === "sandbox" ? "sandbox" : "live")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        setSub(data as Subscription | null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleSignOut() {
    try {
      await signOut();
      toast.success("Signed out");
      navigate({ to: "/signin" });
    } catch {
      toast.error("Could not sign out");
    }
  }

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/profile`,
        },
      });
      if (error || !data?.url) throw new Error(error?.message || "Could not open billing portal");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPortalLoading(false);
    }
  }

  const planLabel = sub ? PLAN_LABELS[sub.price_id] || sub.price_id : null;
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "AE";
  const renewsAt = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <MobileShell title="Profile" subtitle="Account & subscription">
      <div className="flex flex-col gap-4 px-5 pb-6">
        {/* Identity card */}
        <LuxCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full gradient-violet text-lg font-medium text-primary-foreground glow-violet">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-xl text-foreground truncate">
                {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Member"}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{user?.email}</span>
              </p>
            </div>
          </div>
        </LuxCard>

        {/* Subscription card */}
        <div>
          <p className="label-mono mb-2 px-1">Subscription</p>
          <LuxCard className="p-5">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading plan…
              </div>
            ) : sub ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-gold" />
                      <p className="font-serif text-lg text-foreground">{planLabel}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground capitalize">
                      Status: <span className="text-foreground">{sub.status}</span>
                    </p>
                    {renewsAt && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {sub.cancel_at_period_end ? "Ends" : "Renews"} {renewsAt}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-success/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-success">
                    Active
                  </span>
                </div>
                <button
                  onClick={openBillingPortal}
                  disabled={portalLoading}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-white/[0.06] disabled:opacity-60"
                >
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" /> Manage billing
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <p className="font-serif text-lg text-foreground">No active plan</p>
                {isIosNative() ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Visit aetherwealth.co on the web to start, change or cancel a plan.
                    Your access will unlock here automatically.
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Choose a tier to unlock the full private office.
                    </p>
                    <button
                      onClick={() => navigate({ to: "/pricing" })}
                      className="mt-4 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 glow-violet"
                    >
                      View plans
                    </button>
                  </>
                )}
              </>
            )}
          </LuxCard>
        </div>

        {/* Two-factor auth */}
        <MfaPanel />

        {/* Account actions */}
        <div>
          <p className="label-mono mb-2 px-1">Account</p>
          <LuxCard className="divide-y divide-white/[0.04]">
            <button
              type="button"
              onClick={() => navigate({ to: "/preferences" })}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.04]">
                <UserIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">Preferences</p>
                <p className="text-[11px] text-muted-foreground">Currency, region, privacy</p>
              </div>
            </button>
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
            </button>
          </LuxCard>
        </div>
      </div>
    </MobileShell>
  );
}
