import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ChevronLeft, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Æther Wealth" },
      { name: "description", content: "Reset the password protecting your private wealth vault." },
    ],
  }),
  component: ForgotPasswordRoute,
});

function ForgotPasswordRoute() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailValid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw err;
      // Always show success regardless of whether the email exists — prevents enumeration.
      setSent(true);
    } catch (err) {
      // Still show success on most errors to prevent enumeration; only surface true network failures.
      const msg = err instanceof Error ? err.message : "";
      if (/network|fetch/i.test(msg)) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setSent(true);
      }
    } finally {
      setBusy(false);
    }
  };

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
            to="/signin"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Recovery
          </p>
        </div>

        <h1 className="mb-3 font-serif text-[32px] leading-tight text-foreground">
          Reset your <span className="text-gradient-violet">password.</span>
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Enter the email associated with your vault and we&rsquo;ll send you a secure link to choose a new password.
        </p>

        {sent ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <h2 className="mb-2 font-serif text-xl text-foreground">Check your inbox</h2>
            <p className="text-sm text-muted-foreground">
              If an account exists for <span className="text-foreground">{email}</span>, you&rsquo;ll receive a reset link shortly. The link expires in 1 hour.
            </p>
            <Link
              to="/signin"
              className="mt-6 inline-block text-xs text-primary hover:underline"
            >
              Return to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
            <div>
              <label className="label-mono">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!emailValid || busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-violet-glow px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                </>
              ) : (
                "Send reset link"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
