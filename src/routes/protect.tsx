import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ChevronDown, FileText, AlertCircle } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { policies } from "@/lib/mock-data";
import { fmtCurrency } from "@/lib/format";

export const Route = createFileRoute("/protect")({
  head: () => ({
    meta: [
      { title: "Insurance — Æther Wealth" },
      { name: "description", content: "All your coverage in one private vault." },
    ],
  }),
  component: ProtectRoute,
});

function ProtectRoute() {
  return (
    <RequireOnboarding>
      <ProtectPage />
    </RequireOnboarding>
  );
}

function ProtectPage() {
  const [open, setOpen] = useState<string | null>(null);
  const totalCoverage = policies.reduce((s, p) => s + p.coverage, 0);
  const totalPremium = policies.reduce((s, p) => s + p.premium, 0);

  return (
    <MobileShell title="Protect" subtitle="Insurance">
      <div className="px-5">
        <LuxCard className="gradient-hero p-5">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative grid grid-cols-2 gap-4">
            <div>
              <p className="label-mono">Total coverage</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{fmtCurrency(totalCoverage, { compact: true })}</p>
            </div>
            <div>
              <p className="label-mono">Monthly premium</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{fmtCurrency(totalPremium)}</p>
            </div>
          </div>
        </LuxCard>
      </div>

      <div className="mt-4 flex flex-col gap-2 px-5">
        {policies.map((p, i) => {
          const isOpen = open === p.id;
          return (
            <LuxCard key={p.id} delay={i * 0.05} className="overflow-hidden">
              <button onClick={() => setOpen(isOpen ? null : p.id)} className="flex w-full items-center gap-3 px-4 py-4 text-left">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl gradient-violet">
                  <Shield className="h-4 w-4 text-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-serif text-base text-foreground">{p.type}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{p.provider}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm tabular-nums text-foreground">{fmtCurrency(p.coverage, { compact: true })}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">${p.premium}/mo</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-white/[0.06] px-4 py-4">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Policy #" value={p.policyNumber} />
                        <Field label="Provider" value={p.provider} />
                        <Field label="Coverage" value={fmtCurrency(p.coverage)} />
                        <Field label="Premium" value={`${fmtCurrency(p.premium)}/mo`} />
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-foreground">
                          <FileText className="h-3.5 w-3.5" /> View Policy
                        </button>
                        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-full gradient-violet px-3 py-2.5 text-xs font-medium text-foreground glow-violet">
                          <AlertCircle className="h-3.5 w-3.5" /> File Claim
                        </button>
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Active: "bg-success/15 text-success",
    "Renewal Due": "bg-warning/15 text-warning",
    Pending: "bg-muted/40 text-muted-foreground",
  };
  return <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${styles[status]}`}>{status}</span>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-mono text-xs tabular-nums text-foreground">{value}</p>
    </div>
  );
}
