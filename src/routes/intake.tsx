import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/intake")({
  head: () => ({
    meta: [
      { title: "Tell us about you — Æther Wealth" },
      { name: "description", content: "A few quick questions to personalize your private office." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireOnboarding>
      <IntakePage />
    </RequireOnboarding>
  ),
});

const FINANCIAL_PICTURE = [
  { key: "starting", label: "Just getting started", hint: "Beginning my wealth journey" },
  { key: "building", label: "Building my wealth", hint: "Actively growing assets" },
  { key: "established", label: "Established", hint: "$250K – $1M" },
  { key: "significant", label: "Significant wealth", hint: "$1M – $5M" },
  { key: "substantial", label: "Substantial wealth", hint: "$5M+" },
] as const;

const PRIMARY_GOALS = [
  { key: "networth", label: "See my complete net worth" },
  { key: "estate", label: "Organize my estate and will" },
  { key: "investments", label: "Track investments and insurance" },
  { key: "business", label: "Manage business and personal wealth" },
  { key: "family", label: "Plan for my family's future" },
] as const;

type Step = "name" | "picture" | "goal" | "advisor";
const STEPS: Step[] = ["name", "picture", "goal", "advisor"];

function IntakePage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("name");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [picture, setPicture] = useState<string>("");
  const [goal, setGoal] = useState<string>("");
  const [hasAdvisor, setHasAdvisor] = useState<boolean | null>(null);
  const [advisorName, setAdvisorName] = useState("");
  const [advisorFirm, setAdvisorFirm] = useState("");

  // Load any existing intake; if already completed, skip to next onboarding step
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate({ to: "/signin" });
      return;
    }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("user_intake")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!alive) return;
      if (data?.completed_at) {
        navigate({ to: "/profile" });
        return;
      }
      if (data) {
        setFullName(data.full_name ?? "");
        setPicture(data.net_worth_band ?? "");
        setGoal(data.primary_goal ?? "");
        setHasAdvisor(data.has_advisor);
        setAdvisorName(data.advisor_name ?? "");
        setAdvisorFirm(data.advisor_firm ?? "");
      } else {
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
        const metaName = (meta.full_name as string) || (meta.name as string) || "";
        if (metaName) setFullName(metaName);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [ready, user, navigate]);

  const stepIndex = STEPS.indexOf(step);
  const isLastStep = step === "advisor";

  const canContinue = useMemo(() => {
    if (step === "name") return fullName.trim().length >= 2;
    if (step === "picture") return picture.length > 0;
    if (step === "goal") return goal.length > 0;
    if (step === "advisor") return hasAdvisor !== null;
    return false;
  }, [step, fullName, picture, goal, hasAdvisor]);

  async function persistAndFinish(opts: { skipCurrent?: boolean } = {}) {
    if (!user) return;
    setSaving(true);
    try {
      const skip = opts.skipCurrent === true;
      const payload = {
        user_id: user.id,
        plan: "essential",
        billing_interval: "monthly",
        full_name: fullName.trim() || null,
        net_worth_band: picture || null,
        primary_goal: goal || null,
        has_advisor: skip && step === "advisor" ? null : hasAdvisor,
        advisor_name:
          hasAdvisor && !(skip && step === "advisor") ? advisorName.trim() || null : null,
        advisor_firm:
          hasAdvisor && !(skip && step === "advisor") ? advisorFirm.trim() || null : null,
        advisor_email: null,
        completed_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("user_intake")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Profile saved");
      navigate({ to: "/profile" });
    } catch (e) {
      toast.error("Couldn't save your profile. Please try again.", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  function advance() {
    if (isLastStep) {
      void persistAndFinish();
      return;
    }
    setStep(STEPS[stepIndex + 1]);
  }

  function handleSkip() {
    // Q1 (name) is not skippable — guard anyway
    if (step === "name") return;
    if (step === "picture") setPicture("");
    if (step === "goal") setGoal("");
    if (step === "advisor") {
      setHasAdvisor(null);
      setAdvisorName("");
      setAdvisorFirm("");
      void persistAndFinish({ skipCurrent: true });
      return;
    }
    advance();
  }

  function handleNext() {
    if (!canContinue) return;
    advance();
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const skippable = step !== "name";

  return (
    <MobileShell title="Welcome" subtitle="Personalize your office">
      <div className="px-5 pt-2 pb-6">
        {/* Progress */}
        <div className="mb-3 flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= stepIndex ? "bg-primary" : "bg-white/[0.08]"
              }`}
            />
          ))}
        </div>
        <p className="label-mono">
          Question {stepIndex + 1} of {STEPS.length}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4"
          >
            {step === "name" && (
              <LuxCard className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="label-mono">Welcome aboard</p>
                </div>
                <h2 className="font-serif text-2xl text-foreground">What should we call you?</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your preferred first name. We'll use it to personalize your dashboard.
                </p>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your first name"
                  autoFocus
                  maxLength={80}
                  className="mt-5 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50"
                />
              </LuxCard>
            )}

            {step === "picture" && (
              <LuxCard className="p-6">
                <p className="label-mono">A bit about you</p>
                <h2 className="mt-1 font-serif text-2xl text-foreground">
                  Which best describes your financial picture?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Helps us tune the dashboard to where you are today. Private to you.
                </p>
                <div className="mt-5 space-y-2">
                  {FINANCIAL_PICTURE.map((opt) => (
                    <ChoiceRow
                      key={opt.key}
                      label={opt.label}
                      hint={opt.hint}
                      selected={picture === opt.key}
                      onClick={() => setPicture(opt.key)}
                    />
                  ))}
                </div>
              </LuxCard>
            )}

            {step === "goal" && (
              <LuxCard className="p-6">
                <p className="label-mono">Your priority</p>
                <h2 className="mt-1 font-serif text-2xl text-foreground">
                  What brought you to Æther Wealth?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  We'll surface the tools that fit this goal first.
                </p>
                <div className="mt-5 space-y-2">
                  {PRIMARY_GOALS.map((g) => (
                    <ChoiceRow
                      key={g.key}
                      label={g.label}
                      selected={goal === g.key}
                      onClick={() => setGoal(g.key)}
                    />
                  ))}
                </div>
              </LuxCard>
            )}

            {step === "advisor" && (
              <LuxCard className="p-6">
                <p className="label-mono">Your circle</p>
                <h2 className="mt-1 font-serif text-2xl text-foreground">
                  Do you work with a financial advisor?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  We can keep them in the loop later — your choice.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <ChoiceRow
                    label="Yes"
                    selected={hasAdvisor === true}
                    onClick={() => setHasAdvisor(true)}
                  />
                  <ChoiceRow
                    label="No"
                    selected={hasAdvisor === false}
                    onClick={() => setHasAdvisor(false)}
                  />
                </div>

                {hasAdvisor === true && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-5 space-y-3"
                  >
                    <input
                      value={advisorName}
                      onChange={(e) => setAdvisorName(e.target.value)}
                      placeholder="Advisor name (optional)"
                      maxLength={120}
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50"
                    />
                    <input
                      value={advisorFirm}
                      onChange={(e) => setAdvisorFirm(e.target.value)}
                      placeholder="Firm name (optional)"
                      maxLength={120}
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50"
                    />
                  </motion.div>
                )}
              </LuxCard>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => stepIndex > 0 && setStep(STEPS[stepIndex - 1])}
            disabled={stepIndex === 0}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canContinue || saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 glow-violet"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isLastStep ? (
              <>
                Finish <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                Continue <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        {/* Quiet skip link — only on Q2-Q4 */}
        {skippable && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={handleSkip}
              disabled={saving}
              className="text-xs text-muted-foreground/70 underline-offset-4 transition hover:text-muted-foreground hover:underline disabled:opacity-40"
            >
              {step === "advisor" ? "I'll add this later" : "I'll share this later"}
            </button>
          </div>
        )}
      </div>
    </MobileShell>
  );
}

function ChoiceRow({
  label,
  hint,
  selected,
  onClick,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-all ${
        selected
          ? "border-primary/50 bg-primary/10 text-foreground glow-violet"
          : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
      }`}
    >
      <span className="flex flex-col">
        <span>{label}</span>
        {hint ? <span className="mt-0.5 text-[11px] text-muted-foreground/70">{hint}</span> : null}
      </span>
      {selected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
    </button>
  );
}
