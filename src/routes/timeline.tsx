import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { NetWorthProjection } from "@/components/NetWorthProjection";
import { timelines } from "@/lib/mock-data";
import { fmtCurrency, fmtPct } from "@/lib/format";
import { useIsTestAccount } from "@/lib/test-account";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { getAggregatedData } from "@/lib/plaid.functions";
import { listProperties } from "@/lib/wealth.functions";

export const Route = createFileRoute("/timeline")({
  head: () => ({
    meta: [
      { title: "Net Worth Timeline — Æther Wealth" },
      { name: "description", content: "Wealth growth over time, by category." },
    ],
  }),
  component: () => (
    <RequireOnboarding>
      <TimelinePage />
    </RequireOnboarding>
  ),
});

const RANGES = ["1M", "6M", "1Y", "All"] as const;
type Range = (typeof RANGES)[number];

function TimelinePage() {
  const [range, setRange] = useState<Range>("1Y");
  const isTestAccount = useIsTestAccount();
  const [liveNetWorth, setLiveNetWorth] = useState<number | null>(null);

  useEffect(() => {
    if (isTestAccount) return;
    let alive = true;
    (async () => {
      try {
        const [agg, props] = await Promise.all([getAggregatedData(), listProperties()]);
        if (!alive) return;
        const accounts = (agg.accounts ?? []) as Array<{ type: string; current_balance: number | null }>;
        const investments = accounts.filter((a) => a.type === "investment").reduce((s, a) => s + (a.current_balance ?? 0), 0);
        const banking = accounts.filter((a) => a.type === "depository").reduce((s, a) => s + (a.current_balance ?? 0), 0);
        const credit = accounts.filter((a) => a.type === "credit" || a.type === "loan").reduce((s, a) => s + (a.current_balance ?? 0), 0);
        const realEstate = (props.properties ?? []).reduce(
          (s: number, p: { estimated_value: number | null; mortgage_balance: number | null }) =>
            s + ((p.estimated_value ?? 0) - (p.mortgage_balance ?? 0)),
          0,
        );
        setLiveNetWorth(investments + banking + realEstate - credit);
      } catch {
        setLiveNetWorth(0);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isTestAccount]);

  if (!isTestAccount) {
    return (
      <MobileShell title="Net Worth" subtitle="Timeline">
        <div className="px-5 pt-2">
          <LuxCard className="p-8 text-center">
            <p className="font-serif text-lg text-foreground">No history yet</p>
            <p className="mt-2 text-xs text-muted-foreground">
              We'll start tracking your net worth as soon as you connect accounts.
              Check back after a few weeks for your timeline.
            </p>
            <Link
              to="/connections"
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-4 py-2 text-xs font-medium text-primary"
            >
              <Plus className="h-3 w-3" /> Connect accounts
            </Link>
          </LuxCard>

          <div className="mt-6">
            <p className="label-mono mb-2">Project the next chapter</p>
            <NetWorthProjection currentNetWorth={Math.max(0, liveNetWorth ?? 0)} />
          </div>
        </div>
      </MobileShell>
    );
  }

  const data = timelines[range];
  const start = data[0].value;
  const end = data[data.length - 1].value;
  const change = ((end - start) / start) * 100;
  const positive = change >= 0;

  return (
    <MobileShell title="Net Worth" subtitle="Timeline">
      <div className="px-5">
        <LuxCard className="gradient-hero overflow-hidden p-5">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative">
            <p className="label-mono">Current</p>
            <p className="mt-1 font-serif text-4xl text-foreground">{fmtCurrency(end)}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                <ArrowUpRight className={`h-3.5 w-3.5 ${positive ? "" : "rotate-90"}`} />
                <span className="font-mono text-xs">{fmtPct(change)}</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">over {range}</span>
            </div>
          </div>

          <div className="-mx-2 mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.16 295)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.78 0.16 295)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(1 0 0 / 0.04)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "oklch(0.66 0.03 280)", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "oklch(0.66 0.03 280)", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
                  width={42}
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
                  formatter={(v) => fmtCurrency(Number(v))}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="oklch(0.78 0.16 295)"
                  strokeWidth={2}
                  fill="url(#netGrad)"
                  isAnimationActive
                  animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </LuxCard>
      </div>

      <div className="mt-3 flex justify-center gap-2 px-5">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-full px-4 py-1.5 font-mono text-xs transition-all ${
              range === r
                ? "gradient-violet text-foreground glow-violet"
                : "border border-white/[0.08] bg-white/[0.02] text-muted-foreground"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Stacked breakdown */}
      <div className="mt-6 px-5">
        <p className="label-mono mb-2">Breakdown over time</p>
        <LuxCard className="p-4">
          <div className="-mx-2 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="invG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.68 0.13 295)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="oklch(0.68 0.13 295)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="bnkG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.16 295)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="oklch(0.78 0.16 295)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="trsG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.82 0.12 85)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="oklch(0.82 0.12 85)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(1 0 0 / 0.04)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "oklch(0.66 0.03 280)", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "oklch(0.20 0.025 280)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 12, fontSize: 11 }}
                  formatter={(v) => fmtCurrency(Number(v), { compact: true })}
                />
                <Area type="monotone" dataKey="investments" stackId="1" stroke="oklch(0.68 0.13 295)" fill="url(#invG)" />
                <Area type="monotone" dataKey="banking" stackId="1" stroke="oklch(0.78 0.16 295)" fill="url(#bnkG)" />
                <Area type="monotone" dataKey="trust" stackId="1" stroke="oklch(0.82 0.12 85)" fill="url(#trsG)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Legend dot="bg-primary" label="Investments" />
            <Legend dot="bg-violet-glow" label="Banking" />
            <Legend dot="bg-gold" label="Trust" />
          </div>
        </LuxCard>
      </div>

      <div className="mt-6 px-5">
        <p className="label-mono mb-2">Project the next chapter</p>
        <NetWorthProjection currentNetWorth={end} />
      </div>



      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 px-5 text-center"
      >
        <p className="font-serif text-sm italic text-muted-foreground">
          "Wealth, like trees, is grown slowly."
        </p>
      </motion.div>
    </MobileShell>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}
