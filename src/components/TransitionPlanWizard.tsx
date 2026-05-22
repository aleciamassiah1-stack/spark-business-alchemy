import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Check, Handshake, Building2, Users, TrendingUp, HelpCircle, Pencil } from "lucide-react";
import {
  type BusinessState,
  type ExitStrategy,
  type ExitHorizon,
  dateToHorizon,
  horizonToDate,
  computeSuccessionReadiness,
  computeExitReadiness,
} from "@/lib/business-store";
import { fmtCurrency } from "@/lib/format";

type Props = {
  open: boolean;
  initialStep?: number;
  state: BusinessState;
  update: (p: (s: BusinessState) => BusinessState) => void;
  onClose: () => void;
};

const TOTAL_STEPS = 5;

const horizons: { id: ExitHorizon; label: string; sub: string }[] = [
  { id: "<2y", label: "Within 2 years", sub: "Acting soon" },
  { id: "3-5y", label: "3 – 5 years", sub: "Most common" },
  { id: "5-10y", label: "5 – 10 years", sub: "Steady build" },
  { id: "10y+", label: "10+ years", sub: "Long horizon" },
  { id: "unsure", label: "Not sure yet", sub: "We'll keep this flexible" },
];

const strategies: {
  id: ExitStrategy;
  label: string;
  desc: string;
  icon: typeof Handshake;
  multiple: number;
}[] = [
  { id: "M&A", label: "Sell to another company", desc: "Most common path. A buyer acquires the business outright.", icon: Handshake, multiple: 4 },
  { id: "Family Transfer", label: "Pass to family", desc: "Transfer ownership to a child, spouse, or relative over time.", icon: Users, multiple: 2 },
  { id: "MBO", label: "Sell to your team", desc: "Management buy-out. Your leaders buy you out, often over years.", icon: Building2, multiple: 3 },
  { id: "IPO", label: "Take it public", desc: "List on a stock exchange. Reserved for larger, growing companies.", icon: TrendingUp, multiple: 8 },
];

