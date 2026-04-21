import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, ChevronDown } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { Sparkline } from "@/components/Sparkline";
import { holdings } from "@/lib/mock-data";
import { fmtCurrency, fmtPct } from "@/lib/format";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Investments — Æther Wealth" },
      { name: "description", content: "Your investment portfolio at a glance." },
    ],
  }),
  component: PortfolioPage,
});

const FILTERS = ["All", "ETF", "Stock", "Bond", "REIT"] as const;
type Filter = (typeof FILTERS)[number];

function PortfolioPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const total = holdings.reduce((s, h) => s + h.value, 0);
  const ytdAvg = holdings.reduce((s, h) => s + h.ytd * h.value, 0) / total;

  const filtered = filter === "All" ? holdings : holdings.filter((h) => h.type === filter);

  return (
    <MobileShell title="Portfolio" subtitle="Investments">
      <div className="px-5">
        <LuxCard className="gradient-hero p-5">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative">
            <p className="label-mono">Total value</p>
            <p className="mt-1 font-serif text-4xl text-foreground">{fmtCurrency(total)}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-success">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span className="font-mono text-xs font-medium">{fmtPct(ytdAvg)}</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">YTD performance</span>
            </div>
          </div>
        </LuxCard>
      </div>

      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto px-5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${
              filter === f
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-white/[0.08] bg-white/[0.02] text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 px-5">
        {filtered.map((h, i) => {
          const isOpen = expanded === h.ticker;
          const positive = h.ytd >= 0;
          return (
            <LuxCard key={h.ticker} delay={i * 0.04} className="overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : h.ticker)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.04] font-mono text-[10px] font-semibold text-primary">
                  {h.ticker}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{h.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {h.shares.toLocaleString()} sh · {h.type}
                  </p>
                </div>
                <Sparkline data={h.spark} positive={positive} />
                <div className="text-right">
                  <p className="font-mono text-sm tabular-nums text-foreground">{fmtCurrency(h.value, { compact: true })}</p>
                  <div className={`flex items-center justify-end gap-0.5 font-mono text-[11px] ${positive ? "text-success" : "text-destructive"}`}>
                    {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {fmtPct(h.ytd)}
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-white/[0.06] px-4 py-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <Detail label="Price" value={`$${h.price.toFixed(2)}`} />
                        <Detail label="Shares" value={h.shares.toLocaleString()} />
                        <Detail label="Market value" value={fmtCurrency(h.value)} />
                        <Detail label="YTD return" value={fmtPct(h.ytd)} positive={positive} />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <ActionBtn label="Buy More" primary />
                        <ActionBtn label="Sell" />
                        <ActionBtn label="Details" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </LuxCard>
          );
        })}
      </div>
    </MobileShell>
  );
}

function Detail({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-mono text-sm tabular-nums ${positive === undefined ? "text-foreground" : positive ? "text-success" : "text-destructive"}`}>{value}</p>
    </div>
  );
}

function ActionBtn({ label, primary = false }: { label: string; primary?: boolean }) {
  return (
    <button
      className={`rounded-full px-3 py-2 text-xs font-medium transition-all ${
        primary
          ? "gradient-violet text-foreground glow-violet"
          : "border border-white/[0.08] bg-white/[0.03] text-foreground hover:bg-white/[0.06]"
      }`}
    >
      {label}
    </button>
  );
}
