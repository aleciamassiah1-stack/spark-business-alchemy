import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MailCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useGuardedNavigate } from "@/lib/use-guarded-navigate";

export const Route = createFileRoute("/verify-email")({
  head: () => ({
    meta: [
      { title: "Verify Email — Æther Wealth" },
      { name: "description", content: "Confirm your email to activate your vault." },
    ],
  }),
  component: VerifyEmailRoute,
});

function VerifyEmailRoute() {
  const auth = useAuth();
  const navigate = useGuardedNavigate();
  const [resending, setResending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // If somehow they are confirmed, send them home.
  useEffect(() => {
    if (auth.ready && auth.user && auth.emailConfirmed) {
      navigate({ to: "/" });
    }
  }, [auth.ready, auth.user, auth.emailConfirmed, navigate]);

  // Detect confirmation the moment it happens — via auth events (session
  // updates from any tab/device), visibility/focus (user returns to this
  // tab), and a short polling fallback.
  useEffect(() => {
    if (!auth.ready || !auth.user || auth.emailConfirmed) return;
    let cancelled = false;

    const check = async () => {
      try {
        const { data } = await supabase.auth.refreshSession();
        if (cancelled) return;
        if (data.user?.email_confirmed_at) {
          navigate({ to: "/" });
        }
      } catch {
        // ignore transient errors
      }
    };

    // Fast poll so confirmation in another tab/device flips this view quickly.
    const id = window.setInterval(check, 1500);

    // Realtime: Supabase fires USER_UPDATED / TOKEN_REFRESHED when the session
    // reflects the new email_confirmed_at — flip immediately.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email_confirmed_at) {
        navigate({ to: "/" });
      }
    });

    const onFocus = () => void check();
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    void check();

    return () => {
      cancelled = true;
      window.clearInterval(id);
      sub.subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [auth.ready, auth.user, auth.emailConfirmed, navigate]);

  const email = auth.user?.email ?? "";

  const resend = async () => {
    if (!email || resending) return;
    setResending(true);
    setMsg(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setResending(false);
    setMsg(error ? error.message : "Verification email resent. Check your inbox.");
  };

  const signOut = async () => {
    await auth.signOut();
    navigate({ to: "/signup" });
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
      <div className="relative mx-auto flex w-full max-w-[430px] flex-col items-center pt-16 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
          <MailCheck className="h-8 w-8" />
        </div>
        <h1 className="font-serif text-[28px] leading-tight text-foreground">
          Confirm your <span className="text-gradient-violet">email.</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We sent a verification link to{" "}
          <span className="text-foreground">{email || "your inbox"}</span>. You must confirm it
          before accessing your vault.
        </p>

        <button
          onClick={resend}
          disabled={resending || !email}
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Resend verification email
        </button>

        {msg ? <p className="mt-4 text-xs text-muted-foreground">{msg}</p> : null}

        <button
          onClick={signOut}
          className="mt-6 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Use a different account
        </button>

        <p className="mt-10 text-[11px] text-muted-foreground">
          Already confirmed?{" "}
          <Link to="/signin" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
