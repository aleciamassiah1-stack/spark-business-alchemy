import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, AlertCircle, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Factor = {
  id: string;
  friendly_name: string | null;
  factor_type: string;
  status: "verified" | "unverified";
};

/**
 * MfaChallenge — full-screen prompt shown after password sign-in
 * when the user has a verified TOTP factor (AAL1 → AAL2 step-up).
 *
 * Renders only when needed; calls onSolved() when the session is upgraded to AAL2.
 */
export function MfaChallenge({ onSolved }: { onSolved: () => void }) {
  const [factor, setFactor] = useState<Factor | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: err } = await supabase.auth.mfa.listFactors();
        if (err) throw err;
        const totp = (data?.totp ?? []).find((f) => f.status === "verified") as Factor | undefined;
        if (!totp) {
          // No factor — nothing to challenge; treat as solved.
          onSolved();
          return;
        }
        if (cancelled) return;
        setFactor(totp);

        const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({
          factorId: totp.id,
        });
        if (chalErr) throw chalErr;
        if (cancelled) return;
        setChallengeId(chal!.id);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not start challenge");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onSolved]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!factor || !challengeId || verifying) return;
    const cleaned = code.replace(/\D/g, "");
    if (cleaned.length !== 6) return;
    setVerifying(true);
    setError(null);
    try {
      const { error: verErr } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId,
        code: cleaned,
      });
      if (verErr) throw verErr;
      onSolved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code");
      setCode("");
    } finally {
      setVerifying(false);
    }
  }

  async function cancel() {
    await supabase.auth.signOut();
    window.location.href = "/signin";
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background px-6 py-10">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, oklch(0.42 0.14 295 / 0.3) 0%, transparent 55%)",
        }}
      />
      <div className="relative w-full max-w-[420px] rounded-3xl border border-white/[0.08] bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-violet glow-violet">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Two-factor authentication
            </p>
            <h1 className="font-serif text-xl text-foreground">Verify it's you</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Preparing challenge…
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app to continue.
            </p>

            <input
              autoFocus
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-4 text-center font-mono text-2xl tracking-[0.4em] text-foreground outline-none focus:border-primary/60"
            />

            {error && (
              <p className="flex items-start gap-1.5 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={verifying || code.length !== 6}
              className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 glow-violet"
            >
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
            </button>

            <button
              type="button"
              onClick={cancel}
              className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3 w-3" /> Cancel and sign out
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
