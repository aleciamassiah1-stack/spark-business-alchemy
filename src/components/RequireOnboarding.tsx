import type { ReactNode } from "react";
import { Onboarding } from "@/components/Onboarding";
import { useOnboarding } from "@/lib/onboarding-context";

/**
 * Gates a protected route's content. Until onboarding has completed,
 * the onboarding flow is shown in place of `children`.
 */
export function RequireOnboarding({ children }: { children: ReactNode }) {
  const { ready, completed } = useOnboarding();

  // Avoid a flash of protected content on first paint while we read localStorage.
  if (!ready) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  if (!completed) {
    return <Onboarding forceOpen />;
  }

  return <>{children}</>;
}
