import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ChevronLeft, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGuardedNavigate } from "@/lib/use-guarded-navigate";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a New Password — Æther Wealth" },
      { name: "description", content: "Choose a new password for your private wealth vault." },
    ],
  }),
  component: ResetPasswordRoute,
});

function ResetPasswordRoute() {
  const navigate = useGuardedNavigate();
  const [ready, setReady] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Real-time validation (matches signup rules)
  const pwLen = password.length >= 12;
  const pwNum = /\d/.test(password);
  const pwSym = /[^A-Za-z0-9]/.test(password);
  const pwUpper = /[A-Z]/.test(password);
  const pwScore = [pwLen, pwNum, pwSym, pwUpper].filter(Boolean).length;
  const pwLabel =
    pwScore <= 1 ? "Weak" : pwScore === 2 ? "Fair" : pwScore === 3 ? "Strong" : "Fortress";
  const pwColor =
    pwScore <= 1
      ? "bg-destructive"
      : pwScore === 2
        ? "bg-warning"
        : pwScore === 3
          ? "bg-success"
          : "bg-gradient-to-r from-primary to-violet-glow";
  const matches = password.length > 0 && password === confirmPw;
  const valid = pwLen && pwNum && pwSym && matches;

  // Supabase processes the recovery hash automatically and emits a session via onAuthStateChange.
  // Wait briefly for it to settle before deciding whether the link was valid.
  useEffect(() => {
    let cancelled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setValidSession(true);
        setReady(true);
      }
    });
    // Also check existing session in case the event already fired before mount.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) setValidSession(true);
      // Give the auth event a brief moment, then mark ready.
      setTimeout(() => {
        if (!cancelled) setReady(true);
      }, 600);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      // Redirect to home after a short pause — they're now signed in with the new password.
      setTimeout(() => navigate({ to: "/" }), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
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
            New Password
          </p>
        </div>

        <h1 className="mb-3 font-serif text-[32px] leading-tight text-foreground">
          Choose a new <span className="text-gradient-violet">password.</span>
        </h1>

        {!ready ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !validSession ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
            <h2 className="mb-2 font-serif text-xl text-foreground">Link expired</h2>
            <p className="text-sm text-muted-foreground">
              This password reset link is invalid or has expired. Reset links are valid for 1 hour.
            </p>
            <Link
              to="/forgot-password"
              className="mt-6 inline-block rounded-xl bg-gradient-to-r from-primary to-violet-glow px-4 py-2.5 text-xs font-semibold text-primary-foreground"
            >
              Request a new link
            </Link>
          </div>
        ) : done ? (
          <div className="rounded-2xl border border-success/30 bg-success/5 p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <h2 className="mb-2 font-serif text-xl text-foreground">Password updated</h2>
            <p className="text-sm text-muted-foreground">Redirecting you to your vault…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Pick something memorable but strong. Minimum 12 characters with a number and symbol.
            </p>

            <div>
              <label className="label-mono">New password</label>
              <div className="relative mt-1.5">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="12+ characters"
                  autoComplete="new-password"
                  autoFocus
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 pr-11 text-sm text-foreground outline-none transition-colors focus:border-primary/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {password && (
                <div className="mt-2.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Strength
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wider ${
                        pwScore >= 3 ? "text-success" : pwScore === 2 ? "text-warning" : "text-destructive"
                      }`}
                    >
                      {pwLabel}
                    </span>
                  </div>
                  <div className="flex h-1 gap-1 overflow-hidden rounded-full">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 transition-all ${i < pwScore ? pwColor : "bg-white/[0.06]"}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="label-mono">Confirm password</label>
              <input
                type={showPw ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                className={`mt-1.5 w-full rounded-xl border bg-white/[0.03] px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50 ${
                  confirmPw && !matches ? "border-destructive/50" : "border-white/[0.08]"
                }`}
              />
              {confirmPw && !matches && (
                <p className="mt-1.5 text-[11px] text-destructive">Passwords don&rsquo;t match</p>
              )}
            </div>

            {error && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!valid || busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-violet-glow px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Updating…
                </>
              ) : (
                "Update password"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
