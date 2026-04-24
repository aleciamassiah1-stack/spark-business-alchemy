import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as React from "react";
import { render } from "@react-email/render";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { TEMPLATES } from "@/lib/email-templates/registry";
import { SignupEmail } from "@/lib/email-templates/signup";
import { RecoveryEmail } from "@/lib/email-templates/recovery";
import { MagicLinkEmail } from "@/lib/email-templates/magic-link";
import { InviteEmail } from "@/lib/email-templates/invite";
import { EmailChangeEmail } from "@/lib/email-templates/email-change";
import { ReauthenticationEmail } from "@/lib/email-templates/reauthentication";

export const Route = createFileRoute("/admin/email-preview")({
  head: () => ({
    meta: [
      { title: "Email preview — Æther Wealth admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: EmailPreviewPage,
});

type Entry = {
  component: React.ComponentType<any>;
  subject: string | ((data: Record<string, any>) => string);
  displayName: string;
  previewData: Record<string, any>;
};

const SITE = { siteName: "Æther Wealth", siteUrl: "https://aetherwealth.co" };

// Combine registered transactional templates with the auth templates
// (which are invoked by the auth-email-hook, not the registry).
const ALL_TEMPLATES: Record<string, Entry> = {
  ...Object.fromEntries(
    Object.entries(TEMPLATES).map(([name, e]) => [
      name,
      {
        component: e.component,
        subject: e.subject,
        displayName: e.displayName ?? name,
        previewData: e.previewData ?? {},
      },
    ]),
  ),
  "auth:signup": {
    component: SignupEmail,
    subject: "Confirm your Æther Wealth vault",
    displayName: "Auth · Signup confirmation",
    previewData: {
      ...SITE,
      recipient: "jane@example.com",
      confirmationUrl: "https://aetherwealth.co/verify?token=preview",
    },
  },
  "auth:recovery": {
    component: RecoveryEmail,
    subject: "Reset your Æther Wealth password",
    displayName: "Auth · Password recovery",
    previewData: {
      ...SITE,
      confirmationUrl: "https://aetherwealth.co/reset-password?token=preview",
    },
  },
  "auth:magic-link": {
    component: MagicLinkEmail,
    subject: "Your Æther Wealth login link",
    displayName: "Auth · Magic link",
    previewData: {
      ...SITE,
      confirmationUrl: "https://aetherwealth.co/signin?token=preview",
    },
  },
  "auth:invite": {
    component: InviteEmail,
    subject: "You've been invited to Æther Wealth",
    displayName: "Auth · Invite",
    previewData: {
      ...SITE,
      confirmationUrl: "https://aetherwealth.co/accept?token=preview",
    },
  },
  "auth:email-change": {
    component: EmailChangeEmail,
    subject: "Confirm your email change",
    displayName: "Auth · Email change",
    previewData: {
      ...SITE,
      email: "old@example.com",
      newEmail: "new@example.com",
      confirmationUrl: "https://aetherwealth.co/verify?token=preview",
    },
  },
  "auth:reauthentication": {
    component: ReauthenticationEmail,
    subject: "Your Æther Wealth verification code",
    displayName: "Auth · Reauthentication code",
    previewData: { token: "428193" },
  },
};

function EmailPreviewPage() {
  const names = Object.keys(ALL_TEMPLATES);
  const [selected, setSelected] = useState<string>(names[0]);
  const [dataText, setDataText] = useState<string>(() =>
    JSON.stringify(ALL_TEMPLATES[names[0]].previewData, null, 2),
  );
  const [html, setHtml] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const entry = ALL_TEMPLATES[selected];

  useEffect(() => {
    setDataText(JSON.stringify(entry.previewData, null, 2));
  }, [selected, entry]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = dataText.trim() ? JSON.parse(dataText) : {};
        const out = await render(React.createElement(entry.component, data));
        if (!cancelled) {
          setHtml(out);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entry, dataText]);

  const subject = useMemo(() => {
    try {
      const data = dataText.trim() ? JSON.parse(dataText) : {};
      return typeof entry.subject === "function"
        ? entry.subject(data)
        : entry.subject;
    } catch {
      return typeof entry.subject === "string" ? entry.subject : "";
    }
  }, [entry, dataText]);

  return (
    <MobileShell title="Email preview" subtitle="Render any template locally">
      <div className="flex flex-col gap-4 px-5 pb-6">
        <LuxCard className="p-4">
          <label className="label-mono mb-1.5 block text-muted-foreground">
            Template
          </label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-foreground focus:border-primary/40 focus:outline-none"
          >
            {names.map((n) => (
              <option key={n} value={n}>
                {ALL_TEMPLATES[n].displayName}
              </option>
            ))}
          </select>

          <div className="mt-3">
            <p className="label-mono text-muted-foreground">Subject</p>
            <p className="mt-1 text-sm text-foreground">{subject}</p>
          </div>
        </LuxCard>

        <LuxCard className="p-4">
          <label className="label-mono mb-1.5 block text-muted-foreground">
            Template data (JSON)
          </label>
          <textarea
            value={dataText}
            onChange={(e) => setDataText(e.target.value)}
            spellCheck={false}
            rows={10}
            className="w-full resize-y rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[12px] text-foreground focus:border-primary/40 focus:outline-none"
          />
          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
        </LuxCard>

        <LuxCard className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
            <p className="label-mono text-muted-foreground">Rendered HTML</p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(html);
              }}
              className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-foreground hover:bg-white/[0.04]"
            >
              Copy HTML
            </button>
          </div>
          <iframe
            title="Email preview"
            srcDoc={html}
            className="h-[640px] w-full bg-white"
          />
        </LuxCard>
      </div>
    </MobileShell>
  );
}
