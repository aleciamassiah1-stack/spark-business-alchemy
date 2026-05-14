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

// vi.mock is hoisted to top, so we use vi.hoisted to safely create the mock
// before any imports of @/integrations/supabase/client are resolved.
const { supabase, helpers } = vi.hoisted(() => {
  // Inline the factory body since vi.hoisted runs before module imports.
  const listeners: Array<(event: string, session: unknown) => void> = [];
  let session: unknown = null;

  const fakeUser = (email: string, fullName: string, phone: string) => ({
    id: "user-test-id",
    aud: "authenticated",
    email,
    app_metadata: {},
    user_metadata: { full_name: fullName, phone },
    created_at: new Date().toISOString(),
  });

  const fakeSession = (user: unknown) => ({
    access_token: "fake.jwt",
    refresh_token: "fake.refresh",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user,
  });

  const setSession = (next: unknown) => {
    session = next;
    listeners.forEach((l) => l(next ? "SIGNED_IN" : "SIGNED_OUT", next));
  };

  const auth = {
    onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
      listeners.push(cb);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const idx = listeners.indexOf(cb);
              if (idx >= 0) listeners.splice(idx, 1);
            },
          },
        },
      };
    }),
    getSession: vi.fn(async () => ({ data: { session } })),
    signUp: vi.fn(
      async ({
        email,
        options,
      }: {
        email: string;
        password: string;
        options?: { data?: { full_name?: string; phone?: string } };
      }) => {
        const user = fakeUser(
          email,
          options?.data?.full_name ?? "",
          options?.data?.phone ?? "",
        );
        const s = fakeSession(user);
        setSession(s);
        return { data: { user, session: s }, error: null };
      },
    ),
    signInWithPassword: vi.fn(
      async ({ password }: { email: string; password: string }) => {
        if (password.startsWith("wrong")) {
          return {
            data: { user: null, session: null },
            error: { message: "Invalid credentials" },
          };
        }
        const user = fakeUser("returning@x.com", "Returning User", "+15555550100");
        const s = fakeSession(user);
        setSession(s);
        return { data: { user, session: s }, error: null };
      },
    ),
    signOut: vi.fn(async () => {
      setSession(null);
      return { error: null };
    }),
  };

  return {
    supabase: { auth },
    helpers: {
      setSession,
      currentSession: () => session,
      reset: () => {
        listeners.length = 0;
        session = null;
      },
    },
  };
});

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
    useLocation: () => ({ pathname: "/", search: "", hash: "", href: "/", searchStr: "" }),
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
    await user.type(screen.getByPlaceholderText("Your password"), "wrongpassword");
    const btn = screen.getByRole("button", { name: /sign in/i });

    // First 4 attempts → "N attempts remaining" message
    for (let i = 1; i <= 4; i++) {
      await waitFor(() => expect(btn).not.toBeDisabled());
      await user.click(btn);
      await waitFor(() => {
        expect(screen.getByText(new RegExp(`${5 - i} attempts? remaining`, "i"))).toBeInTheDocument();
      });
    }

    // 5th attempt → lockout
    await waitFor(() => expect(btn).not.toBeDisabled());
    await user.click(btn);
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
