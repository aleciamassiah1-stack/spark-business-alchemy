import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Check, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
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
  component: IntakePage,
});

const NET_WORTH_BANDS = [
  { key: "<1m", label: "Under $1M" },
  { key: "1-5m", label: "$1M – $5M" },
  { key: "5-25m", label: "$5M – $25M" },
  { key: "25m+", label: "$25M+" },
] as const;

const PRIMARY_GOALS = [
  { key: "preserve", label: "Preserve & protect what I have" },
  { key: "grow", label: "Grow my wealth long-term" },
  { key: "estate", label: "Estate & legacy planning" },
  { key: "consolidate", label: "Consolidate everything in one view" },
] as const;

type Step = "name" | "wealth" | "goal" | "advisor";
const STEPS: Step[] = ["name", "wealth", "goal", "advisor"];

function IntakePage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("name");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [netWorth, setNetWorth] = useState<string>("");
  const [goal, setGoal] = useState<string>("");
  const [hasAdvisor, setHasAdvisor] = useState<boolean | null>(null);
  const [advisorName, setAdvisorName] = useState("");
  const [advisorFirm, setAdvisorFirm] = useState("");
  const [advisorEmail, setAdvisorEmail] = useState("");

  // Load any existing intake; if already completed, skip straight to /profile
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
        setNetWorth(data.net_worth_band ?? "");
        setGoal(data.primary_goal ?? "");
        setHasAdvisor(data.has_advisor);
        setAdvisorName(data.advisor_name ?? "");
        setAdvisorFirm(data.advisor_firm ?? "");
        setAdvisorEmail(data.advisor_email ?? "");
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
  const canContinue = useMemo(() => {
    if (step === "name") return fullName.trim().length >= 2;
    if (step === "wealth") return netWorth.length > 0;
    if (step === "goal") return goal.length > 0;
    if (step === "advisor") return hasAdvisor !== null;
    return false;
  }, [step, fullName, netWorth, goal, hasAdvisor]);

  async function handleNext() {
    if (!canContinue) return;
    if (step !== "advisor") {
      setStep(STEPS[stepIndex + 1]);
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        plan: "essential", // placeholder; subscription row is the source of truth
        billing_interval: "monthly",
        full_name: fullName.trim(),
        net_worth_band: netWorth || null,
        primary_goal: goal || null,
        has_advisor: hasAdvisor,
        advisor_name: hasAdvisor ? advisorName.trim() || null : null,
        advisor_firm: hasAdvisor ? advisorFirm.trim() || null : null,
        advisor_email: hasAdvisor ? advisorEmail.trim() || null : null,
        completed_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("user_intake")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Profile saved");
      navigate({ to: "/profile" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <MobileShell title="Welcome" subtitle="Personalize your office">
      <div className="px-5 pt-2 pb-6">
        {/* Progress */}
        <div className="mb-4 flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= stepIndex ? "bg-primary" : "bg-white/[0.08]"
              }`}
            />
          ))}
        </div>
        <p className="label-mono">Step {stepIndex + 1} of {STEPS.length}</p>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-4"
        >
          {step === "name" && (
            <LuxCard className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="label-mono">Welcome aboard</p>
              </div>
              <h2 className="font-serif text-2xl text-foreground">
                What should we call you?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This is the name your advisor and family members will see.
              </p>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                autoFocus
                className="mt-5 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50"
              />
            </LuxCard>
          )}

          {step === "wealth" && (
            <LuxCard className="p-6">
              <p className="label-mono">A bit about you</p>
              <h2 className="mt-1 font-serif text-2xl text-foreground">
                What's your approximate net worth?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Helps us tune the dashboard and recommendations. Private to you.
              </p>
              <div className="mt-5 space-y-2">
                {NET_WORTH_BANDS.map((b) => (
                  <ChoiceRow
                    key={b.key}
                    label={b.label}
                    selected={netWorth === b.key}
                    onClick={() => setNetWorth(b.key)}
                  />
                ))}
              </div>
            </LuxCard>
          )}

          {step === "goal" && (
            <LuxCard className="p-6">
              <p className="label-mono">Your priority</p>
              <h2 className="mt-1 font-serif text-2xl text-foreground">
                What matters most right now?
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
                Do you work with a wealth advisor?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Optionally invite them to view your dashboard read-only.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <ChoiceRow
                  label="Yes, I do"
                  selected={hasAdvisor === true}
                  onClick={() => setHasAdvisor(true)}
                />
                <ChoiceRow
                  label="Not yet"
                  selected={hasAdvisor === false}
                  onClick={() => setHasAdvisor(false)}
                />
              </div>

              {hasAdvisor === true && (
                <div className="mt-5 space-y-3">
                  <input
                    value={advisorName}
                    onChange={(e) => setAdvisorName(e.target.value)}
                    placeholder="Advisor name"
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50"
                  />
                  <input
                    value={advisorFirm}
                    onChange={(e) => setAdvisorFirm(e.target.value)}
                    placeholder="Firm (optional)"
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50"
                  />
                  <input
                    value={advisorEmail}
                    onChange={(e) => setAdvisorEmail(e.target.value)}
                    placeholder="Advisor email (optional)"
                    type="email"
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50"
                  />
                </div>
              )}
            </LuxCard>
          )}
        </motion.div>

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
            ) : step === "advisor" ? (
              <>Finish <Check className="h-4 w-4" /></>
            ) : (
              <>Continue <ChevronRight className="h-4 w-4" /></>
            )}
          </button>
        </div>
      </div>
    </MobileShell>
  );
}

function ChoiceRow({
  label,
  selected,
  onClick,
}: {
  label: string;
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
      <span>{label}</span>
      {selected ? <Check className="h-4 w-4 text-primary" /> : null}
    </button>
  );
}
