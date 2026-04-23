import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { MfaChallenge } from "@/components/MfaChallenge";

type AuthCtx = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  /** True only when Supabase reports the user's email as confirmed. */
  emailConfirmed: boolean;
  /** True when user has a verified TOTP factor but session is still AAL1. */
  needsMfa: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [needsMfa, setNeedsMfa] = useState(false);
  const [mfaCheckTick, setMfaCheckTick] = useState(0);

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

  // Whenever a new session lands, check whether we need to step up to AAL2.
  useEffect(() => {
    if (!session) {
      setNeedsMfa(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error || cancelled) return;
        // nextLevel === 'aal2' means a verified factor exists; currentLevel tells us if we're there.
        const stepUpRequired = data?.nextLevel === "aal2" && data?.currentLevel !== "aal2";
        setNeedsMfa(stepUpRequired);
      } catch {
        // fail-open — don't lock users out on transient errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, mfaCheckTick]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setNeedsMfa(false);
  }, []);

  const user = session?.user ?? null;
  const emailConfirmed = !!user?.email_confirmed_at;

  return (
    <Ctx.Provider value={{ ready, session, user, emailConfirmed, needsMfa, signOut }}>
      {needsMfa ? (
        <MfaChallenge
          onSolved={() => {
            setNeedsMfa(false);
            // Re-verify in case the AAL didn't update on the session immediately.
            setMfaCheckTick((n) => n + 1);
          }}
        />
      ) : null}
      {children}
    </Ctx.Provider>
  );
}

const noop: AuthCtx = {
  ready: false,
  session: null,
  user: null,
  emailConfirmed: false,
  needsMfa: false,
  signOut: async () => {},
};

export function useAuth() {
  return useContext(Ctx) ?? noop;
}
