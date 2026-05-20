import type { ReactNode } from "react";
import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { Onboarding } from "@/components/Onboarding";
import { useOnboarding } from "@/lib/onboarding-context";
import { useAuth } from "@/lib/auth-context";
import { useAccess } from "@/lib/access-context";
import { useGuardedNavigate } from "@/lib/use-guarded-navigate";
import { isIosNative } from "@/lib/native";

/** Routes that an authenticated-but-unpaid user is allowed to reach. */
const UNPAID_ALLOWED = new Set([
  "/pricing",
  "/more",
  "/profile",
  "/checkout/return",
  "/signin",
  "/signup",
  "/verify-email",
]);

/** Routes paid users can reach before finishing setup. */
const SETUP_ALLOWED = new Set(["/intake", "/more", "/profile", "/checkout/return"]);

/**
 * Gates protected routes:
 *  1. Redirects to /signup when unauthenticated.
 *  2. Redirects to /verify-email when authenticated but email is unconfirmed.
 *  3. Redirects unpaid users to /pricing before setup.
 *  4. Allows paid users into setup, then shows the onboarding flow until complete
 *     (admins and comp'd users bypass).
 */
export function RequireOnboarding({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const onb = useOnboarding();
  const access = useAccess();
  const navigate = useGuardedNavigate();
  const location = useLocation();

  useEffect(() => {
    if (auth.ready && !auth.user) {
      navigate({ to: "/signup" });
    }
  }, [auth.ready, auth.user, navigate]);

  useEffect(() => {
    if (auth.ready && auth.user && !auth.emailConfirmed) {
      navigate({ to: "/verify-email" });
    }
  }, [auth.ready, auth.user, auth.emailConfirmed, navigate]);

  useEffect(() => {
    // iOS users now have access to In-App Purchase on /pricing via
    // RevenueCat, so we treat iOS the same as web for the unpaid -> /pricing
    // redirect. Apple Guideline 3.1.1 is satisfied because /pricing on iOS
    // renders the IAP-only paywall (see src/components/IosPaywall.tsx).
    if (
      auth.ready &&
      auth.user &&
      auth.emailConfirmed &&
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

  if (!access.hasAccess && !UNPAID_ALLOWED.has(location.pathname) && !isIosNative()) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  if (!access.hasAccess && !isIosNative()) {
    return <>{children}</>;
  }

  // Admins (and any internal/comp'd account that resolves to a tier without a
  // paid sub) bypass the localStorage-based onboarding gate. Otherwise an
  // admin signing in on a fresh browser/device gets blocked behind the
  // Onboarding modal even though their server-side access is fine.
  if (!access.isAdmin && !onb.onboarded && !SETUP_ALLOWED.has(location.pathname)) {
    return <Onboarding forceOpen />;
  }

  return <>{children}</>;
}
