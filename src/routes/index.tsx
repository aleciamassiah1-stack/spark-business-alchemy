import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight, Calendar, ArrowRight, TrendingUp, Shield, Scroll, Wallet } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { netWorth, allocation, recentActivity, advisor } from "@/lib/mock-data";
import { fmtCurrency, fmtPct } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Æther Wealth — Overview" },
      { name: "description", content: "Your private wealth, in one elegant view." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const totalAlloc = allocation.investments + allocation.banking + allocation.trust;
  const pctInv = (allocation.investments / totalAlloc) * 100;
  const pctBank = (allocation.banking / totalAlloc) * 100;
  const pctTrust = (allocation.trust / totalAlloc) * 100;

  return (
    <MobileShell>
      <div className="px-5 pt-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="label-mono">Good morning</p>
            <h1 className="font-serif text-2xl text-foreground">James Whitfield</h1>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-violet text-sm font-medium text-foreground glow-violet">
            JW
          </div>
        </div>
      </div>

      {/* Net Worth Hero */}
      <div className="px-5 pt-5">
        <LuxCard className="gradient-hero p-6">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative">
            <p className="label-mono">Total Net Worth</p>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-1 font-serif text-[44px] leading-none text-foreground"
            >
              {fmtCurrency(netWorth.total)}
            </motion.div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-success">
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.4} />
                <span className="font-mono text-xs font-medium">{fmtPct(netWorth.ytdChange)}</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {fmtCurrency(netWorth.ytdAmount)} YTD
              </span>
            </div>

            {/* Allocation bar */}
            <div className="mt-6">
              <div className="flex h-2 overflow-hidden rounded-full bg-white/5">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pctInv}%` }} transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="bg-primary" />
                <motion.div initial={{ width: 0 }} animate={{ width: `${pctBank}%` }} transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="bg-violet-glow" />
                <motion.div initial={{ width: 0 }} animate={{ width: `${pctTrust}%` }} transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="bg-gold" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <AllocItem label="Investments" pct={pctInv} dot="bg-primary" />
                <AllocItem label="Banking" pct={pctBank} dot="bg-violet-glow" />
                <AllocItem label="Trust" pct={pctTrust} dot="bg-gold" />
              </div>
            </div>
          </div>
        </LuxCard>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 px-5 pt-5">
        <SummaryTile to="/portfolio" icon={TrendingUp} label="Investments" value={fmtCurrency(2_840_000, { compact: true })} delta="+14.2%" delay={0.1} />
        <SummaryTile to="/protect" icon={Shield} label="Coverage" value="$21.6M" delta="5 policies" delay={0.15} />
        <SummaryTile to="/legacy" icon={Scroll} label="Trust Assets" value="$835K" delta="2 trusts" delay={0.2} />
        <SummaryTile to="/legacy" icon={Wallet} label="Estate Docs" value="4 / 5" delta="1 needs review" delay={0.25} warn />
      </div>

      {/* Advisor card */}
      <div className="px-5 pt-5">
        <LuxCard className="p-5" delay={0.3}>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full gradient-gold text-sm font-semibold text-background">
              {advisor.initials}
            </div>
            <div className="flex-1">
              <p className="label-mono">Your Advisor</p>
              <p className="font-serif text-lg text-foreground">{advisor.name}</p>
              <p className="text-xs text-muted-foreground">{advisor.title} · {advisor.firm}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Next meeting</p>
                <p className="text-sm text-foreground">{advisor.nextMeeting}</p>
              </div>
            </div>
            <button className="rounded-full bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary">Join</button>
          </div>
        </LuxCard>
      </div>

      {/* Recent activity */}
      <div className="px-5 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="label-mono">Recent activity</p>
          <button className="text-xs text-primary">View all</button>
        </div>
        <LuxCard className="divide-y divide-white/[0.04]" delay={0.35}>
          {recentActivity.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{a.title}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{a.date}</p>
              </div>
              {a.amount !== 0 && (
                <p className={`font-mono text-sm tabular-nums ${a.amount > 0 ? "text-success" : "text-muted-foreground"}`}>
                  {a.amount > 0 ? "+" : ""}{fmtCurrency(a.amount)}
                </p>
              )}
            </div>
          ))}
        </LuxCard>
      </div>

      <div className="px-5 pt-6">
        <Link to="/timeline" className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
          <div>
            <p className="label-mono">Net worth</p>
            <p className="text-sm text-foreground">View 36-month timeline</p>
          </div>
          <ArrowRight className="h-4 w-4 text-primary" />
        </Link>
      </div>
    </MobileShell>
  );
}

function AllocItem({ label, pct, dot }: { label: string; pct: number; dot: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="mt-0.5 font-mono text-xs tabular-nums text-foreground">{pct.toFixed(1)}%</p>
    </div>
  );
}

function SummaryTile({ to, icon: Icon, label, value, delta, delay = 0, warn = false }: { to: string; icon: typeof TrendingUp; label: string; value: string; delta: string; delay?: number; warn?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={to} className="block">
        <div className="gradient-card relative overflow-hidden rounded-2xl border border-white/[0.06] p-4">
          <div className="flex items-center justify-between">
            <Icon className="h-4 w-4 text-primary" />
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-0.5 font-serif text-xl text-foreground">{value}</p>
          <p className={`mt-1 font-mono text-[10px] ${warn ? "text-warning" : "text-muted-foreground"}`}>{delta}</p>
        </div>
      </Link>
    </motion.div>
  );
}
