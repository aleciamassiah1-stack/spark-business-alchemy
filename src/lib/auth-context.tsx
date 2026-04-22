import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  /** True only when Supabase reports the user's email as confirmed. */
  emailConfirmed: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Subscribe FIRST, then load existing session — prevents race conditions.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  const user = session?.user ?? null;
  const emailConfirmed = !!user?.email_confirmed_at;

  return (
    <Ctx.Provider value={{ ready, session, user, emailConfirmed, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

const noop: AuthCtx = {
  ready: false,
  session: null,
  user: null,
  emailConfirmed: false,
  signOut: async () => {},
};

export function useAuth() {
  return useContext(Ctx) ?? noop;
}
