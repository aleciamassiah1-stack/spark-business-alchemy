import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { checkAccess } from "@/lib/access.functions";
import { useAuth } from "@/lib/auth-context";
import { initRevenueCat, logoutRevenueCat } from "@/lib/revenuecat";
import { limitsForTier, type Tier, type TierLimits } from "@/lib/tier";

type AccessState = {
  ready: boolean;
  hasAccess: boolean;
  isAdmin: boolean;
  tier: Tier | null;
  limits: TierLimits;
  refresh: () => Promise<boolean>;
};

const AccessContext = createContext<AccessState | undefined>(undefined);

const noop: AccessState = {
  ready: false,
  hasAccess: false,
  isAdmin: false,
  tier: null,
  limits: limitsForTier(null),
  refresh: async () => false,
};

export function AccessProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [ready, setReady] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tier, setTier] = useState<Tier | null>(null);

  const load = useCallback(async () => {
    if (!auth.user) {
      setHasAccess(false);
      setIsAdmin(false);
      setTier(null);
      setReady(true);
      return false;
    }
    try {
      const res = await checkAccess();
      setHasAccess(res.hasAccess);
      setIsAdmin(res.isAdmin);
      setTier(res.tier ?? null);
      return res.hasAccess;
    } catch {
      setHasAccess(false);
      setIsAdmin(false);
      setTier(null);
      return false;
    } finally {
      setReady(true);
    }
  }, [auth.user]);

  useEffect(() => {
    // Reset state immediately when user identity changes so RequireOnboarding
    // never sees a stale hasAccess from a previous session.
    setReady(false);
    setHasAccess(false);
    setIsAdmin(false);
    setTier(null);
    void load();
    // Sync RevenueCat identity on iOS native (no-op on web).
    if (auth.user?.id) {
      void initRevenueCat(auth.user.id);
    } else {
      void logoutRevenueCat();
    }
  }, [auth.ready, auth.user?.id, load]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleFocus = () => {
      void load();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [load]);

  const limits = limitsForTier(tier);

  return (
    <AccessContext.Provider value={{ ready, hasAccess, isAdmin, tier, limits, refresh: load }}>
      {children}
    </AccessContext.Provider>
  );
}

export function useAccess(): AccessState {
  const ctx = useContext(AccessContext);
  return ctx ?? noop;
}
