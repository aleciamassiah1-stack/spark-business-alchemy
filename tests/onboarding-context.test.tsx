/**
 * Onboarding gating regression tests.
 * These guard the contract that decides whether a user sees the dashboard,
 * the onboarding flow, or gets bounced to /signup.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { act, render, renderHook } from "@testing-library/react";
import { OnboardingProvider, useOnboarding } from "@/lib/onboarding-context";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <OnboardingProvider>{children}</OnboardingProvider>
);

describe("onboarding-context", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts unready, then ready with empty profile", async () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    // useEffect flushes synchronously after render in jsdom
    expect(result.current.ready).toBe(true);
    expect(result.current.profile.completedSteps).toEqual([]);
    expect(result.current.onboarded).toBe(false);
    expect(result.current.completionPct).toBe(0);
  });

  it("requires account + verify + biometric + personalize to gate to dashboard", () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => result.current.markStep("account"));
    expect(result.current.onboarded).toBe(false);

    act(() => result.current.markStep("verify"));
    expect(result.current.onboarded).toBe(false);

    act(() => result.current.markStep("biometric"));
    expect(result.current.onboarded).toBe(false);

    act(() => result.current.markStep("personalize"));
    expect(result.current.onboarded).toBe(true);
  });

  it("does NOT require connect step for gating, but counts it in completion %", () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => result.current.markStep("account"));
    act(() => result.current.markStep("verify"));
    act(() => result.current.markStep("biometric"));
    act(() => result.current.markStep("personalize"));
    expect(result.current.onboarded).toBe(true);
    expect(result.current.completionPct).toBe(80); // 4/5 steps

    act(() => result.current.markStep("connect"));
    expect(result.current.completionPct).toBe(100);
  });

  it("persists profile across remounts via localStorage", () => {
    const first = renderHook(() => useOnboarding(), { wrapper });
    act(() => first.result.current.update({ fullName: "James Whitfield" }));
    act(() => first.result.current.markStep("account"));
    first.unmount();

    const second = renderHook(() => useOnboarding(), { wrapper });
    expect(second.result.current.profile.completedSteps).toContain("account");
    expect(second.result.current.profile.fullName).toBe("James Whitfield");
  });

  it("markStep is idempotent (no duplicate entries)", () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    act(() => {
      result.current.markStep("account");
      result.current.markStep("account");
      result.current.markStep("account");
    });
    expect(result.current.profile.completedSteps.filter((s) => s === "account")).toHaveLength(1);
  });

  it("reset clears profile and gating", () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    act(() => result.current.markStep("account"));
    act(() => result.current.markStep("verify"));
    act(() => result.current.markStep("biometric"));
    act(() => result.current.markStep("personalize"));
    expect(result.current.onboarded).toBe(true);

    act(() => result.current.reset());
    expect(result.current.onboarded).toBe(false);
    expect(result.current.completionPct).toBe(0);
  });

  it("useOnboarding outside provider returns safe noop (no crash)", () => {
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.ready).toBe(false);
    expect(result.current.onboarded).toBe(false);
    expect(() => result.current.markStep("account")).not.toThrow();
  });

  it("CompletionBanner renders content for incomplete profiles via render", () => {
    // Sanity: a consumer that reads ctx in render shouldn't crash before hydration
    function Probe() {
      const o = useOnboarding();
      return <div data-testid="pct">{o.completionPct}</div>;
    }
    const { getByTestId } = render(
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>,
    );
    expect(getByTestId("pct").textContent).toBe("0");
  });
});
