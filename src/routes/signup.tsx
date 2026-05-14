import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { AuthForm, Welcome } from "@/components/Onboarding";
import { useAuth } from "@/lib/auth-context";
import { useOnboarding } from "@/lib/onboarding-context";
import { useGuardedNavigate } from "@/lib/use-guarded-navigate";
import { isIosNative } from "@/lib/native";

type SignupSearch = { view?: "form" };

export const Route = createFileRoute("/signup")({
  validateSearch: (search): SignupSearch => ({
    view: search.view === "form" ? "form" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Create Account — Æther Wealth" },
      { name: "description", content: "Open your private wealth vault in under a minute." },
    ],
  }),
  component: SignupRoute,
});

function SignupRoute() {
  const auth = useAuth();
  const { markStep } = useOnboarding();
  const navigate = useNavigate();
  const guardedNavigate = useGuardedNavigate();
  const search = Route.useSearch();

  useEffect(() => {
    if (!auth.user) return;
    if (!auth.emailConfirmed) {
      guardedNavigate({ to: "/verify-email" });
      return;
    }
    markStep("account");
    guardedNavigate({ to: "/" });
  }, [auth.user, auth.emailConfirmed, markStep, guardedNavigate]);

  if (isIosNative()) {
    return (
      <div className="relative min-h-[100dvh] bg-background px-6 py-10">
        <div className="relative mx-auto flex w-full max-w-[430px] flex-col items-center text-center">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Create Account
          </p>
          <h1 className="mb-6 font-serif text-[28px] leading-tight text-foreground">
            Accounts are created on the web.
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
            To create an account visit aetherwealth.co
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/signin" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (search.view !== "form") {
    return (
      <Welcome
        onCreate={() => navigate({ to: "/signup", search: { view: "form" } })}
        onSignIn={() => navigate({ to: "/signin" })}
      />
    );
  }

  return (
    <div className="relative min-h-[100dvh] bg-background px-6 py-10">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, oklch(0.42 0.14 295 / 0.3) 0%, transparent 55%)",
        }}
      />
      <div className="relative mx-auto w-full max-w-[430px]">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/signup"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Create Account
          </p>
        </div>
        <h1 className="mb-6 font-serif text-[32px] leading-tight text-foreground">
          Open your <span className="text-gradient-violet">private vault.</span>
        </h1>
        <AuthForm mode="signup" />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link to="/signin" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
