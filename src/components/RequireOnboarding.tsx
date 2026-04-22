import type { ReactNode } from "react";
import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { Onboarding } from "@/components/Onboarding";
import { useOnboarding } from "@/lib/onboarding-context";
import { useAuth } from "@/lib/auth-context";
import { useAccess } from "@/lib/access-context";
import { useGuardedNavigate } from "@/lib/use-guarded-navigate";

/** Routes that an authenticated-but-unpaid user is allowed to reach. */
const UNPAID_ALLOWED = new Set([
  "/pricing",
  "/profile",
  "/checkout/return",
  "/signin",
  "/signup",
  "/verify-email",
]);

/**
 * Gates protected routes:
 *  1. Redirects to /signup when unauthenticated.
 *  2. Redirects to /verify-email when authenticated but email is unconfirmed.
 *  3. Shows the onboarding flow when authenticated but not yet onboarded.
 *  4. Redirects to /pricing when onboarded but without an active subscription
 *     (admins and comp'd users bypass).
 */
export function RequireOnboarding({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const onb = useOnboarding();
  const access = useAccess();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (auth.ready && !auth.user) {
      navigate({ to: "/signup" });
    }
  }, [auth.ready, auth.user, navigate]);

  useEffect(() => {
    if (auth.ready && auth.user && !auth.emailConfirmed && location.pathname !== "/verify-email") {
      navigate({ to: "/verify-email" });
    }
  }, [auth.ready, auth.user, auth.emailConfirmed, location.pathname, navigate]);

  useEffect(() => {
    if (
      auth.ready &&
      auth.user &&
      auth.emailConfirmed &&
      onb.ready &&
      onb.onboarded &&
      access.ready &&
      !access.hasAccess &&
      !UNPAID_ALLOWED.has(location.pathname)
    ) {
      navigate({ to: "/pricing" });
    }
  }, [auth.ready, auth.user, auth.emailConfirmed, onb.ready, onb.onboarded, access.ready, access.hasAccess, location.pathname, navigate]);

  if (!auth.ready || !onb.ready || !access.ready) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  if (!auth.user) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  if (!auth.emailConfirmed) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  if (!onb.onboarded) {
    return <Onboarding forceOpen />;
  }

  if (!access.hasAccess && !UNPAID_ALLOWED.has(location.pathname)) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  return <>{children}</>;
}
