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
  MessageSquare,
  PiggyBank,
  Bitcoin,
  CreditCard,
  Star,
} from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-context";
import { useAuth } from "@/lib/auth-context";

const STEPS = ["verify", "biometric", "personalize", "connect"] as const;
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
    (STEPS.find((s) => !profile.completedSteps.includes(s)) as StepKey | undefined) ?? "verify";
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
      // Onboarding complete → take user to pricing to choose a plan.
      navigate({ to: "/pricing" });
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
          {step === "verify" && <ScreenVerify key="verify" onNext={goNext} />}
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

/* ───────────────────────── Screen: Verify (Simulated SMS OTP) ───────────────────────── */

const SIM_OTP = "123456";

function maskPhone(raw?: string): string {
  if (!raw) return "your phone";
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 4) return raw;
  const last4 = digits.slice(-4);
  return `••• ••• ${last4}`;
}

function ScreenVerify({ onNext }: { onNext: () => void }) {
  const { user } = useAuth();
  const { update } = useOnboarding();
  const phone = (user?.user_metadata as { phone?: string } | undefined)?.phone;
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(30);

  // Countdown for resend
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendIn]);

  const handleChange = (val: string) => {
    const next = val.replace(/\D/g, "").slice(0, 6);
    setCode(next);
    setError(null);
  };

  const handleVerify = () => {
    if (code.length !== 6) return;
    setVerifying(true);
    setError(null);
    // Simulate network delay
    setTimeout(() => {
      if (code === SIM_OTP) {
        update({ phoneVerified: true });
        onNext();
      } else {
        setError("Incorrect code. Try 123456 (preview build).");
        setVerifying(false);
        setCode("");
      }
    }, 700);
  };

  const handleResend = () => {
    if (resendIn > 0) return;
    setResendIn(30);
  };

  return (
    <ScreenWrap>
      <div className="flex flex-1 flex-col items-center text-center">
        <div className="pt-4">
          <p className="label-mono mb-3">Verify Identity</p>
          <h2 className="font-serif text-[32px] leading-tight text-foreground">
            We sent a code to
            <br />
            <span className="text-gradient-violet">{maskPhone(phone)}</span>
          </h2>
          <p className="mt-3 max-w-[320px] text-sm text-muted-foreground">
            Enter the 6-digit code to confirm this number is yours.
          </p>
        </div>

        <div className="relative my-9">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, oklch(0.78 0.16 295 / 0.28) 0%, transparent 65%)",
            }}
            animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.75, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary/40 bg-primary/10">
            <Shield className="h-10 w-10 text-primary" strokeWidth={1.4} />
          </div>
        </div>

        <div className="relative w-full">
          <div className="flex justify-center gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`flex h-14 w-11 items-center justify-center rounded-2xl border text-2xl font-mono transition-all ${
                  code.length === i
                    ? "border-primary bg-primary/10 glow-violet"
                    : code.length > i
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-white/[0.08] bg-white/[0.02]"
                }`}
              >
                {code[i] ?? ""}
              </div>
            ))}
          </div>
          <input
            autoFocus
            type="tel"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => handleChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="One-time code"
          />
        </div>

        {error && (
          <p className="mt-4 text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" />
          {resendIn > 0 ? (
            <span>Resend code in {resendIn}s</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="text-primary transition-colors hover:text-foreground"
            >
              Resend code
            </button>
          )}
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground/80">
          Preview build — live SMS verification is not yet wired up. Use code{" "}
          <span className="font-mono text-foreground">123456</span> to continue.
        </p>
      </div>

      <div className="mt-6 space-y-3 pb-2">
        <PrimaryCta disabled={code.length !== 6 || verifying} onClick={handleVerify}>
          {verifying ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
            </span>
          ) : (
            "Verify code"
          )}
        </PrimaryCta>
        <div className="flex items-center justify-center">
          <GhostBtn
            onClick={() => {
              update({ phoneVerified: false });
              onNext();
            }}
          >
            Skip for now
          </GhostBtn>
        </div>
      </div>
    </ScreenWrap>
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
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("+1");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
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

  const phoneValid = phone.replace(/\D/g, "").length >= 7;
  const nameValid = fullName.trim().length >= 2;

  const signupValid = nameValid && emailValid && pwLen && pwNum && pwSym && phoneValid;
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
              phone: `${country}${phone.replace(/\D/g, "")}`,
            },
          },
        });
        if (err) throw err;
        update({ fullName });
        markStep("account");
        // If email confirmation is required, no session is created. Surface that.
        if (!data.session) {
          setError("Check your email to confirm your account, then sign in.");
          return;
        }
        // Session is live — RequireOnboarding will pick up and continue the flow.
        navigate({ to: "/" });
      } else {
        // Pre-check: block sign-in for accounts pending deletion (30-day grace period).
        try {
          const { checkPendingDeletionByEmail } = await import("@/lib/access.functions");
          const pending = await checkPendingDeletionByEmail({ data: { email } });
          if (pending.pending) {
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
          // If the check fails, fall through to normal signin — Supabase will still authenticate.
        }

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

        // Defense-in-depth: re-check after successful auth in case of race; sign out if pending.
        try {
          const { checkPendingDeletionByEmail } = await import("@/lib/access.functions");
          const pending = await checkPendingDeletionByEmail({ data: { email } });
          if (pending.pending) {
            await supabase.auth.signOut();
            setError(
              "This account is scheduled for deletion. Contact support@aetherwealth.co to restore access.",
            );
            return;
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

      {mode === "signup" && (
        <div>
          <label className="label-mono">Phone</label>
          <div className="mt-1.5 flex gap-2">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50"
            >
              <option value="+1">🇺🇸 +1</option>
              <option value="+44">🇬🇧 +44</option>
              <option value="+33">🇫🇷 +33</option>
              <option value="+49">🇩🇪 +49</option>
              <option value="+41">🇨🇭 +41</option>
              <option value="+61">🇦🇺 +61</option>
              <option value="+971">🇦🇪 +971</option>
              <option value="+852">🇭🇰 +852</option>
              <option value="+65">🇸🇬 +65</option>
            </select>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(415) 555-0199"
              autoComplete="tel"
              className={`flex-1 rounded-xl border bg-white/[0.03] px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50 ${
                phone && !phoneValid ? "border-destructive/50" : "border-white/[0.08]"
              }`}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
          {error}
        </p>
      )}

      {mode === "signup" && !valid && (fullName || email || password || phone) && (
        <ul className="space-y-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[11px] text-muted-foreground">
          {!nameValid && <li>• Enter your full name (2+ characters)</li>}
          {!emailValid && <li>• Enter a valid email address</li>}
          {!pwLen && <li>• Password must be at least 12 characters</li>}
          {!pwNum && <li>• Password must include a number</li>}
          {!pwSym && <li>• Password must include a symbol (!@#$…)</li>}
          {!phoneValid && <li>• Enter a valid phone number (7+ digits)</li>}
        </ul>
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
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl gradient-violet shadow-[0_20px_60px_-12px_oklch(0.68_0.13_295/0.6)]"
        >
          <Sparkles className="h-9 w-9 text-foreground" strokeWidth={1.4} />
        </motion.div>
        <p className="label-mono mb-2">Æther Wealth</p>
        <h1 className="font-serif text-[36px] leading-[1.05] text-foreground">
          Your entire financial life.
          <br />
          <span className="text-gradient-violet">One secure place.</span>
        </h1>
        <p className="mt-4 max-w-[320px] text-sm text-muted-foreground">
          A private bank in your pocket — engineered with the discretion of a Swiss vault.
        </p>
      </div>

      {/* Tier preview — front and center */}
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
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <Link to="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <span aria-hidden className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <Link to="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
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
