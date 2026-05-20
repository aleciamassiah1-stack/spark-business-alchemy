import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Plus, Pencil, Sparkles, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { UpgradeWall } from "@/components/UpgradeWall";
import { beneficiaries as demoBeneficiaries, conflicts as demoConflicts } from "@/lib/mock-data";
import { useIsTestAccount } from "@/lib/test-account";
import { listInsurancePolicies } from "@/lib/wealth.functions";
import { fmtCurrency } from "@/lib/format";

export const Route = createFileRoute("/beneficiaries")({
  head: () => ({
    meta: [
      { title: "Beneficiaries — Æther Wealth" },
      { name: "description", content: "Unified beneficiary view across all accounts." },
    ],
  }),
  component: () => (
    <RequireOnboarding>
      <UpgradeWall
        minTier="private"
        feature="Beneficiary Manager"
        description="See every beneficiary across insurance, retirement, and trust accounts in one unified view — and surface conflicts before they become disputes."
        perks={[
          "AI-extracted beneficiaries from policy documents",
          "Conflict detection across overlapping accounts",
          "Inheritance allocation per person",
          "One-click updates synced to your advisor",
        ]}
      >
        <BeneficiariesPage />
      </UpgradeWall>
    </RequireOnboarding>
  ),
});

type Policy = {
  id: string;
  policy_type: string;
  insurer_name: string;
  coverage_amount: number | null;
  beneficiaries: unknown;
  parsed_by_ai: boolean | null;
};

type DerivedBeneficiary = {
  name: string;
  initials: string;
  totalInheritance: number;
  allocations: Array<{ source: string; amount: number; policyType: string }>;
  fromAi: boolean;
};

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function BeneficiariesPage() {
  const isTestAccount = useIsTestAccount();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    listInsurancePolicies()
      .then((res) => {
        if (!mounted) return;
        setPolicies((res.policies ?? []) as Policy[]);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const derived: DerivedBeneficiary[] = useMemo(() => {
    const map = new Map<string, DerivedBeneficiary>();
    for (const p of policies) {
      const list = Array.isArray(p.beneficiaries)
        ? (p.beneficiaries as unknown[]).map((x) => String(x).trim()).filter(Boolean)
        : [];
      if (list.length === 0) continue;
      const coverage = Number(p.coverage_amount) || 0;
      const share = list.length > 0 ? coverage / list.length : 0;
      for (const name of list) {
        const key = name.toLowerCase();
        const source = `${p.insurer_name} · ${p.policy_type}`;
        const existing = map.get(key);
        if (existing) {
          existing.totalInheritance += share;
          existing.allocations.push({ source, amount: share, policyType: p.policy_type });
          if (p.parsed_by_ai) existing.fromAi = true;
        } else {
          map.set(key, {
            name,
            initials: initialsOf(name) || "?",
            totalInheritance: share,
            allocations: [{ source, amount: share, policyType: p.policy_type }],
            fromAi: !!p.parsed_by_ai,
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalInheritance - a.totalInheritance);
  }, [policies]);

  const conflicts = isTestAccount ? demoConflicts : [];
  const showDemo = isTestAccount && derived.length === 0;
  const totalInheritance = derived.reduce((s, b) => s + b.totalInheritance, 0);
  const maxInheritance = Math.max(1, ...derived.map((b) => b.totalInheritance));

  return (
    <MobileShell title="Beneficiaries" subtitle="Who inherits what">
      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="px-5">
          <p className="label-mono mb-2">Conflicts detected · {conflicts.length}</p>
          <div className="flex flex-col gap-2">
            {conflicts.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`relative overflow-hidden rounded-2xl border p-4 ${
                  c.severity === "high"
                    ? "border-destructive/30 bg-destructive/[0.06]"
                    : "border-warning/30 bg-warning/[0.06]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className={`mt-0.5 h-4 w-4 shrink-0 ${c.severity === "high" ? "text-destructive" : "text-warning"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{c.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.detail}</p>
                    <button className="mt-2 text-xs font-medium text-primary">Resolve →</button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Beneficiaries list */}
      <div className="mt-6 px-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="label-mono">
            Beneficiaries · {derived.length}
            {totalInheritance > 0
              ? ` · ${fmtCurrency(totalInheritance, { compact: true })}`
              : ""}
          </p>
          <button className="flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary">
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>

        {loading ? (
          <LuxCard className="flex items-center justify-center p-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </LuxCard>
        ) : showDemo ? (
          <div className="flex flex-col gap-2">
            {demoBeneficiaries.map((b, i) => (
              <LuxCard key={b.id} delay={i * 0.05} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full gradient-violet text-sm font-medium text-foreground">
                    {b.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-base text-foreground">{b.name}</p>
                    <p className="text-[11px] text-muted-foreground">{b.relationship}</p>
                  </div>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.04]">
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {b.allocations.map((a) => (
                    <div key={a.account} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-foreground">{a.account}</p>
                        <p className="font-mono text-xs tabular-nums text-primary">{a.pct}%</p>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-white/[0.04]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${a.pct}%` }}
                          transition={{ duration: 0.8, delay: 0.2 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full gradient-violet"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </LuxCard>
            ))}
          </div>
        ) : derived.length === 0 ? (
          <LuxCard className="p-6 text-center">
            <p className="font-serif text-base text-foreground">No beneficiaries yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload a life insurance policy on Connections — beneficiaries will appear here automatically.
            </p>
          </LuxCard>
        ) : (
          <div className="flex flex-col gap-2">
            {derived.map((b, i) => {
              const pct = Math.round((b.totalInheritance / maxInheritance) * 100);
              return (
                <LuxCard key={b.name} delay={i * 0.05} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full gradient-violet text-sm font-medium text-foreground">
                      {b.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-serif text-base text-foreground">{b.name}</p>
                        {b.fromAi && (
                          <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gold">
                            <Sparkles className="h-2.5 w-2.5" /> AI
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {b.allocations.length} {b.allocations.length === 1 ? "policy" : "policies"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm tabular-nums text-foreground">
                        {fmtCurrency(b.totalInheritance, { compact: true })}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Inheritance
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    {b.allocations.map((a, idx) => (
                      <div key={`${a.source}-${idx}`} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-xs text-foreground">{a.source}</p>
                          <p className="font-mono text-xs tabular-nums text-primary">
                            {fmtCurrency(a.amount, { compact: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div className="h-1 overflow-hidden rounded-full bg-white/[0.04]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.2 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full gradient-violet"
                      />
                    </div>
                  </div>
                </LuxCard>
              );
            })}
          </div>
        )}
      </div>
    </MobileShell>
  );
}
