import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "aether.onboarding.v2";

export type OnboardingProfile = {
  fullName?: string;
  biometricEnabled?: boolean;
  passcodeSet?: boolean;
  personas?: string[];
  trackingPrefs?: string[];
  firstAccountConnected?: boolean;
  phoneVerified?: boolean;
  bannerDismissed?: string; // ISO date of last dismissal session
  completedSteps: string[]; // step keys: "account" | "verify" | "biometric" | "personalize" | "connect"
};

const EMPTY: OnboardingProfile = { completedSteps: [] };

type OnboardingCtx = {
  ready: boolean;
  profile: OnboardingProfile;
  /** Onboarding finished (account + biometric + personalize done) */
  onboarded: boolean;
  /** % toward a fully complete profile (all 4 steps) */
  completionPct: number;
  update: (patch: Partial<OnboardingProfile>) => void;
  markStep: (step: string) => void;
  reset: () => void;
};

const Ctx = createContext<OnboardingCtx | null>(null);

const REQUIRED_FOR_GATE = ["account", "verify", "biometric", "personalize"] as const;
const ALL_STEPS = ["account", "verify", "biometric", "personalize", "connect"] as const;

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<OnboardingProfile>(EMPTY);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setProfile({ ...EMPTY, ...JSON.parse(raw) });
    } catch {
      /* ignore corrupt storage */
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: OnboardingProfile) => {
    setProfile(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, []);

  const update = useCallback(
    (patch: Partial<OnboardingProfile>) => {
      persist({ ...profile, ...patch });
    },
    [profile, persist],
  );

  const markStep = useCallback(
    (step: string) => {
      if (profile.completedSteps.includes(step)) return;
      persist({ ...profile, completedSteps: [...profile.completedSteps, step] });
    },
    [profile, persist],
  );

  const reset = useCallback(() => {
    persist(EMPTY);
  }, [persist]);

  const onboarded = REQUIRED_FOR_GATE.every((s) => profile.completedSteps.includes(s));
  const completionPct = Math.round(
    (profile.completedSteps.filter((s) => (ALL_STEPS as readonly string[]).includes(s)).length /
      ALL_STEPS.length) *
      100,
  );

  return (
    <Ctx.Provider value={{ ready, profile, onboarded, completionPct, update, markStep, reset }}>
      {children}
    </Ctx.Provider>
  );
}

const noop: OnboardingCtx = {
  ready: false,
  profile: EMPTY,
  onboarded: false,
  completionPct: 0,
  update: () => {},
  markStep: () => {},
  reset: () => {},
};

export function useOnboarding() {
  return useContext(Ctx) ?? noop;
}
