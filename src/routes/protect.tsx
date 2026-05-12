import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ChevronDown, FileText, AlertCircle, Plus, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { listInsurancePolicies } from "@/lib/wealth.functions";
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

type Policy = {
  id: string;
  policy_type: string;
  insurer_name: string;
  policy_number: string | null;
  coverage_amount: number | null;
  premium_amount: number | null;
  premium_frequency: string | null;
  renewal_date: string | null;
  status: string | null;
  document_url: string | null;
  document_path: string | null;
};

function ProtectRoute() {
  return (
    <RequireOnboarding>
      <ProtectPage />
    </RequireOnboarding>
  );
}

function ProtectPage() {
  const [open, setOpen] = useState<string | null>(null);
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

  const totalCoverage = policies.reduce((s, p) => s + (Number(p.coverage_amount) || 0), 0);
  const totalPremium = policies.reduce((s, p) => {
    const amt = Number(p.premium_amount) || 0;
    const freq = (p.premium_frequency ?? "monthly").toLowerCase();
    const monthly =
      freq === "annual"
        ? amt / 12
        : freq === "semi-annual"
          ? amt / 6
          : freq === "quarterly"
            ? amt / 3
            : amt;
    return s + monthly;
  }, 0);

  return (
    <MobileShell title="Protect" subtitle="Insurance">
      <div className="px-5">
        <LuxCard className="gradient-hero p-5">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative grid grid-cols-2 gap-4">
            <div>
              <p className="label-mono">Total coverage</p>
              <p className="mt-1 font-serif text-3xl text-foreground">
                {fmtCurrency(totalCoverage, { compact: true })}
              </p>
            </div>
            <div>
              <p className="label-mono">Monthly premium</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{fmtCurrency(totalPremium)}</p>
            </div>
          </div>
        </LuxCard>
      </div>

      <div className="mt-4 flex items-center justify-between px-5">
        <p className="label-mono">Policies · {policies.length}</p>
        <Link
          to="/connections"
          className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] text-foreground"
        >
          <Plus className="h-3 w-3" /> Add / upload
        </Link>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center justify-center px-5 py-10">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : policies.length === 0 ? (
        <div className="mt-3 px-5">
          <LuxCard className="p-6 text-center">
            <Shield className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 font-serif text-base text-foreground">No policies yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload a policy PDF and we&apos;ll extract the details with AI.
            </p>
            <Link
              to="/connections"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full gradient-violet px-4 py-2 text-xs font-medium text-foreground glow-violet"
            >
              <Plus className="h-3.5 w-3.5" /> Add your first policy
            </Link>
          </LuxCard>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 px-5">
          {policies.map((p, i) => {
            const isOpen = open === p.id;
            const coverage = Number(p.coverage_amount) || 0;
            const premium = Number(p.premium_amount) || 0;
            return (
              <LuxCard key={p.id} delay={i * 0.05} className="overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : p.id)}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl gradient-violet">
                    <Shield className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-serif text-base capitalize text-foreground">{p.policy_type}</p>
                      <StatusBadge status={p.status ?? "active"} />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{p.insurer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm tabular-nums text-foreground">
                      {fmtCurrency(coverage, { compact: true })}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      ${premium}/{(p.premium_frequency ?? "mo").slice(0, 2)}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
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
                          <Field label="Policy #" value={p.policy_number ?? "—"} />
                          <Field label="Insurer" value={p.insurer_name} />
                          <Field label="Coverage" value={fmtCurrency(coverage)} />
                          <Field
                            label="Premium"
                            value={`${fmtCurrency(premium)}/${p.premium_frequency ?? "mo"}`}
                          />
                          {p.renewal_date && <Field label="Renews" value={p.renewal_date} />}
                        </div>
                        <div className="mt-4 flex gap-2">
                          {p.document_url ? (
                            <a
                              href={p.document_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-foreground"
                            >
                              <FileText className="h-3.5 w-3.5" /> View Policy
                            </a>
                          ) : (
                            <Link
                              to="/connections"
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-foreground"
                            >
                              <FileText className="h-3.5 w-3.5" /> Manage
                            </Link>
                          )}
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
      )}
    </MobileShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const styles: Record<string, string> = {
    active: "bg-success/15 text-success",
    "renewal due": "bg-warning/15 text-warning",
    pending: "bg-muted/40 text-muted-foreground",
    expired: "bg-destructive/15 text-destructive",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${styles[s] ?? "bg-muted/40 text-muted-foreground"}`}
    >
      {status}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-mono text-xs tabular-nums text-foreground">{value}</p>
    </div>
  );
}
