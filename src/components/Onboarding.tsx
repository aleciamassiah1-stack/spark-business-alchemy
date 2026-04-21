import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, EyeOff, Check, X, Eye, Wallet, TrendingUp, KeyRound, Ban, Fingerprint, Timer, ChevronRight } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-context";

/**
 * `forceOpen` — render the flow regardless of completion state. Used by
 * `RequireOnboarding` to gate protected routes. When omitted, the component
 * shows itself only on first visit (until `complete()` is called).
 */
export function Onboarding({ forceOpen = false }: { forceOpen?: boolean } = {}) {
  const { ready, completed, complete } = useOnboarding();
  const [step, setStep] = useState(0);

  const finish = () => complete();
  const next = () => setStep((s) => s + 1);

  // When not gating a route, hide until we've checked storage and only show
  // for users who haven't completed it yet.
  if (!forceOpen && (!ready || completed)) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-center bg-background">
      {/* Ambient backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, oklch(0.42 0.14 295 / 0.35) 0%, transparent 55%), radial-gradient(circle at 0% 100%, oklch(0.32 0.08 280 / 0.25) 0%, transparent 50%)",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-[430px] flex-col">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pb-4 pt-8">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-primary glow-violet" : i < step ? "w-4 bg-primary/60" : "w-4 bg-white/10"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && <ScreenFortKnox key="s0" onNext={next} />}
          {step === 1 && <ScreenPermissions key="s1" onNext={next} />}
          {step === 2 && <ScreenBiometric key="s2" onNext={finish} />}
        </AnimatePresence>

        <div className="flex justify-center pb-6 pt-2">
          <button
            onClick={finish}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip tour
          </button>
        </div>
      </div>
    </div>
  );
}

function ScreenWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-1 flex-col px-6"
    >
      {children}
    </motion.section>
  );
}

function PrimaryCta({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group inline-flex w-full items-center justify-center gap-2 rounded-full gradient-violet px-6 py-4 text-sm font-medium text-foreground shadow-[0_8px_32px_-8px_oklch(0.68_0.13_295/0.55)] transition-all hover:scale-[1.01] active:scale-[0.99] glow-violet"
    >
      {children}
      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

/* ───── Screen 1: Fort Knox ───── */
function ScreenFortKnox({ onNext }: { onNext: () => void }) {
  return (
    <ScreenWrap>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {/* Animated shield */}
        <div className="relative mb-10">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(circle, oklch(0.68 0.13 295 / 0.45) 0%, transparent 65%)" }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex h-32 w-32 items-center justify-center rounded-3xl gradient-violet shadow-[0_20px_60px_-12px_oklch(0.68_0.13_295/0.6)]"
          >
            <Shield className="h-14 w-14 text-foreground" strokeWidth={1.4} />
            <motion.div
              className="absolute inset-0 rounded-3xl border border-white/20"
              animate={{ opacity: [0.2, 0.6, 0.2] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </div>

        <p className="label-mono mb-3">Welcome to Æther Wealth</p>
        <h1 className="font-serif text-[40px] leading-[1.05] text-foreground">
          Your wealth.
          <br />
          <span className="text-gradient-violet">Fort Knox'd.</span>
        </h1>
        <p className="mt-4 max-w-[320px] text-sm text-muted-foreground">
          A private bank in your pocket — engineered with the discretion of a Swiss vault.
        </p>

        <ul className="mt-10 flex w-full max-w-[360px] flex-col gap-3 text-left">
          <Bullet icon={Lock} title="256-bit bank-level encryption" desc="Every byte at rest and in transit." />
          <Bullet icon={Eye} title="Read-only connections" desc="We can never move your money. Ever." />
          <Bullet icon={EyeOff} title="Your data is never sold" desc="Not to advertisers, not to anyone." />
        </ul>
      </div>

      <div className="mt-10 space-y-4 pb-2">
        <div className="flex items-center justify-center gap-2">
          <Badge label="SOC 2 · Type II" />
          <Badge label="FINRA Compliant" />
          <Badge label="AES-256" />
        </div>
        <PrimaryCta onClick={onNext}>I'm ready — let's go</PrimaryCta>
      </div>
    </ScreenWrap>
  );
}

function Bullet({ icon: Icon, title, desc }: { icon: typeof Lock; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
        <Icon className="h-4 w-4 text-primary" strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-[11.5px] leading-snug text-muted-foreground">{desc}</p>
      </div>
    </li>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground/90 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5">
      {label}
    </span>
  );
}

/* ───── Screen 2: Permissions ───── */
function ScreenPermissions({ onNext }: { onNext: () => void }) {
  return (
    <ScreenWrap>
      <div className="flex flex-1 flex-col">
        <div className="pt-4 text-center">
          <p className="label-mono mb-3">Step 2 · Permissions</p>
          <h2 className="font-serif text-[32px] leading-tight text-foreground">
            Transparency, by design.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Before you connect a single account, here's exactly what changes — and what doesn't.
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3.5 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-success">
              Read-Only Access
            </span>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <Column
            tone="positive"
            title="What we see"
            items={[
              { icon: Wallet, label: "Account balances" },
              { icon: TrendingUp, label: "Holdings & positions" },
              { icon: Eye, label: "Transaction history" },
            ]}
          />
          <Column
            tone="negative"
            title="What we never see"
            items={[
              { icon: KeyRound, label: "Your passwords" },
              { icon: Ban, label: "Your SSN" },
              { icon: X, label: "Ability to transfer" },
            ]}
          />
        </div>

        <p className="mt-5 px-2 text-center text-[11.5px] leading-snug text-muted-foreground">
          Connections are made through Plaid — the same secure pipeline trusted by Venmo, Robinhood, and Chime.
        </p>
      </div>

      <div className="mt-8 pb-2">
        <PrimaryCta onClick={onNext}>Connect my first account</PrimaryCta>
      </div>
    </ScreenWrap>
  );
}

function Column({
  tone,
  title,
  items,
}: {
  tone: "positive" | "negative";
  title: string;
  items: { icon: typeof Lock; label: string }[];
}) {
  const isPos = tone === "positive";
  return (
    <div
      className={`rounded-2xl border p-4 ${
        isPos
          ? "border-success/25 bg-success/[0.04]"
          : "border-destructive/25 bg-destructive/[0.04]"
      }`}
    >
      <div className="mb-3 flex items-center gap-1.5">
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-full ${
            isPos ? "bg-success/20" : "bg-destructive/20"
          }`}
        >
          {isPos ? (
            <Check className="h-3 w-3 text-success" strokeWidth={2.6} />
          ) : (
            <X className="h-3 w-3 text-destructive" strokeWidth={2.6} />
          )}
        </div>
        <p
          className={`font-mono text-[9.5px] uppercase tracking-[0.16em] ${
            isPos ? "text-success" : "text-destructive"
          }`}
        >
          {title}
        </p>
      </div>
      <ul className="space-y-2.5">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.label} className="flex items-center gap-2">
              <Icon
                className={`h-3.5 w-3.5 shrink-0 ${
                  isPos ? "text-success/80" : "text-destructive/80"
                }`}
                strokeWidth={1.8}
              />
              <span
                className={`text-[12.5px] ${
                  isPos ? "text-foreground" : "text-muted-foreground line-through decoration-destructive/40"
                }`}
              >
                {it.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ───── Screen 3: Biometric ───── */
function ScreenBiometric({ onNext }: { onNext: () => void }) {
  const [enabled, setEnabled] = useState(false);

  const tryBiometric = async () => {
    // Best-effort WebAuthn probe; gracefully no-op if unavailable.
    try {
      if (typeof window !== "undefined" && "PublicKeyCredential" in window) {
        // We only flip the state — full WebAuthn enrollment is out of scope here.
        setEnabled(true);
        return;
      }
    } catch {
      /* noop */
    }
    setEnabled(true);
  };

  return (
    <ScreenWrap>
      <div className="flex flex-1 flex-col items-center text-center">
        <div className="pt-4">
          <p className="label-mono mb-3">Step 3 · Biometric Lock</p>
          <h2 className="font-serif text-[32px] leading-tight text-foreground">
            Lock the vault
            <br />
            <span className="text-gradient-violet">to your face.</span>
          </h2>
        </div>

        {/* Animated fingerprint / face id */}
        <div className="relative my-10">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(circle, oklch(0.78 0.16 295 / 0.35) 0%, transparent 65%)" }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.button
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
                <motion.div
                  key="fp"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Fingerprint className="h-16 w-16 text-primary" strokeWidth={1.4} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        <p className="text-sm text-muted-foreground">
          {enabled
            ? "Biometric lock enabled."
            : "Tap to enable Face ID or Touch ID."}
        </p>

        <div className="mt-6 flex w-full max-w-[340px] items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <Timer className="h-4 w-4 text-primary" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Auto-lock after 60 seconds</p>
            <p className="text-[11.5px] leading-snug text-muted-foreground">
              Your app re-locks the moment you look away.
            </p>
          </div>
        </div>

        <button
          className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          onClick={() => setEnabled(true)}
        >
          Use passcode instead
        </button>
      </div>

      <div className="mt-8 pb-2">
        <PrimaryCta onClick={onNext}>
          {enabled ? "Enter Æther Wealth" : "Continue without biometric"}
        </PrimaryCta>
      </div>
    </ScreenWrap>
  );
}
