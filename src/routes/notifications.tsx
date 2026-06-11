import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Mail, Smartphone, Lock, ShieldCheck } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Æther Wealth" },
      { name: "description", content: "Choose how Æther Wealth reaches you." },
    ],
  }),
  component: () => (
    <RequireOnboarding>
      <NotificationsPage />
    </RequireOnboarding>
  ),
});

type Channel = "push" | "email";

function NotificationsPage() {
  const [channel, setChannel] = useState<Channel>("push");
  const [bigMoves, setBigMoves] = useState(true);
  const [renewals, setRenewals] = useState(true);
  const [estate, setEstate] = useState(true);
  const [weekly, setWeekly] = useState(false);

  return (
    <MobileShell title="Notifications" subtitle="Push or encrypted email">
      <div className="flex flex-col gap-4 px-5 pb-6">
        <div>
          <p className="label-mono mb-2 px-1">Delivery channel</p>
          <LuxCard className="divide-y divide-white/[0.04]">
            <ChannelRow
              icon={Smartphone}
              label="Push notifications"
              desc="Silent, on-device alerts"
              active={channel === "push"}
              onSelect={() => setChannel("push")}
            />
            <ChannelRow
              icon={Lock}
              label="Encrypted email"
              desc="End-to-end encrypted, sent to your inbox"
              active={channel === "email"}
              onSelect={() => setChannel("email")}
              badge="E2EE"
            />
          </LuxCard>
          <div className="mt-2 flex items-start gap-2 rounded-lg bg-white/[0.03] px-3 py-2.5">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Email alerts are encrypted with your account key. Only you can decrypt them — Æther Wealth
              cannot read their contents.
            </p>
          </div>
        </div>

        <div>
          <p className="label-mono mb-2 px-1">Alert types</p>
          <LuxCard className="divide-y divide-white/[0.04]">
            <ToggleRow
              label="Significant portfolio moves"
              desc="±2% intraday or larger"
              checked={bigMoves}
              onCheckedChange={setBigMoves}
            />
            <ToggleRow
              label="Policy renewals & lapses"
              desc="30 days before renewal"
              checked={renewals}
              onCheckedChange={setRenewals}
            />
            <ToggleRow
              label="Estate document reviews"
              desc="When a document needs attention"
              checked={estate}
              onCheckedChange={setEstate}
            />
            <ToggleRow
              label="Weekly wealth digest"
              desc="Sundays at 8:00am local"
              checked={weekly}
              onCheckedChange={setWeekly}
            />
          </LuxCard>
        </div>

        <p className="px-1 text-center text-[11px] italic text-muted-foreground">
          Preferences save automatically.
        </p>
      </div>
    </MobileShell>
  );
}

function ChannelRow({
  icon: Icon,
  label,
  desc,
  active,
  onSelect,
  badge,
}: {
  icon: typeof Bell;
  label: string;
  desc: string;
  active: boolean;
  onSelect: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.02]"
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          active ? "gradient-violet glow-violet" : "bg-white/[0.04]"
        }`}
      >
        <Icon className={`h-4 w-4 ${active ? "text-foreground" : "text-primary"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm text-foreground">{label}</p>
          {badge && (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-primary">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <div
        className={`h-4 w-4 shrink-0 rounded-full border ${
          active ? "border-primary bg-primary" : "border-white/20"
        }`}
      />
    </button>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onCheckedChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
