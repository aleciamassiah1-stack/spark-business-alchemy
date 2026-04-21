/**
 * Signup → dashboard flow regression test.
 *
 * This is an integration-level test that exercises the real components
 * (AuthForm, RequireOnboarding, AuthProvider, OnboardingProvider) with a
 * mocked Supabase client, to catch the kind of gating regressions we've hit:
 *
 *   1. Signup must create a session AND mark the "account" step.
 *   2. After signup, RequireOnboarding must render <Onboarding />, NOT children.
 *   3. After all required steps complete, RequireOnboarding must render children.
 *   4. Signed-out users must NOT see protected children.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockSupabase } from "./mocks/supabase";

// Mock the Supabase client BEFORE importing anything that uses it.
const { supabase, helpers } = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase }));

// Mock TanStack Router navigate — we assert state, not URL transitions.
const navigateSpy = vi.fn();
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router",
  );
  return {
    ...actual,
    useNavigate: () => navigateSpy,
    Link: ({ children, to }: { children: React.ReactNode; to?: string }) => (
      <a href={to}>{children}</a>
    ),
  };
});

// Imports MUST come after vi.mock above.
import { AuthProvider } from "@/lib/auth-context";
import { OnboardingProvider, useOnboarding } from "@/lib/onboarding-context";
import { AuthForm } from "@/components/Onboarding";
import { RequireOnboarding } from "@/components/RequireOnboarding";

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <OnboardingProvider>{children}</OnboardingProvider>
    </AuthProvider>
  );
}

beforeEach(() => {
  helpers.reset();
  navigateSpy.mockReset();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("Signup flow → onboarding gate → dashboard", () => {
  it("Signed-out user is redirected away from protected content", async () => {
    render(
      <Providers>
        <RequireOnboarding>
          <div data-testid="dashboard">DASH</div>
        </RequireOnboarding>
      </Providers>,
    );

    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith({ to: "/signup" });
    });
    expect(screen.queryByTestId("dashboard")).toBeNull();
  });

  it("Submitting AuthForm signup creates a session and marks the account step", async () => {
    const user = userEvent.setup();

    render(
      <Providers>
        <AuthForm mode="signup" />
      </Providers>,
    );

    await user.type(screen.getByPlaceholderText("James Whitfield"), "James Whitfield");
    await user.type(screen.getByPlaceholderText("you@example.com"), "james@example.com");
    await user.type(
      screen.getByPlaceholderText("12+ characters"),
      "Aether-Vault-2026!",
    );
    await user.type(screen.getByPlaceholderText("(415) 555-0199"), "4155550199");

    const submit = screen.getByRole("button", { name: /continue/i });
    await waitFor(() => expect(submit).not.toBeDisabled());
    await user.click(submit);

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledTimes(1);
    });
    expect(helpers.currentSession()?.user.email).toBe("james@example.com");

    // The "account" step must be persisted so RequireOnboarding can advance.
    const stored = JSON.parse(window.localStorage.getItem("aether.onboarding.v2") || "{}");
    expect(stored.completedSteps).toContain("account");
    expect(stored.fullName).toBe("James Whitfield");

    // Navigates to dashboard root after success.
    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith({ to: "/" }));
  });

  it("After signup, RequireOnboarding shows the onboarding flow (not the dashboard)", async () => {
    // Pre-seed: account step done, session live → user is mid-onboarding.
    window.localStorage.setItem(
      "aether.onboarding.v2",
      JSON.stringify({ completedSteps: ["account"], fullName: "Jane" }),
    );
    helpers.setSession({
      access_token: "x",
      refresh_token: "y",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { id: "u1", email: "j@x.com", user_metadata: {} } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(
      <Providers>
        <RequireOnboarding>
          <div data-testid="dashboard">DASH</div>
        </RequireOnboarding>
      </Providers>,
    );

    // Onboarding renders (verify screen is the first remaining step).
    await waitFor(() => {
      expect(screen.getByText(/Verify Identity/i)).toBeInTheDocument();
    });
    expect(screen.queryByTestId("dashboard")).toBeNull();
  });

  it("With all required steps complete, dashboard renders", async () => {
    window.localStorage.setItem(
      "aether.onboarding.v2",
      JSON.stringify({
        completedSteps: ["account", "verify", "biometric", "personalize"],
      }),
    );
    helpers.setSession({
      access_token: "x",
      refresh_token: "y",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { id: "u1", email: "j@x.com", user_metadata: {} } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(
      <Providers>
        <RequireOnboarding>
          <div data-testid="dashboard">DASH</div>
        </RequireOnboarding>
      </Providers>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard")).toBeInTheDocument();
    });
    expect(navigateSpy).not.toHaveBeenCalledWith({ to: "/signup" });
  });

  it("Failed signin lockout: 5 wrong attempts disable the button for 15 min", async () => {
    const user = userEvent.setup();

    render(
      <Providers>
        <AuthForm mode="signin" />
      </Providers>,
    );

    await user.type(screen.getByPlaceholderText("you@example.com"), "j@x.com");
    await user.type(screen.getByPlaceholderText("Your password"), "wrong");
    const btn = screen.getByRole("button", { name: /sign in/i });

    for (let i = 0; i < 5; i++) {
      await waitFor(() => expect(btn).not.toBeDisabled());
      await user.click(btn);
    }

    await waitFor(() => {
      expect(screen.getByText(/Locked for 15 minutes/i)).toBeInTheDocument();
    });
    expect(btn).toBeDisabled();
  });
});

describe("Onboarding context contract used by gating", () => {
  it("verify step is required for the gate (regression: don't drop SMS verify)", () => {
    function Probe() {
      const o = useOnboarding();
      return (
        <>
          <div data-testid="onboarded">{String(o.onboarded)}</div>
          <button onClick={() => o.markStep("account")}>a</button>
          <button onClick={() => o.markStep("biometric")}>b</button>
          <button onClick={() => o.markStep("personalize")}>p</button>
        </>
      );
    }

    render(
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>,
    );

    act(() => {
      screen.getByText("a").click();
      screen.getByText("b").click();
      screen.getByText("p").click();
    });

    // Without "verify", user is NOT onboarded.
    expect(screen.getByTestId("onboarded").textContent).toBe("false");
  });
});
