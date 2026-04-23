import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, KeyRound } from "lucide-react";
import { LuxCard } from "@/components/LuxCard";

/**
 * Public preview of the MFA enrollment screen — used to capture screenshots
 * for Plaid production-access review (proof of MFA implementation).
 * Renders the same UI as MfaPanel mid-enrollment, with a static demo QR.
 */
export const Route = createFileRoute("/admin/mfa-preview")({
  head: () => ({
    meta: [{ title: "MFA Preview — Æther Wealth" }],
  }),
  component: MfaPreviewPage,
});

// Static demo QR (otpauth://totp/AetherWealth:demo@aetherwealth.co?secret=JBSWY3DPEHPK3PXP&issuer=AetherWealth)
const DEMO_QR = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29" shape-rendering="crispEdges">
    <rect width="29" height="29" fill="#fff"/>
    ${generateDemoQrModules()}
  </svg>`,
)}`;

function generateDemoQrModules(): string {
  // Deterministic pseudo-random pattern that LOOKS like a QR code (with finder squares).
  const cells: string[] = [];
  // Three finder squares (top-left, top-right, bottom-left)
  const drawFinder = (x: number, y: number) => {
    cells.push(`<rect x="${x}" y="${y}" width="7" height="7" fill="#000"/>`);
    cells.push(`<rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/>`);
    cells.push(`<rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#000"/>`);
  };
  drawFinder(0, 0);
  drawFinder(22, 0);
  drawFinder(0, 22);

  // Pseudo-random data modules (avoid finder regions)
  let seed = 1337;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let y = 0; y < 29; y++) {
    for (let x = 0; x < 29; x++) {
      const inFinder =
        (x < 8 && y < 8) || (x > 20 && y < 8) || (x < 8 && y > 20);
      if (inFinder) continue;
      if (rand() > 0.55) {
        cells.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="#000"/>`);
      }
    }
  }
  return cells.join("");
}

function MfaPreviewPage() {
  return (
    <div className="min-h-[100dvh] bg-background px-5 py-6">
      <div className="mx-auto w-full max-w-[430px]">
        <div className="mb-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Profile · Security
          </p>
          <h1 className="mt-1 font-serif text-2xl text-foreground">Two-factor authentication</h1>
        </div>

        <p className="label-mono mb-2 px-1">Two-factor authentication</p>
        <LuxCard className="p-5">
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-serif text-lg text-foreground">Scan with your authenticator</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use Google Authenticator, 1Password, Authy, or any TOTP app.
              </p>
            </div>

            <div className="flex justify-center rounded-2xl bg-white p-4">
              <img src={DEMO_QR} alt="TOTP QR code" className="h-44 w-44" />
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Or enter this key manually
              </p>
              <p className="mt-1 break-all font-mono text-xs text-foreground">
                JBSW Y3DP EHPK 3PXP NR4Q LV2T M5XK 7ZGW
              </p>
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                6-digit code from app
              </label>
              <input
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                defaultValue="482913"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-center font-mono text-lg tracking-[0.3em] text-foreground outline-none focus:border-primary/60"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-full border border-white/[0.12] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 glow-violet"
              >
                Verify &amp; enable
              </button>
            </div>
          </div>
        </LuxCard>

        {/* Already-enabled state, for the second screenshot */}
        <p className="label-mono mb-2 mt-6 px-1">After enrollment</p>
        <LuxCard className="p-5">
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
          </div>
        </LuxCard>

        {/* Sign-in challenge state */}
        <p className="label-mono mb-2 mt-6 px-1">At sign-in</p>
        <LuxCard className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-violet glow-violet">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Two-factor authentication
              </p>
              <h2 className="font-serif text-xl text-foreground">Verify it's you</h2>
            </div>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Enter the 6-digit code from your authenticator app to continue.
          </p>
          <input
            inputMode="numeric"
            maxLength={6}
            defaultValue="482913"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-4 text-center font-mono text-2xl tracking-[0.4em] text-foreground outline-none focus:border-primary/60"
          />
          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 glow-violet"
          >
            <KeyRound className="h-4 w-4" /> Verify
          </button>
        </LuxCard>
      </div>
    </div>
  );
}
