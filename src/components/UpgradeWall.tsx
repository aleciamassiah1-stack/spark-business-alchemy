import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { useAccess } from "@/lib/access-context";
import { tierAtLeast, TIER_LABEL, type Tier } from "@/lib/tier";

type Props = {
  /** Minimum tier required to view the wrapped content. */
  minTier: Tier;
  /** Short feature name shown in the headline, e.g. "Business Hub". */
  feature: string;
  /** One-line description of what the feature unlocks. */
  description: string;
  /** Bullet list of perks the user gets after upgrading. */
  perks?: string[];
  /** Whether to render inside a MobileShell. Defaults to true for full-page gates. */
  fullPage?: boolean;
  children: ReactNode;
};

/**
 * Gates content behind a tier. Admins and users at or above `minTier` see
 * `children`. Anyone below sees a dark/gold luxury upgrade wall with a lock
 * icon and a CTA to /pricing — never silently hidden.
 */
export function UpgradeWall({
  minTier,
  feature,
  description,
  perks = [],
  fullPage = true,
  children,
}: Props) {
  const { ready, tier, isAdmin } = useAccess();

  if (!ready) {
    if (fullPage) {
      return (
        <MobileShell>
          <div className="min-h-[60vh]" aria-hidden />
        </MobileShell>
      );
    }
    return <div className="min-h-[200px]" aria-hidden />;
  }

  if (isAdmin || tierAtLeast(tier, minTier)) {
    return <>{children}</>;
  }

  const wall = (
    <div className="px-5 py-8">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <LuxCard
          className="relative overflow-hidden border p-7 text-center"
          // gold luxury border via inline style so we don't depend on missing tokens
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(circle at 50% 0%, oklch(0.82 0.12 85 / 0.18) 0%, transparent 65%)",
            }}
            aria-hidden
          />
          <div className="relative">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.82 0.12 85 / 0.25), oklch(0.82 0.12 85 / 0.05))",
                border: "1px solid oklch(0.82 0.12 85 / 0.35)",
              }}
            >
              <Lock
                className="h-6 w-6"
                style={{ color: "oklch(0.82 0.12 85)" }}
                aria-hidden
              />
            </div>

            <p
              className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em]"
              style={{ color: "oklch(0.82 0.12 85)" }}
            >
              {TIER_LABEL[minTier]} feature
            </p>
            <h2 className="mt-2 font-serif text-2xl text-foreground">
              {feature}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>

            {perks.length > 0 && (
              <ul className="mx-auto mt-5 max-w-xs space-y-2 text-left">
                {perks.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-2 text-[13px] text-foreground/90"
                  >
                    <Sparkles
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      style={{ color: "oklch(0.82 0.12 85)" }}
                      aria-hidden
                    />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            )}

            <Link
              to="/pricing"
              className="mt-6 inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-medium text-background transition-all hover:opacity-90"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.82 0.12 85), oklch(0.72 0.14 75))",
                boxShadow: "0 10px 30px -10px oklch(0.82 0.12 85 / 0.5)",
              }}
            >
              Upgrade to {TIER_LABEL[minTier]}
            </Link>

            {tier && (
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                You're on {TIER_LABEL[tier]}
              </p>
            )}
          </div>
        </LuxCard>
      </motion.div>
    </div>
  );

  if (fullPage) {
    return <MobileShell>{wall}</MobileShell>;
  }
  return wall;
}
