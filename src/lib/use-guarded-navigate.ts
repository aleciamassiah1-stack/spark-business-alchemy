import { useCallback, useRef } from "react";
import { useLocation, useNavigate, type NavigateOptions } from "@tanstack/react-router";

/**
 * Returns a navigate fn that:
 *  - never navigates to the path you're already on, and
 *  - never re-fires the same target twice in a row (prevents auth-state-flip loops).
 *
 * Use this anywhere a useEffect could repeatedly call navigate() while upstream
 * state (auth/onboarding/access) is still settling.
 */
export function useGuardedNavigate() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastTarget = useRef<string | null>(null);

  return useCallback(
    (opts: NavigateOptions & { to: string }) => {
      const target = opts.to;
      if (location.pathname === target) {
        lastTarget.current = target;
        return;
      }
      if (lastTarget.current === target) return;
      lastTarget.current = target;
      navigate(opts);
    },
    [navigate, location.pathname],
  );
}
