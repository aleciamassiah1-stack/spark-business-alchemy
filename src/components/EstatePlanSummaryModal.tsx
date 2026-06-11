import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  X,
  Scroll,
  Home as HomeIcon,
  Heart,
  Users,
  FileText,
  CheckCircle2,
  Circle,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { LuxCard } from "@/components/LuxCard";
import { fmtCurrency } from "@/lib/format";
import {
  listEstateDocuments,
  listInsurancePolicies,
  listProperties,
} from "@/lib/wealth.functions";

type EstateDoc = {
  id: string;
  document_type: string;
  title: string;
  status: string | null;
  signed_date: string | null;
  notes: string | null;
};

type Policy = {
  id: string;
  policy_type: string;
  insurer_name: string;
  coverage_amount: number | null;
  beneficiaries: unknown;
};

type Property = {
  id: string;
  name: string;
  address: string;
  estimated_value: number;
  mortgage_balance: number;
};

type Beneficiary = {
  name: string;
  initials: string;
  total: number;
  allocations: { source: string; amount: number }[];
};

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

const REQUIRED_DOCS: { type: string; label: string }[] = [
  { type: "will", label: "Last will & testament" },
  { type: "trust", label: "Living trust" },
  { type: "power_of_attorney", label: "Power of attorney" },
  { type: "healthcare_directive", label: "Healthcare directive" },
];

