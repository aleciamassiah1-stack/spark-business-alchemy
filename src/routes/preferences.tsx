import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Globe, DollarSign, Moon, Eye, RefreshCw, Clock } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { Switch } from "@/components/ui/switch";
import {
  loadAutoRefreshPrefs,
  saveAutoRefreshPrefs,
  getLastSyncAt,
  formatRelativeAge,
} from "@/lib/auto-refresh";

export const Route = createFileRoute("/preferences")({
  head: () => ({
    meta: [
      { title: "Preferences — Æther Wealth" },
      { name: "description", content: "Personalize your private office." },
    ],
  }),
  component: () => (
    <RequireOnboarding>
      <PreferencesPage />
    </RequireOnboarding>
  ),
});

const HOUR_OPTIONS = [1, 3, 6, 12, 24, 48, 168];

function PreferencesPage() {
  const [currency, setCurrency] = useState("USD");
  const [locale, setLocale] = useState("en-US");
  const [hideBalances, setHideBalances] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const [autoRefresh, setAutoRefresh] = useState(() => loadAutoRefreshPrefs());
  const [lastSync, setLastSync] = useState<Date | null>(() => getLastSyncAt());

  useEffect(() => {
    const id = setInterval(() => setLastSync(getLastSyncAt()), 30_000);
    return () => clearInterval(id);
  }, []);

  const updateAutoRefresh = (patch: Partial<typeof autoRefresh>) => {
    const next = { ...autoRefresh, ...patch };
    setAutoRefresh(next);
    saveAutoRefreshPrefs(next);
  };

  return (
    <MobileShell title="Preferences" subtitle="Personalize your office">
      <div className="flex flex-col gap-4 px-5 pb-6">
        <div>
          <p className="label-mono mb-2 px-1">Display</p>
          <LuxCard className="divide-y divide-white/[0.04]">
            <SelectRow
              icon={DollarSign}
              label="Reporting currency"
              value={currency}
              onChange={setCurrency}
              options={["USD", "EUR", "GBP", "CHF", "AED", "SGD"]}
            />
            <SelectRow
              icon={Globe}
              label="Region & language"
              value={locale}
              onChange={setLocale}
              options={["en-US", "en-GB", "fr-FR", "de-DE", "ar-AE"]}
            />
          </LuxCard>
        </div>

        <div>
          <p className="label-mono mb-2 px-1">Sync</p>
          <LuxCard className="divide-y divide-white/[0.04]">
            <ToggleRow
              icon={RefreshCw}
              label="Auto-refresh on app open"
              desc={
                lastSync
                  ? `Last sync ${formatRelativeAge(lastSync)}`
                  : "No sync yet — first open will refresh"
              }
              checked={autoRefresh.enabled}
              onCheckedChange={(v) => updateAutoRefresh({ enabled: v })}
            />
            <div
              className={`flex items-start gap-3 px-4 py-3.5 transition-opacity ${
                autoRefresh.enabled ? "opacity-100" : "pointer-events-none opacity-40"
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.04]">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-foreground">Refresh threshold</p>
                  <span className="font-mono text-xs tabular-nums text-foreground">
                    {formatHours(autoRefresh.thresholdHours)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Auto-refresh only if data is older than this
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {HOUR_OPTIONS.map((h) => {
                    const active = autoRefresh.thresholdHours === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => updateAutoRefresh({ thresholdHours: h })}
                        className={`rounded-full border px-2.5 py-1 font-mono text-[11px] tabular-nums transition ${
                          active
                            ? "border-primary/60 bg-primary/15 text-primary"
                            : "border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {formatHours(h)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </LuxCard>
        </div>

        <div>
          <p className="label-mono mb-2 px-1">Privacy & motion</p>
          <LuxCard className="divide-y divide-white/[0.04]">
            <ToggleRow
              icon={Eye}
              label="Hide balances by default"
              desc="Tap eye icon to reveal"
              checked={hideBalances}
              onCheckedChange={setHideBalances}
            />
            <ToggleRow
              icon={Moon}
              label="Reduce motion"
              desc="Minimize animations"
              checked={reduceMotion}
              onCheckedChange={setReduceMotion}
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

function formatHours(h: number) {
  if (h < 24) return `${h}h`;
  if (h % 24 === 0) {
    const d = h / 24;
    return d === 7 ? "1 week" : `${d}d`;
  }
  return `${h}h`;
}

function SelectRow({
  icon: Icon,
  label,
  value,
  onChange,
  options,
}: {
  icon: typeof Globe;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.04]">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="min-w-0 flex-1 text-sm text-foreground">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-background">
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  desc,
  checked,
  onCheckedChange,
}: {
  icon: typeof Globe;
  label: string;
  desc: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.04]">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
