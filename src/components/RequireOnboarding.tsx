import type { ReactNode } from "react";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Onboarding } from "@/components/Onboarding";
import { useOnboarding } from "@/lib/onboarding-context";
import { useAuth } from "@/lib/auth-context";

/**
 * Gates protected routes. Redirects to /signup when unauthenticated.
 * Shows the onboarding flow when authenticated but not yet onboarded.
 */
export function RequireOnboarding({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const onb = useOnboarding();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.ready && !auth.user) {
      navigate({ to: "/signup" });
    }
  }, [auth.ready, auth.user, navigate]);

  if (!auth.ready || !onb.ready) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  if (!auth.user) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  if (!onb.onboarded) {
    return <Onboarding forceOpen />;
  }

  return <>{children}</>;
}
