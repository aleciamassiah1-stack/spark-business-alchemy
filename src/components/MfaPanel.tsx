import { useEffect, useState } from "react";
import { ShieldCheck, Loader2, KeyRound, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { LuxCard } from "@/components/LuxCard";
import { supabase } from "@/integrations/supabase/client";

type Factor = {
  id: string;
  friendly_name: string | null;
  factor_type: string;
  status: "verified" | "unverified";
};

/**
 * MfaPanel — TOTP (authenticator-app) two-factor enrollment UI.
 *
 * Flow:
 *   1. List existing factors via supabase.auth.mfa.listFactors()
 *   2. If none verified, allow enroll → show QR + secret → user scans → enters 6-digit code → verify
 *   3. If verified, allow unenroll
 */
export function MfaPanel() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);

  // Enrollment-in-progress state
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifiedFactor = factors.find((f) => f.status === "verified" && f.factor_type === "totp");

  async function refreshFactors() {
    setLoading(true);
    const { data, error: err } = await supabase.auth.mfa.listFactors();
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setFactors((data?.all ?? []) as Factor[]);
    setLoading(false);
  }

  useEffect(() => {
    refreshFactors();
  }, []);

  async function startEnrollment() {
    setError(null);
    setEnrolling(true);
    try {
      // Clean up any abandoned unverified TOTP factors first (Supabase rejects duplicates).
      const stale = factors.filter((f) => f.status === "unverified" && f.factor_type === "totp");
      for (const f of stale) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      const { data, error: err } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Authenticator (${new Date().toLocaleDateString()})`,
      });
      if (err) throw err;
      if (!data) throw new Error("No enrollment data returned");

      setEnrollFactorId(data.id);
      setQrSvg(data.totp.qr_code);
      setSecret(data.totp.secret);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start enrollment");
    } finally {
      setEnrolling(false);
    }
  }

  async function verifyEnrollment() {
    if (!enrollFactorId || code.replace(/\D/g, "").length !== 6) return;
    setError(null);
    setVerifying(true);
    try {
      const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({
        factorId: enrollFactorId,
      });
      if (chalErr) throw chalErr;

      const { error: verErr } = await supabase.auth.mfa.verify({
        factorId: enrollFactorId,
        challengeId: chal!.id,
        code: code.replace(/\D/g, ""),
      });
      if (verErr) throw verErr;

      toast.success("Two-factor authentication enabled");
      setEnrollFactorId(null);
      setQrSvg(null);
      setSecret(null);
      setCode("");
      await refreshFactors();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code — try again");
    } finally {
      setVerifying(false);
    }
  }

  async function cancelEnrollment() {
    if (enrollFactorId) {
      await supabase.auth.mfa.unenroll({ factorId: enrollFactorId });
    }
    setEnrollFactorId(null);
    setQrSvg(null);
    setSecret(null);
    setCode("");
    setError(null);
    await refreshFactors();
  }

  async function disableMfa() {
    if (!verifiedFactor) return;
    if (!confirm("Disable two-factor authentication? Your account will be less secure.")) return;
    const { error: err } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactor.id });
    if (err) {
      toast.error(err.message);
      return;
    }
    toast.success("Two-factor authentication disabled");
    await refreshFactors();
  }

  return (
    <div>
      <p className="label-mono mb-2 px-1">Two-factor authentication</p>
      <LuxCard className="p-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : enrollFactorId && qrSvg ? (
          // ── Active enrollment ─────────────────────────
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-serif text-lg text-foreground">Scan with your authenticator</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use Google Authenticator, 1Password, Authy, or any TOTP app.
              </p>
            </div>

            <div className="flex justify-center rounded-2xl bg-white p-4">
              <div
                className="h-44 w-44"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
                aria-label="TOTP QR code"
              />
            </div>

            {secret && (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Or enter this key manually
                </p>
                <p className="mt-1 break-all font-mono text-xs text-foreground">{secret}</p>
              </div>
            )}

            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                6-digit code from app
              </label>
              <input
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-center font-mono text-lg tracking-[0.3em] text-foreground outline-none focus:border-primary/60"
              />
            </div>

            {error && (
              <p className="flex items-start gap-1.5 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelEnrollment}
                className="flex-1 rounded-full border border-white/[0.12] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={verifyEnrollment}
                disabled={verifying || code.length !== 6}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 glow-violet"
              >
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & enable"}
              </button>
            </div>
          </div>
        ) : verifiedFactor ? (
          // ── Already enabled ─────────────────────────
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/15">
                <ShieldCheck className="h-4 w-4 text-success" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-lg text-foreground">2FA is enabled</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  You'll be asked for a 6-digit code from your authenticator app at every sign-in.
                </p>
              </div>
              <span className="rounded-full bg-success/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-success">
                Active
              </span>
            </div>
            <button
              type="button"
              onClick={disableMfa}
              className="flex items-center justify-center gap-2 rounded-full border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" /> Disable 2FA
            </button>
          </div>
        ) : (
          // ── Not enrolled ─────────────────────────
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.04]">
                <KeyRound className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-lg text-foreground">
                  Add an extra layer of security
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Protect access to your financial accounts with an authenticator app
                  (Google Authenticator, 1Password, Authy).
                </p>
              </div>
            </div>

            {error && (
              <p className="flex items-start gap-1.5 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={startEnrollment}
              disabled={enrolling}
              className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 glow-violet"
            >
              {enrolling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" /> Enable two-factor authentication
                </>
              )}
            </button>
          </div>
        )}
      </LuxCard>
    </div>
  );
}
