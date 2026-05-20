import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { LuxCard } from "./LuxCard";

export type HealthSignals = {
  hasAccounts: boolean;
  hasInsurance: boolean;
  hasEstateDocs: boolean;
  hasBeneficiaries: boolean;
  hasProperties: boolean;
};

type Check = {
  key: keyof HealthSignals;
  label: string;
  weight: number;
  to: string;
  cta: string;
};

const CHECKS: Check[] = [
  { key: "hasAccounts", label: "Accounts connected", weight: 30, to: "/connections", cta: "Connect accounts" },
  { key: "hasEstateDocs", label: "Will & estate docs", weight: 20, to: "/legacy", cta: "Upload your will" },
  { key: "hasInsurance", label: "Insurance logged", weight: 20, to: "/protect", cta: "Add a policy" },
  { key: "hasBeneficiaries", label: "Beneficiaries set", weight: 15, to: "/beneficiaries", cta: "Add beneficiaries" },
  { key: "hasProperties", label: "Real estate tracked", weight: 15, to: "/legacy", cta: "Add a property" },
];

export function computeHealthScore(s: HealthSignals): number {
  return CHECKS.reduce((sum, c) => sum + (s[c.key] ? c.weight : 0), 0);
}

function scoreBand(score: number) {
  if (score >= 85) return { label: "Excellent", color: "text-success", ring: "stroke-success" };
  if (score >= 60) return { label: "Strong", color: "text-primary", ring: "stroke-primary" };
  if (score >= 30) return { label: "Building", color: "text-gold", ring: "stroke-gold" };
  return { label: "Just starting", color: "text-warning", ring: "stroke-warning" };
}

export function FinancialHealthScore({ signals, delay = 0 }: { signals: HealthSignals; delay?: number }) {
  const score = computeHealthScore(signals);
  const band = scoreBand(score);
  const missing = CHECKS.filter((c) => !signals[c.key]);
  const nextStep = missing[0];

  // SVG ring math
  const R = 34;
  const C = 2 * Math.PI * R;
  const dash = (score / 100) * C;

  return (
    <LuxCard className="p-5" delay={delay}>
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
            <circle cx="40" cy="40" r={R} className="fill-none stroke-white/[0.06]" strokeWidth="6" />
            <motion.circle
              cx="40"
              cy="40"
              r={R}
              className={`fill-none ${band.ring}`}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C - dash }}
              transition={{ duration: 1.1, delay: delay + 0.15, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-serif text-2xl leading-none ${band.color}`}>{score}</span>
            <span className="mt-0.5 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">/ 100</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-gold" />
            <p className="label-mono">Financial health</p>
          </div>
          <p className={`mt-0.5 font-serif text-lg ${band.color}`}>{band.label}</p>
          <p className="text-xs text-muted-foreground">
            {missing.length === 0
              ? "Every signal is in place. Beautifully done."
              : `${5 - missing.length} of 5 signals complete`}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        {CHECKS.map((c) => {
          const done = signals[c.key];
          return (
            <div
              key={c.key}
              className="flex items-center justify-between rounded-lg px-2 py-1.5"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full ${
                    done ? "bg-success/20 text-success" : "border border-white/10 text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                </span>
                <span className={`text-xs ${done ? "text-foreground" : "text-muted-foreground"}`}>
                  {c.label}
                </span>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">+{c.weight}</span>
            </div>
          );
        })}
      </div>

      {nextStep && (
        <Link
          to={nextStep.to}
          className="mt-3 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 transition-all hover:bg-primary/15"
        >
          <div>
            <p className="text-[10px] uppercase tracking-wider text-primary/80">Next up</p>
            <p className="text-sm text-foreground">{nextStep.cta}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-primary" />
        </Link>
      )}
    </LuxCard>
  );
}
