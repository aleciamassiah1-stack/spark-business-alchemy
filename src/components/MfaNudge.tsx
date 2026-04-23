import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShieldCheck, X, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

const DISMISS_KEY_PREFIX = "aether:mfa-nudge-dismissed:";

/**
 * MfaNudge — One-time prompt encouraging users to enable 2FA.
 *
 * Shows only when ALL of these are true:
 *   - User is signed in & email-verified
 *   - No verified TOTP factor exists
 *   - User hasn't dismissed it (per-user localStorage)
 *
 * Dismissal is per-user so different accounts on the same device get
 * independent prompts. Once 2FA is enabled, the nudge disappears
 * permanently (the factor check fails on subsequent loads).
 */
export function MfaNudge() {
  const { user, emailConfirmed } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user || !emailConfirmed) {
      setShow(false);
      return;
    }
    const dismissKey = `${DISMISS_KEY_PREFIX}${user.id}`;
    if (typeof window !== "undefined" && localStorage.getItem(dismissKey)) {
      setShow(false);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error || cancelled) return;
        const hasVerifiedTotp = (data?.totp ?? []).some((f) => f.status === "verified");
        if (!cancelled) setShow(!hasVerifiedTotp);
      } catch {
        // fail-silent — don't block UI on transient errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, emailConfirmed]);

  if (!show || !user) return null;

  function dismiss() {
    if (typeof window !== "undefined") {
      localStorage.setItem(`${DISMISS_KEY_PREFIX}${user!.id}`, "1");
    }
    setShow(false);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-transparent p-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 glow-violet">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary/80">
            Recommended
          </p>
          <p className="mt-0.5 font-serif text-base text-foreground">
            Secure your vault with 2FA
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            Add an authenticator app for an extra layer of protection on your financial data.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate({ to: "/profile" })}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Enable 2FA <ArrowRight className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