export function TransitionPlanWizard({ open, initialStep = 1, state, update, onClose }: Props) {
  const [step, setStep] = useState(initialStep);
  const [showWhy, setShowWhy] = useState(false);

  // Local draft so the user can navigate steps without partial commits.
  const [horizon, setHorizon] = useState<ExitHorizon>(dateToHorizon(state.exit.targetDate));
  const [strategy, setStrategy] = useState<ExitStrategy | "">(state.exit.strategy || "");
  const [targetValuation, setTargetValuation] = useState<number>(state.exit.targetValuation);
  const [successorName, setSuccessorName] = useState(state.succession.successorName);
  const [successorRole, setSuccessorRole] = useState(state.succession.successorRole);
  const [buySellSigned, setBuySellSigned] = useState(state.succession.buySellSigned);
  const [hasAttorney, setHasAttorney] = useState(state.succession.attorney.trim().length > 0);
  const [attorney, setAttorney] = useState(state.succession.attorney);

  useEffect(() => {
    if (open) {
      setStep(initialStep);
      setHorizon(dateToHorizon(state.exit.targetDate));
      setStrategy(state.exit.strategy || "");
      setTargetValuation(state.exit.targetValuation);
      setSuccessorName(state.succession.successorName);
      setSuccessorRole(state.succession.successorRole);
      setBuySellSigned(state.succession.buySellSigned);
      setHasAttorney(state.succession.attorney.trim().length > 0);
      setAttorney(state.succession.attorney);
      setShowWhy(false);
    }
  }, [open, initialStep, state]);

  // Suggest target valuation based on strategy multiple, when user hasn't set one.
  useEffect(() => {
    if (!strategy) return;
    const s = strategies.find((x) => x.id === strategy);
    if (!s) return;
    const suggested = Math.round(state.valuation * s.multiple);
    if (targetValuation <= 0 && suggested > 0) setTargetValuation(suggested);
  }, [strategy, state.valuation, targetValuation]);

  function persistProgress(nextStep: number, completed = false) {
    update((st) => ({
      ...st,
      exit: {
        ...st.exit,
        targetDate: horizonToDate(horizon) || st.exit.targetDate,
        strategy: (strategy || st.exit.strategy) as ExitStrategy,
        targetValuation: targetValuation || st.exit.targetValuation,
      },
      succession: {
        ...st.succession,
        successorName,
        successorRole,
        buySellSigned,
        attorney: hasAttorney ? attorney : "",
        status: completed
          ? "Complete"
          : successorName.trim() || buySellSigned
            ? "In Progress"
            : st.succession.status,
        wizardStep: nextStep,
        wizardCompleted: completed || st.succession.wizardCompleted,
      },
    }));
  }

  function next() {
    if (step >= TOTAL_STEPS) return;
    persistProgress(step + 1);
    setStep((s) => s + 1);
  }

  function back() {
    if (step <= 1) return;
    setStep((s) => s - 1);
  }

  function savePlan() {
    persistProgress(TOTAL_STEPS, true);
    onClose();
  }

  const successionReady = computeSuccessionReadiness({
    ...state,
    succession: {
      ...state.succession,
      successorName,
      successorRole,
      buySellSigned,
      attorney: hasAttorney ? attorney : "",
    },
  });
  const exitReady = computeExitReadiness({
    ...state,
    exit: {
      ...state.exit,
      targetDate: horizonToDate(horizon) || state.exit.targetDate,
      strategy: (strategy || state.exit.strategy) as ExitStrategy,
      targetValuation: targetValuation || state.exit.targetValuation,
    },
    succession: {
      ...state.succession,
      successorName,
      successorRole,
      buySellSigned,
      attorney: hasAttorney ? attorney : "",
    },
  });

  const canContinue =
    step === 1 ? !!horizon :
    step === 2 ? !!strategy :
    step === 3 ? targetValuation > 0 :
    true;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-3xl border-t border-white/[0.06] bg-background [-webkit-overflow-scrolling:touch]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / progress bar */}
            <div className="sticky top-0 z-10 border-b border-white/[0.04] bg-background/90 px-5 pt-3 pb-3 backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="label-mono">Plan your transition</p>
                  <button
                    type="button"
                    onClick={() => setShowWhy((v) => !v)}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.05] text-muted-foreground"
                    aria-label="Why this matters"
                  >
                    <HelpCircle className="h-3 w-3" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.05]"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${i < step ? "gradient-violet" : "bg-white/[0.06]"}`}
                  />
                ))}
              </div>
              <p className="mt-2 font-mono text-[10px] text-muted-foreground">Step {step} of {TOTAL_STEPS}</p>
              <AnimatePresence>
                {showWhy && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="mt-3 rounded-2xl bg-white/[0.03] p-3 text-[12px] leading-relaxed text-muted-foreground">
                      A clear transition plan protects your family, your team, and the value you've built.
                      Most owners delay it because it feels heavy — Æther breaks it into five quick questions.
                      Everything stays private to you.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="px-5 py-6">
              {step === 1 && (
                <StepShell
                  title="When do you want to step away?"
                  helper="A rough timeline is enough. You can change it anytime."
                >
                  <div className="grid grid-cols-1 gap-2">
                    {horizons.map((h) => {
                      const active = horizon === h.id;
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => setHorizon(h.id)}
                          className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                            active
                              ? "border-primary/50 bg-primary/10"
                              : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                          }`}
                        >
                          <div>
                            <p className="text-sm text-foreground">{h.label}</p>
                            <p className="text-[11px] text-muted-foreground">{h.sub}</p>
                          </div>
                          {active && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </StepShell>
              )}

              {step === 2 && (
                <StepShell
                  title="How do you imagine exiting?"
                  helper="Pick the closest fit — no commitment. We'll tailor the rest of the plan."
                >
                  <div className="grid grid-cols-1 gap-2">
                    {strategies.map((s) => {
                      const active = strategy === s.id;
                      const Icon = s.icon;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setStrategy(s.id)}
                          className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                            active
                              ? "border-primary/50 bg-primary/10"
                              : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${active ? "gradient-violet" : "bg-white/[0.04]"}`}>
                            <Icon className="h-4 w-4 text-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-foreground">{s.label}</p>
                            <p className="text-[11px] leading-relaxed text-muted-foreground">{s.desc}</p>
                          </div>
                          {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setStrategy("M&A")}
                      className="mt-1 text-center text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                    >
                      Still deciding — pick the most common
                    </button>
                  </div>
                </StepShell>
              )}

              {step === 3 && (
                <StepShell
                  title="What's your target sale price?"
                  helper={
                    strategy
                      ? `Most ${labelForStrategy(strategy)} deals sell for around ${strategies.find((s) => s.id === strategy)?.multiple}× current valuation.`
                      : "We'll suggest a range once you pick a strategy."
                  }
                >
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Target valuation</p>
                    <p className="mt-1 font-serif text-3xl text-foreground tabular-nums">
                      {fmtCurrency(targetValuation, { compact: true })}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      Current valuation: {fmtCurrency(state.valuation, { compact: true })}
                    </p>
                    <input
                      type="range"
                      min={Math.max(0, state.valuation)}
                      max={Math.max(state.valuation * 10, 1_000_000)}
                      step={Math.max(1000, Math.round(state.valuation / 50))}
                      value={targetValuation}
                      onChange={(e) => setTargetValuation(Number(e.target.value))}
                      className="mt-4 w-full accent-[oklch(0.62_0.18_295)]"
                    />
                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>1×</span>
                      <span>5×</span>
                      <span>10×</span>
                    </div>
                  </div>
                  <input
                    inputMode="numeric"
                    value={targetValuation || ""}
                    placeholder="Or type an exact number"
                    onChange={(e) => setTargetValuation(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                    className="luxe-input mt-3 font-mono"
                  />
                </StepShell>
              )}

              {step === 4 && (
                <StepShell
                  title="Who would take over if you stepped away tomorrow?"
                  helper="A safety net for your team and family. Skip what you don't have yet."
                >
                  <div className="space-y-3">
                    <Field label="Successor name (optional)">
                      <input
                        value={successorName}
                        onChange={(e) => setSuccessorName(e.target.value)}
                        placeholder="e.g. Catherine Whitfield"
                        className="luxe-input"
                      />
                    </Field>
                    <Field label="Their current role">
                      <input
                        value={successorRole}
                        onChange={(e) => setSuccessorRole(e.target.value)}
                        placeholder="e.g. COO"
                        className="luxe-input"
                      />
                    </Field>
                    <CheckboxRow
                      checked={buySellSigned}
                      onChange={setBuySellSigned}
                      label="I have a signed buy-sell agreement"
                      desc="A contract that decides what happens to your share if you exit, retire, or pass away."
                    />
                    <CheckboxRow
                      checked={hasAttorney}
                      onChange={setHasAttorney}
                      label="I have a business or estate attorney"
                      desc="So we know who to loop in when you're ready to move."
                    />
                    {hasAttorney && (
                      <Field label="Attorney or firm name">
                        <input
                          value={attorney}
                          onChange={(e) => setAttorney(e.target.value)}
                          placeholder="e.g. Holloway & Sterne LLP"
                          className="luxe-input"
                        />
                      </Field>
                    )}
                  </div>
                </StepShell>
              )}

              {step === 5 && (
                <StepShell
                  title="Your transition plan"
                  helper="Review and save. You can edit any answer later."
                >
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <ReadinessBar label="Succession" value={successionReady} tone="violet" />
                    <ReadinessBar label="Exit" value={exitReady} tone="gold" />
                  </div>
                  <div className="space-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <RecapRow label="Timeline" value={horizons.find((h) => h.id === horizon)?.label ?? "—"} onEdit={() => setStep(1)} />
                    <RecapRow label="Strategy" value={strategy ? labelForStrategy(strategy as ExitStrategy) : "—"} onEdit={() => setStep(2)} />
                    <RecapRow label="Target price" value={targetValuation > 0 ? fmtCurrency(targetValuation, { compact: true }) : "—"} onEdit={() => setStep(3)} />
                    <RecapRow label="Successor" value={successorName || "Not chosen"} onEdit={() => setStep(4)} />
                    <RecapRow label="Buy-sell" value={buySellSigned ? "Signed" : "Pending"} onEdit={() => setStep(4)} />
                    <RecapRow label="Attorney" value={hasAttorney && attorney ? attorney : "Not added"} onEdit={() => setStep(4)} last />
                  </div>
                </StepShell>
              )}
            </div>

            {/* Footer nav */}
            <div className="sticky bottom-0 z-10 flex items-center gap-2 border-t border-white/[0.04] bg-background/90 px-5 py-3 backdrop-blur-md">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={back}
                  className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-[12px] text-foreground"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Back
                </button>
              ) : (
                <div className="w-[68px]" />
              )}
              <div className="flex-1" />
              {step < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={next}
                  disabled={!canContinue}
                  className="flex items-center gap-1 rounded-full gradient-violet px-5 py-2.5 text-[12px] font-medium text-foreground glow-violet disabled:opacity-40"
                >
                  Continue <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={savePlan}
                  className="flex items-center gap-1 rounded-full gradient-violet px-5 py-2.5 text-[12px] font-medium text-foreground glow-violet"
                >
                  <Check className="h-3.5 w-3.5" /> Save plan
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StepShell({ title, helper, children }: { title: string; helper: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-serif text-xl text-foreground">{title}</h3>
      <p className="mt-1 mb-5 text-[12px] leading-relaxed text-muted-foreground">{helper}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function CheckboxRow({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
        checked ? "border-primary/40 bg-primary/10" : "border-white/[0.06] bg-white/[0.02]"
      }`}
    >
      <div
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          checked ? "border-primary bg-primary text-background" : "border-white/30"
        }`}
      >
        {checked && <Check className="h-3 w-3" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-foreground">{label}</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </button>
  );
}

function RecapRow({ label, value, onEdit, last }: { label: string; value: string; onEdit: () => void; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 ${last ? "" : "border-b border-white/[0.04]"}`}>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-[13px] text-foreground">{value}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="flex items-center gap-1 rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] text-muted-foreground hover:text-foreground"
      >
        <Pencil className="h-3 w-3" /> Edit
      </button>
    </div>
  );
}

function ReadinessBar({ label, value, tone }: { label: string; value: number; tone: "violet" | "gold" }) {
  const color = tone === "gold" ? "bg-gold" : "gradient-violet";
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-mono text-[11px] tabular-nums text-foreground">{value}/100</p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function labelForStrategy(s: ExitStrategy): string {
  if (s === "M&A") return "M&A (sale to another company)";
  if (s === "Family Transfer") return "family transfer";
  if (s === "MBO") return "management buy-out";
  return "IPO";
}
