import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "aether.onboarding.completed";

type OnboardingCtx = {
  /** True once we've read localStorage (avoids SSR/first-paint flash). */
  ready: boolean;
  /** True if the user has completed (or skipped) onboarding. */
  completed: boolean;
  /** Marks onboarding complete and persists it. */
  complete: () => void;
  /** Resets onboarding so the flow shows again (used by "Replay tour"). */
  reset: () => void;
};

const Ctx = createContext<OnboardingCtx | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = window.localStorage.getItem(STORAGE_KEY);
    setCompleted(Boolean(done));
    setReady(true);
  }, []);

  const complete = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    }
    setCompleted(true);
  }, []);

  const reset = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setCompleted(false);
  }, []);

  return <Ctx.Provider value={{ ready, completed, complete, reset }}>{children}</Ctx.Provider>;
}

/** Fallback used if a consumer renders outside the provider (e.g. during
 *  isolated SSR of a route component before the root shell wraps it). It
 *  reports "not ready" so gates render their loading state instead of crashing. */
const noopCtx: OnboardingCtx = {
  ready: false,
  completed: false,
  complete: () => {},
  reset: () => {},
};

export function useOnboarding() {
  return useContext(Ctx) ?? noopCtx;
}
