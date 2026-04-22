import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, ChevronDown, TrendingUp, Plus, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { Sparkline } from "@/components/Sparkline";
import { getAggregatedData } from "@/lib/plaid.functions";
import { fmtCurrency, fmtPct } from "@/lib/format";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Investments — Æther Wealth" },
      { name: "description", content: "Your investment portfolio at a glance." },
    ],
  }),
  component: () => (
    <RequireOnboarding>
      <PortfolioPage />
    </RequireOnboarding>
  ),
});

const FILTERS = ["All", "ETF", "Stock", "Bond", "REIT", "Other"] as const;
type Filter = (typeof FILTERS)[number];

type HoldingRow = {
  id: string;
  ticker: string | null;
  name: string | null;
  type: string | null;
  quantity: number | null;
  institution_price: number | null;
  institution_value: number | null;
  cost_basis: number | null;
};

function classifyType(t: string | null | undefined): Filter {
  const s = (t ?? "").toLowerCase();
  if (s.includes("etf")) return "ETF";
  if (s.includes("equity") || s.includes("stock")) return "Stock";
  if (s.includes("fixed") || s.includes("bond")) return "Bond";
  if (s.includes("real estate") || s.includes("reit")) return "REIT";
  return "Other";
}

function PortfolioPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const agg = await getAggregatedData();
        if (!alive) return;
        setHoldings((agg?.holdings ?? []) as HoldingRow[]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const total = holdings.reduce((s, h) => s + (Number(h.institution_value) || 0), 0);
  const costBasisTotal = holdings.reduce(
    (s, h) => s + (Number(h.cost_basis) || 0),
    0,
  );
  const ytdAvg =
    costBasisTotal > 0 ? ((total - costBasisTotal) / costBasisTotal) * 100 : 0;

  const filtered =
    filter === "All" ? holdings : holdings.filter((h) => classifyType(h.type) === filter);

  return (
    <MobileShell title="Portfolio" subtitle="Investments">
      <div className="px-5">
        <LuxCard className="gradient-hero p-5">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative">
            <p className="label-mono">Total value</p>
            <p className="mt-1 font-serif text-4xl text-foreground">{fmtCurrency(total)}</p>
            <div className="mt-2 flex items-center gap-2">
              <div
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${
                  ytdAvg >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                }`}
              >
                {ytdAvg >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                <span className="font-mono text-xs font-medium">{fmtPct(ytdAvg)}</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {costBasisTotal > 0 ? "vs cost basis" : "—"}
              </span>
            </div>
          </div>
        </LuxCard>
      </div>

      {!loading && holdings.length === 0 ? (
        <div className="px-5 pt-5">
          <LuxCard className="p-6 text-center">
            <TrendingUp className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 font-serif text-base text-foreground">No holdings yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Connect a brokerage to see your investments here.
            </p>
            <Link
              to="/connections"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-4 py-2 text-xs font-medium text-primary"
            >
              <Plus className="h-3 w-3" /> Connect brokerage
            </Link>
          </LuxCard>
        </div>
      ) : (
        <>
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

          {loading ? (
            <div className="mt-6 flex items-center justify-center px-5">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-2 px-5">
              {filtered.map((h, i) => {
                const value = Number(h.institution_value) || 0;
                const cb = Number(h.cost_basis) || 0;
                const ytd = cb > 0 ? ((value - cb) / cb) * 100 : 0;
                const positive = ytd >= 0;
                const isOpen = expanded === h.id;
                const ticker = h.ticker ?? (h.name ?? "—").slice(0, 4).toUpperCase();
                const kind = classifyType(h.type);
                return (
                  <LuxCard key={h.id} delay={i * 0.04} className="overflow-hidden">
                    <button
                      onClick={() => setExpanded(isOpen ? null : h.id)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.04] font-mono text-[10px] font-semibold text-primary">
                        {ticker}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{h.name ?? ticker}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {Number(h.quantity ?? 0).toLocaleString()} sh · {kind}
                        </p>
                      </div>
                      <Sparkline data={[1, 1, 1, 1, 1, 1, 1, 1, 1]} positive={positive} />
                      <div className="text-right">
                        <p className="font-mono text-sm tabular-nums text-foreground">
                          {fmtCurrency(value, { compact: true })}
                        </p>
                        {cb > 0 && (
                          <div
                            className={`flex items-center justify-end gap-0.5 font-mono text-[11px] ${
                              positive ? "text-success" : "text-destructive"
                            }`}
                          >
                            {positive ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {fmtPct(ytd)}
                          </div>
                        )}
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
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
                              <Detail
                                label="Price"
                                value={
                                  h.institution_price != null
                                    ? `$${Number(h.institution_price).toFixed(2)}`
                                    : "—"
                                }
                              />
                              <Detail label="Shares" value={Number(h.quantity ?? 0).toLocaleString()} />
                              <Detail label="Market value" value={fmtCurrency(value)} />
                              <Detail
                                label="Cost basis"
                                value={cb > 0 ? fmtCurrency(cb) : "—"}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </LuxCard>
                );
              })}
            </div>
          )}
        </>
      )}
    </MobileShell>
  );
}

function Detail({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={`font-mono text-sm tabular-nums ${
          positive === undefined ? "text-foreground" : positive ? "text-success" : "text-destructive"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
