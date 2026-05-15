import { useState, useEffect, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Shield,
  Check,
  Fingerprint,
  ChevronRight,
  Lock,
  Eye,
  EyeOff,
  Briefcase,
  Users,
  Gem,
  Building2,
  TrendingUp,
  Wallet,
  Home,
  ScrollText,
  Sparkles,
  Loader2,
  PiggyBank,
  Bitcoin,
  CreditCard,
  Star,
} from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-context";
import { useAuth } from "@/lib/auth-context";
import { isIosNative } from "@/lib/native";
import aetherLogo from "@/assets/aether-logo.png";

const STEPS = ["biometric", "personalize", "connect"] as const;
type StepKey = (typeof STEPS)[number];

/**
 * Multi-step onboarding shown after the user has signed up.
 * Account creation is handled separately on /signup, so step 1 here is
 * biometric setup (the user is already authenticated).
 */
export function Onboarding({ forceOpen = false }: { forceOpen?: boolean } = {}) {
  const { ready, onboarded, profile, markStep } = useOnboarding();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Resume on the first incomplete step.
  const initialStep: StepKey =
    (STEPS.find((s) => !profile.completedSteps.includes(s)) as StepKey | undefined) ?? "biometric";
  const [step, setStep] = useState<StepKey>(initialStep);

  if (!forceOpen && (!ready || onboarded)) return null;
  if (!user) return null; // Can't onboard without an account

  const goNext = () => {
    markStep(step);
    const idx = STEPS.indexOf(step);
    const next = STEPS[idx + 1];
    if (next) {
      setStep(next);
    } else {
      // Onboarding complete → paid users continue into the dashboard setup.
      navigate({ to: "/intake" });
    }
  };

  const stepNumber = STEPS.indexOf(step) + 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-center bg-background">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, oklch(0.42 0.14 295 / 0.35) 0%, transparent 55%), radial-gradient(circle at 0% 100%, oklch(0.32 0.08 280 / 0.25) 0%, transparent 50%)",
        }}
      />

      <div className="relative mx-auto flex h-full min-h-0 w-full max-w-[430px] flex-col">
        <div className="flex items-center justify-between gap-3 px-6 pb-2 pt-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Step {stepNumber} of {STEPS.length}
          </p>
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === stepNumber - 1
                    ? "w-8 bg-primary glow-violet"
                    : i < stepNumber - 1
                      ? "w-4 bg-primary/60"
                      : "w-4 bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === "biometric" && <ScreenBiometric key="bio" onNext={goNext} />}
          {step === "personalize" && <ScreenPersonalize key="pers" onNext={goNext} />}
          {step === "connect" && <ScreenConnect key="conn" onNext={goNext} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ───────────────────────── Reusable bits ───────────────────────── */

function ScreenWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-0 flex-1 flex-col px-6"
    >
      {children}
    </motion.section>
  );
}

function PrimaryCta({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="group inline-flex w-full items-center justify-center gap-2 rounded-full gradient-violet px-6 py-4 text-sm font-medium text-foreground shadow-[0_8px_32px_-8px_oklch(0.68_0.13_295/0.55)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 glow-violet"
    >
      {children}
      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </button>
  );
}

/* ───────────────────────── Screen: Biometric ───────────────────────── */

