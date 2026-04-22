import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Globe, DollarSign, Moon, Eye } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { Switch } from "@/components/ui/switch";

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

function PreferencesPage() {
  const [currency, setCurrency] = useState("USD");
  const [locale, setLocale] = useState("en-US");
  const [hideBalances, setHideBalances] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

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
