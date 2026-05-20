import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, Crown, Sparkles, ArrowRight } from "lucide-react";
import { LuxCard } from "@/components/LuxCard";
import { useAccess } from "@/lib/access-context";
import { TIER_LABEL, type Tier } from "@/lib/tier";

type PlanRow = {
  key: Tier;
  tagline: string;
  highlights: string[];
  accent: string; // text color class
  dot: string; // bg color class
  icon?: React.ComponentType<{ className?: string }>;
};

const PLANS: PlanRow[] = [
  {
    key: "essential",
    tagline: "Individual wealth tracking",
    highlights: ["Up to 3 linked accounts", "Net worth & insurance", "Estate vault (5 docs)"],
    accent: "text-foreground",
    dot: "bg-muted-foreground",
  },
  {
    key: "private",
    tagline: "Unlimited accounts + family vault",
    highlights: ["Unlimited connections", "Family vault — 5 members", "Trust & estate tools"],
    accent: "text-violet-glow",
    dot: "bg-violet-glow",
    icon: Sparkles,
  },
  {
    key: "family",
    tagline: "Full multi-person household + business",
    highlights: [
      "Unlimited family members",
      "Household profile switching",
      "Business module + concierge",
    ],
    accent: "text-gold",
    dot: "bg-gold",
    icon: Crown,
  },
];

export function PlanOverviewCard() {
  const access = useAccess();
  if (!access.ready) return null;
  const currentTier: Tier = access.isAdmin ? "family" : access.tier ?? "essential";

  return (
    <LuxCard className="p-5" delay={0.2}>
      <div className="flex items-center justify-between">
        <div>
          <p className="label-mono">Your plan</p>
          <p className="mt-0.5 font-serif text-lg text-foreground">
            {TIER_LABEL[currentTier]}
          </p>
        </div>
        <Link
          to="/pricing"
          className="flex items-center gap-1 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-white/[0.10] hover:text-foreground"
        >
          Compare <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-4 space-y-2">
        {PLANS.map((plan, i) => {
          const isCurrent = plan.key === currentTier;
          const Icon = plan.icon;
          return (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
            >
              <Link
                to="/pricing"
                className={`block rounded-xl border p-3 transition-all ${
                  isCurrent
                    ? "border-primary/40 bg-primary/[0.06]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {Icon ? (
                      <Icon className={`h-3.5 w-3.5 ${plan.accent}`} />
                    ) : (
                      <span className={`h-1.5 w-1.5 rounded-full ${plan.dot}`} />
                    )}
                    <span className={`text-sm font-medium ${plan.accent}`}>
                      {TIER_LABEL[plan.key]}
                    </span>
                    {isCurrent && (
                      <span className="flex items-center gap-0.5 rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-primary">
                        <Check className="h-2.5 w-2.5" /> Current
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>
                <ul className="mt-2 grid gap-1">
                  {plan.highlights.map((h) => (
                    <li
                      key={h}
                      className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                    >
                      <Check className="h-2.5 w-2.5 shrink-0 text-success/70" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {currentTier !== "family" && (
        <Link
          to="/pricing"
          className="mt-3 flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-primary/20 to-violet-glow/20 px-4 py-2 text-xs font-medium text-foreground transition-opacity hover:opacity-90"
        >
          Upgrade your plan <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </LuxCard>
  );
}
