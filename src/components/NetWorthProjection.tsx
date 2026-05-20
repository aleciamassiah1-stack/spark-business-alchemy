import { useMemo, useState } from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { Sparkles, TrendingUp } from "lucide-react";
import { LuxCard } from "@/components/LuxCard";
import { fmtCurrency, fmtPct } from "@/lib/format";
import { MoneyText } from "@/components/HideToggle";

const HORIZONS = [3, 6, 12, 24, 60] as const;
type Horizon = (typeof HORIZONS)[number];

type Props = {
  currentNetWorth: number;
  /** Suggested monthly contribution, e.g. derived from cashflow. */
  defaultMonthlyContribution?: number;
  /** Annual growth rate as a percent, e.g. 7 for 7%. */
  defaultAnnualRatePct?: number;
};

export function NetWorthProjection({
  currentNetWorth,
  defaultMonthlyContribution = 2500,
  defaultAnnualRatePct = 7,
}: Props) {
  const [months, setMonths] = useState<Horizon>(12);
  const [monthly, setMonthly] = useState<number>(defaultMonthlyContribution);
  const [ratePct, setRatePct] = useState<number>(defaultAnnualRatePct);

  const { series, projected } = useMemo(() => {
    const monthlyRate = ratePct / 100 / 12;
    const out: Array<{ label: string; value: number; contributions: number }> = [];
    let value = currentNetWorth;
    let contributed = currentNetWorth;
    const now = new Date();
    out.push({ label: "Now", value, contributions: contributed });
    for (let i = 1; i <= months; i++) {
      value = value * (1 + monthlyRate) + monthly;
      contributed = contributed + monthly;
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
      out.push({ label, value: Math.round(value), contributions: Math.round(contributed) });
    }
    return { series: out, projected: value };
  }, [currentNetWorth, months, monthly, ratePct]);

  const delta = projected - currentNetWorth;
  const deltaPct = currentNetWorth > 0 ? (delta / currentNetWorth) * 100 : 0;

  return (
    <LuxCard className="overflow-hidden p-5" delay={0.05}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <p className="label-mono">Projection</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-success">
          <TrendingUp className="h-3.5 w-3.5" />
          <span className="font-mono text-xs">{fmtPct(deltaPct)}</span>
        </div>
      </div>

      <div className="mt-3">
        <p className="font-serif text-3xl text-foreground">
          <MoneyText value={fmtCurrency(projected, { compact: true })} />
        </p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          Projected in {months} months · +
          <MoneyText value={fmtCurrency(Math.max(0, delta), { compact: true })} fallback="••••" />
        </p>
      </div>

      <div className="-mx-2 mt-4 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.78 0.16 295)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="oklch(0.78 0.16 295)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="contribGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.82 0.12 85)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="oklch(0.82 0.12 85)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="oklch(1 0 0 / 0.04)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "oklch(0.66 0.03 280)", fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: "oklch(0.66 0.03 280)", fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (Math.abs(v) >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${Math.round(v / 1000)}K`)}
              width={46}
            />
            <Tooltip
              contentStyle={{
                background: "oklch(0.20 0.025 280)",
                border: "1px solid oklch(1 0 0 / 0.08)",
                borderRadius: 12,
                fontFamily: "JetBrains Mono",
                fontSize: 11,
              }}
              labelStyle={{ color: "oklch(0.66 0.03 280)" }}
              itemStyle={{ color: "oklch(0.96 0.01 280)" }}
              formatter={(v, name) => [fmtCurrency(Number(v), { compact: true }), name === "value" ? "Projected" : "Contributions"] as [string, string]}
            />
            <ReferenceLine y={currentNetWorth} stroke="oklch(1 0 0 / 0.15)" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="contributions"
              stroke="oklch(0.82 0.12 85)"
              strokeWidth={1.25}
              strokeDasharray="3 3"
              fill="url(#contribGrad)"
              isAnimationActive
              animationDuration={700}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="oklch(0.78 0.16 295)"
              strokeWidth={2}
              fill="url(#projGrad)"
              isAnimationActive
              animationDuration={900}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Horizon chips */}
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {HORIZONS.map((m) => (
          <button
            key={m}
            onClick={() => setMonths(m)}
            className={`rounded-full px-3 py-1 font-mono text-[11px] transition-all ${
              months === m
                ? "gradient-violet text-foreground glow-violet"
                : "border border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:text-foreground"
            }`}
          >
            {m < 12 ? `${m}M` : `${m / 12}Y`}
          </button>
        ))}
      </div>

      {/* Assumptions */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <AssumptionInput
          label="Monthly add"
          prefix="$"
          value={monthly}
          step={250}
          min={0}
          max={250_000}
          onChange={setMonthly}
        />
        <AssumptionInput
          label="Annual return"
          suffix="%"
          value={ratePct}
          step={0.5}
          min={-10}
          max={30}
          onChange={setRatePct}
          decimals={1}
        />
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        Compounded monthly. Assumes steady contributions and constant return — for illustration, not advice.
      </p>
    </LuxCard>
  );
}

function AssumptionInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step,
  min,
  max,
  decimals = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step: number;
  min: number;
  max: number;
  decimals?: number;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <p className="label-mono text-[9px]">{label}</p>
      <div className="mt-1 flex items-center gap-1.5">
        {prefix && <span className="font-mono text-xs text-muted-foreground">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Number(n.toFixed(decimals)))));
          }}
          className="w-full bg-transparent font-mono text-base text-foreground outline-none focus:text-primary"
        />
        {suffix && <span className="font-mono text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
