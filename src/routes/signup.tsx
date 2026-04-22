import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChevronLeft, Check, Star, ArrowRight } from "lucide-react";
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

        {/* Tier preview — front and center */}
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Choose your tier
            </p>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              Compare all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            <TierPreview
              name="Essential"
              price="$1,490"
              cadence="/yr"
              description="For individuals and independent advisors"
              highlights={["Up to 3 connected accounts", "Net worth dashboard", "Estate vault — 5 docs"]}
              variant="essential"
            />
            <TierPreview
              name="Private"
              price="$3,990"
              cadence="/yr"
              description="For high net worth individuals and advisory practices"
              highlights={["Unlimited accounts", "Trust & estate suite", "AI insurance parser"]}
              variant="private"
              badge="Most Popular"
            />
            <TierPreview
              name="Family Office"
              price="$14,990"
              cadence="/yr"
              description="For UHNW families, private banks and enterprise firms"
              highlights={["Unlimited members", "Full white label", "Dedicated account manager"]}
              variant="family"
            />
          </div>

          <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Billed annually · Save up to 2 months
          </p>
        </div>
      </div>
    </div>
  );
}

function TierPreview({
  name,
  price,
  cadence,
  description,
  highlights,
  variant,
  badge,
}: {
  name: string;
  price: string;
  cadence: string;
  description: string;
  highlights: string[];
  variant: "essential" | "private" | "family";
  badge?: string;
}) {
  const styles = {
    essential: {
      border: "border-white/[0.08]",
      bg: "gradient-card",
      glow: "",
      label: "text-muted-foreground",
      price: "text-foreground",
      check: "text-muted-foreground",
    },
    private: {
      border: "border-primary/40",
      bg: "gradient-hero",
      glow: "shadow-[0_0_40px_-12px_oklch(0.68_0.13_295/0.5)]",
      label: "text-primary",
      price: "text-gradient-violet",
      check: "text-primary",
    },
    family: {
      border: "border-gold/40",
      bg: "gradient-card",
      glow: "shadow-[0_0_36px_-14px_oklch(0.82_0.12_85/0.35)]",
      label: "text-gold",
      price: "text-gradient-gold",
      check: "text-gold",
    },
  }[variant];

  return (
    <Link
      to="/pricing"
      className={`relative block overflow-hidden rounded-2xl border ${styles.border} ${styles.bg} ${styles.glow} px-4 py-4 transition-all hover:scale-[1.01]`}
    >
      {badge && (
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-gold">
          <Star className="h-2.5 w-2.5 fill-gold" strokeWidth={0} />
          {badge}
        </div>
      )}
      <div className="flex items-baseline justify-between">
        <p className={`font-mono text-[10px] uppercase tracking-[0.22em] ${styles.label}`}>
          {name}
        </p>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={`font-serif text-[28px] leading-none ${styles.price}`}>{price}</span>
        <span className="font-mono text-[10px] text-muted-foreground">{cadence}</span>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{description}</p>
      <ul className="mt-3 space-y-1.5">
        {highlights.map((h) => (
          <li key={h} className="flex items-center gap-2">
            <Check className={`h-3 w-3 shrink-0 ${styles.check}`} strokeWidth={2.4} />
            <span className="text-[12px] text-foreground/85">{h}</span>
          </li>
        ))}
      </ul>
    </Link>
  );
}
