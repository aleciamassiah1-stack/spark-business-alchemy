import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { useAccess } from "@/lib/access-context";
import { getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (s: Record<string, unknown>) => ({
    session_id: typeof s.session_id === "string" ? s.session_id : "",
  }),
  head: () => ({
    meta: [
      { title: "Payment complete — Æther Wealth" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutReturnPage,
});

function CheckoutReturnPage() {
  const { session_id } = useSearch({ from: "/checkout/return" });
  const navigate = useNavigate();
  const access = useAccess();
  const [attempts, setAttempts] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const targetRoute = "/intake";

  // Poll access until the Stripe webhook has propagated the subscription.
  // Without this, /intake bounces the user back to /pricing because RequireOnboarding
  // sees `hasAccess === false` for the few seconds it takes the webhook to land.
  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const MAX_TRIES = 15; // ~15s at 1s intervals

    const tick = async () => {
      if (cancelled) return;
      tries += 1;
      setAttempts(tries);
      let hasAccess = false;
      try {
        if (session_id) {
          await supabase.functions.invoke("sync-checkout-session", {
            body: { sessionId: session_id, environment: getStripeEnvironment() },
          });
        }
        hasAccess = await access.refresh();
      } catch {
        /* ignore — try again */
      }
      if (cancelled) return;
      if (hasAccess) {
        navigate({ to: targetRoute });
        return;
      }
      if (tries >= MAX_TRIES) {
        setTimedOut(true);
        return;
      }
      window.setTimeout(tick, 1000);
    };

    void tick();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If access flips true at any point (e.g. focus refresh), continue immediately.
  useEffect(() => {
    if (access.hasAccess) navigate({ to: targetRoute });
  }, [access.hasAccess, navigate]);

  return (
    <MobileShell title="Payment" subtitle="Confirmation">
      <div className="px-5 pt-6">
        <LuxCard className="p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-serif text-2xl text-foreground">Payment received</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {timedOut
              ? "Your payment was received but activation is taking longer than usual. Continue below — you will not be asked to pay again."
              : "Welcome aboard. Activating your subscription…"}
          </p>

          {!timedOut && (
            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="font-mono uppercase tracking-[0.18em]">
                Confirming · {attempts}/15
              </span>
            </div>
          )}

          {session_id && (
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
              Confirmation · {session_id.slice(-8).toUpperCase()}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <Link
              to={targetRoute}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Continue to dashboard setup
            </Link>
            <Link
              to="/profile"
              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-white/[0.06]"
            >
              Skip to profile
            </Link>
          </div>
        </LuxCard>
      </div>
    </MobileShell>
  );
}
