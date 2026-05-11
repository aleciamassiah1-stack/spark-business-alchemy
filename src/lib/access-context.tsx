import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { checkAccess } from "@/lib/access.functions";
import { useAuth } from "@/lib/auth-context";

type AccessState = {
  ready: boolean;
  hasAccess: boolean;
  isAdmin: boolean;
  refresh: () => Promise<boolean>;
};

const AccessContext = createContext<AccessState | undefined>(undefined);

const noop: AccessState = {
  ready: false,
  hasAccess: false,
  isAdmin: false,
  refresh: async () => false,
};

export function AccessProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [ready, setReady] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const load = useCallback(async () => {
    if (!auth.user) {
      setHasAccess(false);
      setIsAdmin(false);
      setReady(true);
      return false;
    }
    try {
      const res = await checkAccess();
      setHasAccess(res.hasAccess);
      setIsAdmin(res.isAdmin);
      return res.hasAccess;
    } catch {
      setHasAccess(false);
      setIsAdmin(false);
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
    void load();
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

  return (
    <AccessContext.Provider value={{ ready, hasAccess, isAdmin, refresh: load }}>
      {children}
    </AccessContext.Provider>
  );
}

export function useAccess(): AccessState {
  const ctx = useContext(AccessContext);
  return ctx ?? noop;
}
