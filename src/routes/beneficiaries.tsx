import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AlertTriangle, Plus, Pencil } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { beneficiaries as demoBeneficiaries, conflicts as demoConflicts } from "@/lib/mock-data";
import { useIsTestAccount } from "@/lib/test-account";

export const Route = createFileRoute("/beneficiaries")({
  head: () => ({
    meta: [
      { title: "Beneficiaries — Æther Wealth" },
      { name: "description", content: "Unified beneficiary view across all accounts." },
    ],
  }),
  component: () => (
    <RequireOnboarding>
      <BeneficiariesPage />
    </RequireOnboarding>
  ),
});

function BeneficiariesPage() {
  const isTestAccount = useIsTestAccount();
  const beneficiaries = isTestAccount ? demoBeneficiaries : [];
  const conflicts = isTestAccount ? demoConflicts : [];
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
          <p className="label-mono">Beneficiaries · {beneficiaries.length}</p>
          <button className="flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary">
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        {beneficiaries.length === 0 ? (
          <LuxCard className="p-6 text-center">
            <p className="font-serif text-base text-foreground">No beneficiaries yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add the people who inherit from your accounts and estate.
            </p>
          </LuxCard>
        ) : (
          <div className="flex flex-col gap-2">
            {beneficiaries.map((b, i) => (
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
        )}
      </div>
    </MobileShell>
  );
}
