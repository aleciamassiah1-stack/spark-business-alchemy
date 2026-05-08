// Pre-Link disclosure dialog shown the first time a user connects an institution.
// Satisfies Plaid's MSA requirement that we obtain affirmative end-user consent
// before invoking Plaid Link, naming Plaid and disclosing what data is accessed.
import { Link } from "@tanstack/react-router";
import { ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { recordConsent } from "@/lib/consent.functions";
import { CONSENT_VERSIONS, markLocalConsent } from "@/lib/consent-versions";

export function PlaidConsentDialog({
  open,
  onAccept,
  onCancel,
}: {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const handleAccept = async () => {
    setBusy(true);
    try {
      await recordConsent({
        data: {
          kind: "plaid_disclosure",
          version: CONSENT_VERSIONS.plaid_disclosure,
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : undefined,
        },
      });
      markLocalConsent("plaid_disclosure");
    } catch (err) {
      // Recording is best-effort. We still mark locally so the user isn't blocked
      // by a transient failure; the dialog has already been shown.
      console.warn("Failed to record Plaid consent:", err);
      markLocalConsent("plaid_disclosure");
    } finally {
      setBusy(false);
      onAccept();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="plaid-consent-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
    >
      <div className="relative w-full max-w-md rounded-t-3xl border border-white/[0.08] bg-card p-6 shadow-2xl sm:rounded-3xl">
        <button
          type="button"
          aria-label="Close"
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Before you connect
          </p>
        </div>

        <h2 id="plaid-consent-title" className="font-serif text-2xl text-foreground">
          Connecting via Plaid
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-foreground/85">
          Æther Wealth uses{" "}
          <a
            href="https://plaid.com/legal/#end-user-privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline decoration-dotted underline-offset-2 hover:text-primary"
          >
            Plaid
          </a>{" "}
          to securely link your financial accounts. After you authenticate with your bank,
          Plaid shares the following with us:
        </p>

        <ul className="mt-3 space-y-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-foreground/85">
          <li>• Account name, type, balances, and last-four mask</li>
          <li>• Transactions (date, amount, merchant, category)</li>
          <li>• Investment holdings and securities</li>
          <li>• Loan and liability terms (rates, balances, payments)</li>
          <li>• Account/routing numbers when needed for a feature you initiate</li>
        </ul>

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          We use this data only to power your dashboard, AI summaries, and the features
          you use. We don't sell your data and we don't use it to train third-party AI
          models. You can disconnect any institution at any time — we'll then revoke
          Plaid's access and purge the related data within 30 days. See our{" "}
          <Link to="/privacy" className="underline decoration-dotted hover:text-foreground">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/terms" className="underline decoration-dotted hover:text-foreground">
            Terms
          </Link>
          .
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={handleAccept}
            disabled={busy}
            className="flex-1 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Continuing…" : "Agree & continue to Plaid"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-medium text-foreground hover:bg-white/[0.06] disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
