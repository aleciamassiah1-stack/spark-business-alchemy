import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { AuthForm, Welcome } from "@/components/Onboarding";
import { useAuth } from "@/lib/auth-context";
import { useOnboarding } from "@/lib/onboarding-context";

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
  const search = Route.useSearch();

  useEffect(() => {
    if (auth.user) {
      markStep("account");
      navigate({ to: "/" });
    }
  }, [auth.user, markStep, navigate]);

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
            search={{ view: undefined }}
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
        <Link
          to="/pricing"
          className="mt-4 flex items-center justify-between rounded-2xl border border-primary/25 gradient-hero px-4 py-3.5 transition-all hover:border-primary/50 hover:glow-violet"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary/80">
              Membership
            </p>
            <p className="mt-0.5 text-sm text-foreground">Compare tiers and pricing</p>
          </div>
          <ChevronLeft className="h-4 w-4 rotate-180 text-primary" />
        </Link>
      </div>
    </div>
  );
}