export function EstatePlanSummaryModal({ onClose }: { onClose: () => void }) {
  const [docs, setDocs] = useState<EstateDoc[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [d, p, pr] = await Promise.all([
          listEstateDocuments(),
          listInsurancePolicies(),
          listProperties(),
        ]);
        setDocs((d.documents ?? []) as EstateDoc[]);
        setPolicies((p.policies ?? []) as Policy[]);
        setProperties((pr.properties ?? []) as Property[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const beneficiaries: Beneficiary[] = useMemo(() => {
    const map = new Map<string, Beneficiary>();
    for (const p of policies) {
      const list = Array.isArray(p.beneficiaries)
        ? (p.beneficiaries as unknown[]).map((x) => String(x).trim()).filter(Boolean)
        : [];
      if (!list.length) continue;
      const cov = Number(p.coverage_amount) || 0;
      const share = cov / list.length;
      for (const name of list) {
        const key = name.toLowerCase();
        const source = `${p.insurer_name} · ${p.policy_type}`;
        const existing = map.get(key);
        if (existing) {
          existing.total += share;
          existing.allocations.push({ source, amount: share });
        } else {
          map.set(key, {
            name,
            initials: initials(name),
            total: share,
            allocations: [{ source, amount: share }],
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [policies]);

  const propertyEquity = properties.reduce(
    (s, p) => s + Math.max(0, p.estimated_value - p.mortgage_balance),
    0,
  );
  const insuranceTotal = beneficiaries.reduce((s, b) => s + b.total, 0);
  const grandTotal = propertyEquity + insuranceTotal;

  const have = new Set(docs.map((d) => d.document_type));
  const wishes = docs
    .filter((d) => d.notes && d.notes.trim().length > 0)
    .map((d) => ({ id: d.id, title: d.title, notes: d.notes!.trim() }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border-t border-white/[0.08] bg-background pb-6 sm:rounded-2xl sm:border">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-background/95 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Scroll className="h-4 w-4" />
            </div>
            <div>
              <p className="label-mono text-[10px]">Estate plan</p>
              <p className="font-serif text-lg text-foreground">Summary of bequests</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 pt-5">
          {/* Total */}
          <LuxCard className="gradient-hero relative overflow-hidden p-5">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/30 blur-3xl" />
            <div className="relative">
              <p className="label-mono">Total wealth to be passed on</p>
              <p className="mt-1 font-serif text-[34px] leading-none text-foreground">
                {fmtCurrency(grandTotal)}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
                <span>
                  Property equity ·{" "}
                  <span className="font-mono text-foreground">
                    {fmtCurrency(propertyEquity, { compact: true })}
                  </span>
                </span>
                <span>
                  Insurance ·{" "}
                  <span className="font-mono text-foreground">
                    {fmtCurrency(insuranceTotal, { compact: true })}
                  </span>
                </span>
              </div>
            </div>
          </LuxCard>

          {/* Beneficiaries (who gets what %) */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="label-mono">Who gets what</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {beneficiaries.length} beneficiaries
              </p>
            </div>
            <LuxCard className="p-4">
              {loading ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Loading…</p>
              ) : beneficiaries.length === 0 ? (
                <div className="py-3 text-center">
                  <Users className="mx-auto h-5 w-5 text-muted-foreground" />
                  <p className="mt-2 text-sm text-foreground">No beneficiaries on file</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Add insurance policies with beneficiaries to populate this view.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {beneficiaries.map((b) => {
                    const pct = insuranceTotal > 0 ? (b.total / insuranceTotal) * 100 : 0;
                    return (
                      <div key={b.name} className="rounded-xl bg-white/[0.03] p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-violet text-sm font-medium text-foreground">
                            {b.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-serif text-sm text-foreground">{b.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {b.allocations.length}{" "}
                              {b.allocations.length === 1 ? "allocation" : "allocations"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm tabular-nums text-foreground">
                              {fmtCurrency(b.total, { compact: true })}
                            </p>
                            <p className="font-mono text-[10px] tabular-nums text-primary">
                              {pct.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.04]">
                          <div
                            className="h-full gradient-violet transition-all"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </LuxCard>
          </div>

          {/* Properties / homes / land */}
          <div>
            <p className="label-mono mb-2">Real property &amp; homes</p>
            <LuxCard className="p-4">
              {loading ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Loading…</p>
              ) : properties.length === 0 ? (
                <div className="py-3 text-center">
                  <HomeIcon className="mx-auto h-5 w-5 text-muted-foreground" />
                  <p className="mt-2 text-sm text-foreground">No properties on file</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Add homes, land, or other real estate from Connections.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {properties.map((p) => {
                    const equity = Math.max(0, p.estimated_value - p.mortgage_balance);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                          <HomeIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-serif text-sm text-foreground">{p.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{p.address}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm tabular-nums text-foreground">
                            {fmtCurrency(equity, { compact: true })}
                          </p>
                          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            equity
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </LuxCard>
          </div>

          {/* Document checklist */}
          <div>
            <p className="label-mono mb-2">Required documents</p>
            <LuxCard className="p-4">
              <div className="flex flex-col gap-2">
                {REQUIRED_DOCS.map((r) => {
                  const ok = have.has(r.type);
                  return (
                    <div
                      key={r.type}
                      className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3"
                    >
                      <div className="flex items-center gap-3">
                        {ok ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <p className="text-sm text-foreground">{r.label}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                          ok ? "bg-success/15 text-success" : "bg-white/[0.04] text-muted-foreground"
                        }`}
                      >
                        {ok ? "On file" : "Missing"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </LuxCard>
          </div>

          {/* Dying wishes / notes */}
          <div>
            <p className="label-mono mb-2 flex items-center gap-1.5">
              <Heart className="h-3 w-3 text-primary" /> Dying wishes &amp; notes
            </p>
            <LuxCard className="p-4">
              {wishes.length === 0 ? (
                <div className="py-3 text-center">
                  <Sparkles className="mx-auto h-5 w-5 text-muted-foreground" />
                  <p className="mt-2 text-sm text-foreground">No wishes recorded yet</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Add notes to your estate documents (funeral wishes, heirlooms, letters) and they'll appear here.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {wishes.map((w) => (
                    <div key={w.id} className="rounded-xl bg-white/[0.03] p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        <p className="font-serif text-sm text-foreground">{w.title}</p>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-muted-foreground">
                        {w.notes}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </LuxCard>
          </div>

          <Link
            to="/legacy"
            onClick={onClose}
            className="flex items-center justify-center gap-1 rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground glow-violet"
          >
            Open full estate plan
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
