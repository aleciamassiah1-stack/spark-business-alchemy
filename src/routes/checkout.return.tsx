import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (s: Record<string, unknown>) => ({
    session_id: typeof s.session_id === "string" ? s.session_id : "",
  }),
  head: () => ({
    meta: [
      { title: "Payment complete — Æther Wealth" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutReturnPage,
});

function CheckoutReturnPage() {
  const { session_id } = useSearch({ from: "/checkout/return" });
  const navigate = useNavigate();

  // Auto-redirect to profile after a short confirmation moment.
  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/profile" }), 1800);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <MobileShell title="Payment" subtitle="Confirmation">
      <div className="px-5 pt-6">
        <LuxCard className="p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-serif text-2xl text-foreground">Payment received</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Thank you. Taking you to your profile…
          </p>
          {session_id && (
            <p className="mt-4 break-all font-mono text-[10px] text-muted-foreground/70">
              Ref: {session_id}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-2">
            <Link
              to="/profile"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Go to my profile
            </Link>
            <Link
              to="/"
              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-white/[0.06]"
            >
              Dashboard
            </Link>
          </div>
        </LuxCard>
      </div>
    </MobileShell>
  );
}
