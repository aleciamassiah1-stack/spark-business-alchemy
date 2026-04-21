import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Sparkles } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-context";

const SESSION_KEY = "aether.banner.dismissedThisSession";

/**
 * Persistent profile completion banner. Dismissable per session, reappears
 * each new session until profile is 80%+ complete.
 */
export function CompletionBanner() {
  const { ready, completionPct, profile } = useOnboarding();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  });

  if (!ready || completionPct >= 80 || dismissed) return null;

  // Suggest the next step.
  const next = !profile.completedSteps.includes("connect")
    ? { label: "Connect your first account", to: "/connections" as const }
    : !profile.completedSteps.includes("personalize")
      ? { label: "Personalize your experience", to: "/" as const }
      : { label: "Finish setup", to: "/" as const };

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    }
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        className="px-5 pt-4"
      >
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full gradient-violet">
              <Sparkles className="h-4 w-4 text-foreground" strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-serif text-sm text-foreground">Complete your profile</p>
                <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
                  {completionPct}%
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full gradient-violet"
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPct}%` }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <Link
                to={next.to}
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {next.label}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