function ScreenBiometric({ onNext }: { onNext: () => void }) {
  const { update } = useOnboarding();
  const [enabled, setEnabled] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [passcode, setPasscode] = useState("");

  const tryBiometric = async () => {
    try {
      if (typeof window !== "undefined" && "PublicKeyCredential" in window) {
        setEnabled(true);
        update({ biometricEnabled: true });
        return;
      }
    } catch {
      /* noop */
    }
    setEnabled(true);
    update({ biometricEnabled: true });
  };

  if (showPasscode) {
    return (
      <ScreenWrap>
        <div className="flex flex-1 flex-col items-center text-center">
          <div className="pt-4">
            <p className="label-mono mb-3">Set Passcode</p>
            <h2 className="font-serif text-[32px] leading-tight text-foreground">
              Choose a 6-digit
              <br />
              <span className="text-gradient-violet">passcode.</span>
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              You'll use this to unlock the vault.
            </p>
          </div>

          <div className="mt-10 flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`flex h-14 w-11 items-center justify-center rounded-2xl border text-2xl font-mono ${
                  passcode.length === i
                    ? "border-primary bg-primary/10 glow-violet"
                    : passcode.length > i
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-white/[0.08] bg-white/[0.02]"
                }`}
              >
                {passcode[i] ? "•" : ""}
              </div>
            ))}
          </div>

          <input
            autoFocus
            type="tel"
            inputMode="numeric"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="absolute h-0 w-0 opacity-0"
            aria-label="Passcode"
          />

          <div className="mt-8 grid w-full max-w-[280px] grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k, i) =>
              k === "" ? (
                <div key={i} />
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (k === "⌫") setPasscode((p) => p.slice(0, -1));
                    else if (passcode.length < 6) setPasscode((p) => p + k);
                  }}
                  className="h-14 rounded-2xl border border-white/[0.06] bg-white/[0.02] font-serif text-2xl text-foreground transition-all hover:bg-white/[0.06] active:scale-95"
                >
                  {k}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="mt-6 space-y-3 pb-2">
          <PrimaryCta
            disabled={passcode.length !== 6}
            onClick={() => {
              update({ passcodeSet: true });
              onNext();
            }}
          >
            Set passcode
          </PrimaryCta>
          <div className="flex justify-center">
            <GhostBtn onClick={() => setShowPasscode(false)}>← Back</GhostBtn>
          </div>
        </div>
      </ScreenWrap>
    );
  }

  return (
    <ScreenWrap>
      <div className="flex flex-1 flex-col items-center text-center">
        <div className="pt-4">
          <p className="label-mono mb-3">Biometric Lock</p>
          <h2 className="font-serif text-[34px] leading-tight text-foreground">
            Unlock Æther with
            <br />
            <span className="text-gradient-violet">your face.</span>
          </h2>
        </div>

        <div className="relative my-10">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, oklch(0.78 0.16 295 / 0.35) 0%, transparent 65%)",
            }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.button
            type="button"
            onClick={tryBiometric}
            whileTap={{ scale: 0.96 }}
            className={`relative flex h-36 w-36 items-center justify-center rounded-full border-2 transition-all ${
              enabled
                ? "border-success/60 bg-success/15"
                : "border-primary/50 bg-primary/10 hover:bg-primary/20"
            }`}
          >
            <AnimatePresence mode="wait">
              {enabled ? (
                <motion.div
                  key="ok"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-success/25"
                >
                  <Check className="h-8 w-8 text-success" strokeWidth={2.4} />
                </motion.div>
              ) : (
                <motion.div key="fp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Fingerprint className="h-16 w-16 text-primary" strokeWidth={1.4} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        <p className="text-sm text-muted-foreground">
          {enabled ? "Biometric lock enabled." : "Tap to enable Face ID or Touch ID."}
        </p>
      </div>

      <div className="mt-8 space-y-3 pb-2">
        <PrimaryCta onClick={onNext}>{enabled ? "Continue" : "Continue without biometric"}</PrimaryCta>
        <div className="flex justify-center">
          <GhostBtn onClick={() => setShowPasscode(true)}>Use passcode instead</GhostBtn>
        </div>
      </div>
    </ScreenWrap>
  );
}

/* ───────────────────────── Screen: Personalize ───────────────────────── */

const PERSONAS = [
  { key: "young_pro", label: "Young Professional", icon: Briefcase },
  { key: "growing_family", label: "Growing Family", icon: Users },
  { key: "high_net_worth", label: "High Net Worth", icon: Gem },
  { key: "business_owner", label: "Business Owner", icon: Building2 },
] as const;

const TRACK_ITEMS = [
  { key: "investments", label: "Investments", icon: TrendingUp },
  { key: "banking", label: "Banking", icon: Wallet },
  { key: "insurance", label: "Insurance", icon: Shield },
  { key: "real_estate", label: "Real Estate", icon: Home },
  { key: "retirement", label: "Retirement", icon: PiggyBank },
  { key: "estate", label: "Trust & Estate", icon: ScrollText },
  { key: "business", label: "Business Assets", icon: Briefcase },
  { key: "crypto", label: "Crypto", icon: Bitcoin },
  { key: "debt", label: "Debt & Liabilities", icon: CreditCard },
] as const;

function ScreenPersonalize({ onNext }: { onNext: () => void }) {
  const { profile, update } = useOnboarding();
  const [personas, setPersonas] = useState<string[]>(profile.personas ?? []);
  const [tracks, setTracks] = useState<string[]>(
    profile.trackingPrefs ?? ["investments", "banking"],
  );

  const togglePersona = (k: string) =>
    setPersonas((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const toggleTrack = (k: string) =>
    setTracks((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const valid = personas.length > 0 && tracks.length > 0;

  return (
    <ScreenWrap>
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="pt-4 text-center">
          <p className="label-mono mb-3">Personalize</p>
          <h2 className="font-serif text-[30px] leading-tight text-foreground">
            What best <span className="text-gradient-violet">describes you?</span>
          </h2>
          <p className="mt-2 text-xs text-muted-foreground">Select all that apply.</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {PERSONAS.map(({ key, label, icon: Icon }) => {
            const active = personas.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => togglePersona(key)}
                className={`flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-center transition-all active:scale-[0.98] ${
                  active
                    ? "border-primary/50 bg-primary/10 glow-violet"
                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    active ? "gradient-violet" : "bg-white/[0.04]"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${active ? "text-foreground" : "text-muted-foreground"}`}
                    strokeWidth={1.8}
                  />
                </div>
                <span className="text-[12.5px] font-medium text-foreground">{label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-7">
          <h3 className="font-serif text-lg text-foreground">What do you want to track?</h3>
          <div className="mt-3 flex flex-col gap-2">
            {TRACK_ITEMS.map(({ key, label, icon: Icon }) => {
              const active = tracks.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleTrack(key)}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                    active
                      ? "border-primary/40 bg-primary/[0.06]"
                      : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      active ? "bg-primary/20" : "bg-white/[0.04]"
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 ${active ? "text-primary" : "text-muted-foreground"}`}
                      strokeWidth={1.8}
                    />
                  </div>
                  <span className="flex-1 text-sm text-foreground">{label}</span>
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                      active ? "border-primary bg-primary text-primary-foreground" : "border-white/[0.12]"
                    }`}
                  >
                    {active && <Check className="h-3 w-3" strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 mt-4 border-t border-white/[0.06] bg-background/95 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <PrimaryCta
          disabled={!valid}
          onClick={() => {
            update({ personas, trackingPrefs: tracks });
            onNext();
          }}
        >
          Let's go
        </PrimaryCta>
      </div>
    </ScreenWrap>
  );
}

/* ───────────────────────── Screen: Connect ───────────────────────── */

const POPULAR = ["Chase", "Fidelity", "Robinhood", "Bank of America"];

function ScreenConnect({ onNext }: { onNext: () => void }) {
  const { update } = useOnboarding();
  const navigate = useNavigate();

  const handleConnect = () => {
    update({ firstAccountConnected: false }); // will be set true once Plaid succeeds
    onNext(); // mark step done — they can finish in /connections
    setTimeout(() => navigate({ to: "/connections" }), 50);
  };

  return (
    <ScreenWrap>
      <div className="flex flex-1 flex-col items-center text-center">
        <div className="pt-2">
          <p className="label-mono mb-3">Final Step</p>
          <h2 className="font-serif text-[30px] leading-tight text-foreground">
            Let's build your
            <br />
            <span className="text-gradient-violet">financial picture.</span>
          </h2>
          <p className="mt-3 max-w-[320px] text-sm text-muted-foreground">
            Connect your first account to see everything in one private view.
          </p>
        </div>

        <div className="my-7 w-full max-w-[340px]">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Profile
            </span>
            <span className="font-mono text-[10px] text-primary">75% complete</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full gradient-violet"
              initial={{ width: 0 }}
              animate={{ width: "75%" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

        <div className="w-full max-w-[340px]">
          <div className="grid grid-cols-4 gap-2">
            {POPULAR.map((p) => (
              <div
                key={p}
                className="flex h-14 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] px-1 text-center text-[10px] font-medium text-muted-foreground"
              >
                {p}
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
            via Plaid · Read-only · 256-bit encrypted
          </p>
        </div>
      </div>

      <div className="space-y-3 pb-2 pt-6">
        <PrimaryCta onClick={handleConnect}>Connect a bank or investment account</PrimaryCta>
        <div className="flex justify-center">
          <GhostBtn onClick={onNext}>Skip for now — explore the app first</GhostBtn>
        </div>
      </div>
    </ScreenWrap>
  );
}

/* ───────────────────────── Shared: Sign-up form ─────────────────────────
 * Exported for use by /signup route. Kept here to colocate onboarding UI.
 */
export type AuthMode = "signup" | "signin";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [agreed, setAgreed] = useState(false);
  const { update, markStep } = useOnboarding();

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  // Real-time validation
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const pwLen = password.length >= 12;
  const pwNum = /\d/.test(password);
  const pwSym = /[^A-Za-z0-9]/.test(password);
  const pwUpper = /[A-Z]/.test(password);
  const pwScore = [pwLen, pwNum, pwSym, pwUpper].filter(Boolean).length;
  const pwLabel =
    pwScore <= 1 ? "Weak" : pwScore === 2 ? "Fair" : pwScore === 3 ? "Strong" : "Fortress";
  const pwColor =
    pwScore <= 1
      ? "bg-destructive"
      : pwScore === 2
        ? "bg-warning"
        : pwScore === 3
          ? "bg-success"
          : "bg-gradient-to-r from-primary to-violet-glow";

  const nameValid = fullName.trim().length >= 2;

  const signupValid = nameValid && emailValid && pwLen && pwNum && pwSym && agreed;
  const signinValid = emailValid && password.length >= 8;
  const valid = mode === "signup" ? signupValid : signinValid;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || busy || isLocked) return;
    setBusy(true);
    setError(null);

    try {
      const { supabase } = await import("@/integrations/supabase/client");

      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/signin`,
            data: {
              full_name: fullName,
            },
          },
        });
        if (err) throw err;
        update({ fullName });
        markStep("account");

        // Record Terms + Privacy acceptance for the audit trail. Best-effort:
        // a transient failure should not block account creation. Only attempted
        // when a session exists (auto-confirm). When email confirmation is
        // required we'll record on first sign-in instead.
        if (data.session) {
          try {
            const [{ recordConsent }, { CONSENT_VERSIONS, markLocalConsent }] = await Promise.all([
              import("@/lib/consent.functions"),
              import("@/lib/consent-versions"),
            ]);
            const ua =
              typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : undefined;
            await Promise.allSettled([
              recordConsent({ data: { kind: "terms", version: CONSENT_VERSIONS.terms, userAgent: ua } }),
              recordConsent({ data: { kind: "privacy", version: CONSENT_VERSIONS.privacy, userAgent: ua } }),
            ]);
            markLocalConsent("terms");
            markLocalConsent("privacy");
          } catch (consentErr) {
            console.warn("Failed to record signup consent:", consentErr);
          }
        } else {
          // Stash intent locally so we can record after first authenticated sign-in.
          try {
            sessionStorage.setItem("aether.consent.pending", "1");
          } catch {
            // ignore
          }
        }
        // Supabase returns a "fake" user object (identities: []) when the email
        // is already registered, to prevent account enumeration. In that case
        // no confirmation email is sent — we must explicitly resend it.
        const isRepeatSignup =
          !!data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
        if (isRepeatSignup) {
          const { error: resendErr } = await supabase.auth.resend({
            type: "signup",
            email,
            options: { emailRedirectTo: `${window.location.origin}/signin` },
          });
          setError(
            resendErr
              ? "This email already has an account. Try signing in, or reset your password."
              : "This email already has an unconfirmed account. We just sent a fresh confirmation link — check your inbox.",
          );
          return;
        }

        // If email confirmation is required, no session is created. Surface that.
        if (!data.session) {
          setError("Check your email to confirm your account, then sign in.");
          return;
        }
        // Session is live — RequireOnboarding will pick up and continue the flow.
        navigate({ to: "/" });
      } else {
        // Authenticate first — only after valid credentials do we check pending deletion.
        // (We deliberately do NOT pre-check by email: that would let anyone probe whether
        // an email is registered + scheduled for deletion without authenticating.)
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) {
          const next = attempts + 1;
          setAttempts(next);
          if (next >= 5) {
            setLockedUntil(Date.now() + 15 * 60 * 1000);
            setError("Too many failed attempts. Locked for 15 minutes.");
          } else {
            setError(`Invalid email or password. ${5 - next} attempts remaining.`);
          }
          return;
        }

        // Authenticated — now safe to check pending deletion. The server function
        // requires a valid bearer token, so this can't be used for enumeration.
        try {
          const { checkMyPendingDeletion } = await import("@/lib/access.functions");
          const pending = await checkMyPendingDeletion();
          if (pending.pending) {
            await supabase.auth.signOut();
            const purge = pending.purgeAfter ? new Date(pending.purgeAfter) : null;
            const days = purge
              ? Math.max(0, Math.ceil((purge.getTime() - Date.now()) / 86400000))
              : null;
            setError(
              days != null
                ? `This account is scheduled for deletion in ${days} day${days === 1 ? "" : "s"}. Contact support@aetherwealth.co to restore access.`
                : "This account is scheduled for deletion. Contact support@aetherwealth.co to restore access.",
            );
            return;
          }
        } catch {
          // Non-fatal.
        }

        // Flush any pending signup consent that we couldn't record at signup
        // time because email confirmation was required.
        try {
          if (sessionStorage.getItem("aether.consent.pending") === "1") {
            const [{ recordConsent }, { CONSENT_VERSIONS, markLocalConsent }] = await Promise.all([
              import("@/lib/consent.functions"),
              import("@/lib/consent-versions"),
            ]);
            const ua =
              typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : undefined;
            await Promise.allSettled([
              recordConsent({ data: { kind: "terms", version: CONSENT_VERSIONS.terms, userAgent: ua } }),
              recordConsent({ data: { kind: "privacy", version: CONSENT_VERSIONS.privacy, userAgent: ua } }),
            ]);
            markLocalConsent("terms");
            markLocalConsent("privacy");
            sessionStorage.removeItem("aether.consent.pending");
          }
        } catch {
          // Non-fatal.
        }

        navigate({ to: "/" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      {mode === "signup" && (
        <Field
          label="Full name"
          value={fullName}
          onChange={setFullName}
          placeholder="James Whitfield"
          valid={fullName ? nameValid : null}
          autoComplete="name"
        />
      )}

      <Field
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        valid={email ? emailValid : null}
        autoComplete="email"
      />

      <div>
        <Field
          label="Password"
          type={showPw ? "text" : "password"}
          value={password}
          onChange={setPassword}
          placeholder={mode === "signup" ? "12+ characters" : "Your password"}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          right={
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />
        {mode === "signup" && password && (
          <div className="mt-2.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Strength
              </span>
              <span
                className={`font-mono text-[10px] uppercase tracking-wider ${
                  pwScore >= 3 ? "text-success" : pwScore === 2 ? "text-warning" : "text-destructive"
                }`}
              >
                {pwLabel}
              </span>
            </div>
            <div className="flex h-1 gap-1 overflow-hidden rounded-full">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`flex-1 transition-all ${i < pwScore ? pwColor : "bg-white/[0.06]"}`}
                />
              ))}
            </div>
            <ul className="mt-2.5 grid grid-cols-2 gap-1 text-[11px]">
              <Req ok={pwLen} label="12+ chars" />
              <Req ok={pwNum} label="A number" />
              <Req ok={pwSym} label="A symbol" />
              <Req ok={pwUpper} label="Uppercase" />
            </ul>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
          {error}
        </p>
      )}

      {mode === "signup" && !valid && (fullName || email || password) && (
        <ul className="space-y-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[11px] text-muted-foreground">
          {!nameValid && <li>• Enter your full name (2+ characters)</li>}
          {!emailValid && <li>• Enter a valid email address</li>}
          {!pwLen && <li>• Password must be at least 12 characters</li>}
          {!pwNum && <li>• Password must include a number</li>}
          {!pwSym && <li>• Password must include a symbol (!@#$…)</li>}
          {!agreed && <li>• Agree to the Terms and Privacy Policy</li>}
        </ul>
      )}

      {mode === "signup" && (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 cursor-pointer accent-primary"
          />
          <span>
            I agree to the{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-foreground underline decoration-dotted hover:text-primary">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-foreground underline decoration-dotted hover:text-primary">
              Privacy Policy
            </a>
            , and I understand that connecting a financial account uses Plaid as described in the Privacy Policy.
          </span>
        </label>
      )}

      <PrimaryCta type="submit" disabled={!valid || busy || isLocked}>
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Working…
          </span>
        ) : mode === "signup" ? (
          "Continue"
        ) : (
          "Sign in"
        )}
      </PrimaryCta>

      {mode === "signin" && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate({ to: "/forgot-password" })}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Forgot your password?
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-white/[0.08]" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          or
        </span>
        <div className="h-px flex-1 bg-white/[0.08]" />
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            if (isIosNative()) {
              const { signInWithNativeApple } = await import("@/lib/native");
              await signInWithNativeApple();
              navigate({ to: "/" });
            } else {
              const { lovable } = await import("@/integrations/lovable");
              const result = await lovable.auth.signInWithOAuth("apple", {
                redirect_uri: `${window.location.origin}/`,
              });
              if (result.error) throw result.error;
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : "Apple sign-in failed");
            setBusy(false);
          }
        }}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.08] bg-white px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-50"
      >
        <svg width="16" height="16" viewBox="0 0 384 512" aria-hidden fill="currentColor">
          <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM260.7 91.4c25.5-30.3 23.2-57.9 22.3-67.4-22.4 1.3-48.3 15.3-63.1 32.5-16.3 18.4-25.9 41.2-23.8 65.4 24.2 1.9 46.3-10.5 64.6-30.5z"/>
        </svg>
        Continue with Apple
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const { lovable } = await import("@/integrations/lovable");
            const result = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: `${window.location.origin}/`,
            });
            if (result.error) throw result.error;
          } catch (err) {
            setError(err instanceof Error ? err.message : "Google sign-in failed");
            setBusy(false);
          }
        }}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.07] disabled:opacity-50"
      >
        <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.83.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33z"/>
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"/>
        </svg>
        Continue with Google
      </button>

      {mode === "signup" && (
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          By continuing you agree to our{" "}
          <Link to="/terms" className="text-primary hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          . We never sell your data.
        </p>
      )}
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  valid = null,
  autoComplete,
  right,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  valid?: boolean | null;
  autoComplete?: string;
  right?: React.ReactNode;
}) {
  return (
    <div>
      <label className="label-mono">{label}</label>
      <div className="relative mt-1.5">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full rounded-xl border bg-white/[0.03] px-4 py-3 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/50 ${
            valid === false
              ? "border-destructive/50"
              : valid === true
                ? "border-success/40"
                : "border-white/[0.08]"
          }`}
        />
        {right ? (
          <div className="absolute inset-y-0 right-3 flex items-center">{right}</div>
        ) : valid === true ? (
          <Check
            className="absolute inset-y-0 right-3 my-auto h-4 w-4 text-success"
            strokeWidth={2.6}
          />
        ) : null}
      </div>
    </div>
  );
}

function Req({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={`flex items-center gap-1.5 ${
        ok ? "text-success" : "text-muted-foreground"
      }`}
    >
      {ok ? (
        <Check className="h-3 w-3" strokeWidth={2.8} />
      ) : (
        <Lock className="h-3 w-3" strokeWidth={2} />
      )}
      <span>{label}</span>
    </li>
  );
}

/* Welcome screen with trust badges — used by /signup landing */
export function Welcome({
  onCreate,
  onSignIn,
}: {
  onCreate?: () => void;
  onSignIn?: () => void;
} = {}) {
  const navigate = useNavigate();
  const handleCreate = onCreate ?? (() => navigate({ to: "/signup" }));
  const handleSignIn = onSignIn ?? (() => navigate({ to: "/signin" }));
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const tiers = {
    essential: { monthly: "$149", annual: "$1,490" },
    private: { monthly: "$399", annual: "$3,990" },
    family: { monthly: "$1,499", annual: "$14,990" },
  } as const;
  const cadence = billing === "annual" ? "/yr" : "/mo";
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center overflow-hidden bg-background px-6 py-10">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, oklch(0.42 0.14 295 / 0.4) 0%, transparent 55%), radial-gradient(circle at 100% 100%, oklch(0.32 0.08 280 / 0.3) 0%, transparent 50%)",
        }}
      />
      <div className="relative flex w-full flex-col items-center text-center pt-6">
        <motion.img
          src={aetherLogo}
          alt="Æther Wealth"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-6 h-20 w-20 object-contain drop-shadow-[0_20px_60px_oklch(0.68_0.13_295/0.6)]"
        />
        <p className="label-mono mb-2 font-bold">Æther Wealth</p>
        <h1 className="font-serif text-[36px] leading-[1.05] text-foreground">
          Your entire financial life.
          <br />
          <span className="text-gradient-violet">One secure place.</span>
        </h1>
        <p className="mt-4 max-w-[320px] text-sm text-muted-foreground">
          A private bank in your pocket — engineered with the discretion of a Swiss vault.
        </p>
      </div>

      {/* Tier preview — front and center. Hidden on iOS native per
          Apple Guideline 3.1.1: no pricing, no tier cards, no link to
          /pricing inside the iOS binary. */}
      {!isIosNative() && (
        <div className="relative mt-10 w-full max-w-[1100px]">
          <div className="mb-3 flex items-center justify-end">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              Compare all
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Billing toggle */}
          <div className="mb-4 flex justify-center">
            <div className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
              <button
                type="button"
                onClick={() => setBilling("monthly")}
                className={`rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-all ${
                  billing === "monthly"
                    ? "bg-primary/15 text-foreground glow-violet"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBilling("annual")}
                className={`relative rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-all ${
                  billing === "annual"
                    ? "bg-primary/15 text-foreground glow-violet"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Annual
                <span className="ml-1.5 rounded-full bg-gold/15 px-1.5 py-0.5 text-[8px] tracking-wider text-gold">
                  −2 mo
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-stretch sm:gap-4">
            <WelcomeTier
              name="Essential"
              price={tiers.essential[billing]}
              cadence={cadence}
              description="For individuals and independent advisors"
              highlights={["Up to 3 accounts", "Net worth dashboard", "Estate vault — 5 docs"]}
              variant="essential"
            />
            <WelcomeTier
              name="Private"
              price={tiers.private[billing]}
              cadence={cadence}
              description="For high net worth individuals and advisors"
              highlights={["Unlimited accounts", "Trust & estate suite", "AI insurance parser"]}
              variant="private"
              badge="Most Popular"
            />
            <WelcomeTier
              name="Family Office"
              price={tiers.family[billing]}
              cadence={cadence}
              description="For UHNW families and enterprise firms"
              highlights={["Unlimited members", "Full white label", "Dedicated manager"]}
              variant="family"
            />
          </div>
          <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {billing === "annual"
              ? "Billed annually · Save up to 2 months"
              : "Billed monthly · Cancel anytime"}
          </p>
        </div>
      )}

      <div className="relative mt-8 w-full max-w-[400px] space-y-3 pb-4">
        <PrimaryCta onClick={handleCreate}>Create Account</PrimaryCta>
        <button
          type="button"
          onClick={handleSignIn}
          className="w-full rounded-full border border-white/[0.08] bg-white/[0.02] px-6 py-4 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.06]"
        >
          Sign In
        </button>

        <div className="flex items-center justify-center gap-2 pt-3">
          <Badge label="SOC 2" />
          <Badge label="256-bit Encryption" />
          <Badge label="FINRA Compliant" />
        </div>

        <div className="flex flex-col items-center gap-2 pt-5">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <Link to="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <span aria-hidden className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <Link to="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <span aria-hidden className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <span className="inline-flex items-center gap-1.5">
              Secured by
              <span className="font-sans text-[11px] font-semibold normal-case tracking-normal text-foreground">
                Plaid
              </span>
            </span>
          </div>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground/70">
            © {new Date().getFullYear()} Æther Wealth
          </p>
        </div>
      </div>
    </div>
  );
}

function WelcomeTier({
  name,
  price,
  cadence,
  description,
  highlights,
  variant,
  badge,
}: {
  name: string;
  price: string;
  cadence: string;
  description: string;
  highlights: string[];
  variant: "essential" | "private" | "family";
  badge?: string;
}) {
  const styles = {
    essential: {
      border: "border-white/[0.08]",
      bg: "gradient-card",
      glow: "",
      label: "text-muted-foreground",
      price: "text-foreground",
      check: "text-muted-foreground",
    },
    private: {
      border: "border-primary/40",
      bg: "gradient-hero",
      glow: "shadow-[0_0_40px_-12px_oklch(0.68_0.13_295/0.5)]",
      label: "text-primary",
      price: "text-gradient-violet",
      check: "text-primary",
    },
    family: {
      border: "border-gold/40",
      bg: "gradient-card",
      glow: "shadow-[0_0_36px_-14px_oklch(0.82_0.12_85/0.35)]",
      label: "text-gold",
      price: "text-gradient-gold",
      check: "text-gold",
    },
  }[variant];

  return (
    <Link
      to="/pricing"
      className={`relative flex h-full flex-col overflow-hidden rounded-2xl border ${styles.border} ${styles.bg} ${styles.glow} px-4 py-4 text-left transition-all hover:scale-[1.01]`}
    >
      {badge && (
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-gold">
          <Star className="h-2.5 w-2.5 fill-gold" strokeWidth={0} />
          {badge}
        </div>
      )}
      <p className={`font-mono text-[10px] uppercase tracking-[0.22em] ${styles.label}`}>
        {name}
      </p>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={`font-serif text-[26px] leading-none ${styles.price}`}>{price}</span>
        <span className="font-mono text-[10px] text-muted-foreground">{cadence}</span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>
      <ul className="mt-3 space-y-1.5">
        {highlights.map((h) => (
          <li key={h} className="flex items-start gap-2">
            <Check className={`mt-0.5 h-3 w-3 shrink-0 ${styles.check}`} strokeWidth={2.4} />
            <span className="text-[12px] text-foreground/85">{h}</span>
          </li>
        ))}
      </ul>
    </Link>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground/90 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5">
      {label}
    </span>
  );
}
