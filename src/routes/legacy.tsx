import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Scroll, Users, FileText, Phone, ChevronRight, AlertTriangle, CheckCircle2, Circle, Plus, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { trustAccounts, attorney } from "@/lib/mock-data";
import { listEstateDocuments } from "@/lib/wealth.functions";
import { fmtCurrency } from "@/lib/format";

type EstateDoc = {
  id: string;
  document_type: string;
  title: string;
  status: string | null;
  signed_date: string | null;
  expiration_date: string | null;
  document_url: string | null;
  updated_at: string;
};

const DOC_TYPE_LABEL: Record<string, string> = {
  will: "Last Will & Testament",
  healthcare_directive: "Healthcare Directive",
  power_of_attorney: "Power of Attorney",
  trust: "Trust Document",
  other: "Other",
};

export const Route = createFileRoute("/legacy")({
  head: () => ({
    meta: [
      { title: "Trust & Estate — Æther Wealth" },
      { name: "description", content: "Your legacy, structured and protected." },
    ],
  }),
  component: () => (
    <RequireOnboarding>
      <LegacyPage />
    </RequireOnboarding>
  ),
});

function LegacyPage() {
  const trustTotal = trustAccounts.reduce((s, t) => s + t.value, 0);
  const [docs, setDocs] = useState<EstateDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    listEstateDocuments()
      .then((res) => {
        if (!mounted) return;
        setDocs((res.documents ?? []) as EstateDoc[]);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <MobileShell title="Legacy" subtitle="Trust & Estate">
      {/* Trust accounts */}
      <div className="px-5">
        <p className="label-mono mb-2">Trust accounts · {fmtCurrency(trustTotal, { compact: true })}</p>
        <div className="flex flex-col gap-2">
          {trustAccounts.map((t, i) => (
            <LuxCard key={t.id} delay={i * 0.05} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl gradient-gold">
                  <Scroll className="h-4 w-4 text-background" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-base leading-tight text-foreground">{t.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{t.type} · Trustee: {t.trustee}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span className="font-mono text-[11px]">{t.beneficiaries} beneficiaries</span>
                    </div>
                    <p className="font-mono text-sm tabular-nums text-foreground">{fmtCurrency(t.value, { compact: true })}</p>
                  </div>
                </div>
              </div>
            </LuxCard>
          ))}
        </div>
      </div>

      {/* Estate docs vault — real data */}
      <div className="mt-6 px-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="label-mono">Estate documents vault</p>
          <Link
            to="/connections"
            className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] text-foreground"
          >
            <Plus className="h-3 w-3" /> Upload
          </Link>
        </div>
        {loading ? (
          <LuxCard className="flex items-center justify-center p-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </LuxCard>
        ) : docs.length === 0 ? (
          <LuxCard className="p-6 text-center">
            <FileText className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 font-serif text-base text-foreground">No documents yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload your will, healthcare directive or POA — we&apos;ll keep them safe.
            </p>
            <Link
              to="/connections"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full gradient-violet px-4 py-2 text-xs font-medium text-foreground glow-violet"
            >
              <Plus className="h-3.5 w-3.5" /> Upload first document
            </Link>
          </LuxCard>
        ) : (
          <LuxCard className="divide-y divide-white/[0.04]">
            {docs.map((d) => {
              const label = DOC_TYPE_LABEL[d.document_type] ?? d.document_type;
              const status = (d.status ?? "current").toLowerCase();
              const updated = new Date(d.updated_at).toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
              });
              const row = (
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <DocIcon status={status} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{d.title || label}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {label} · Updated {updated}
                    </p>
                  </div>
                  <DocStatusBadge status={status} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              );
              return d.document_url ? (
                <a key={d.id} href={d.document_url} target="_blank" rel="noreferrer" className="block">
                  {row}
                </a>
              ) : (
                <Link key={d.id} to="/connections" className="block">
                  {row}
                </Link>
              );
            })}
          </LuxCard>
        )}
      </div>

      {/* Beneficiary CTA */}
      <div className="mt-6 px-5">
        <Link to="/beneficiaries" className="block">
          <LuxCard className="gradient-hero p-5">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/30 blur-3xl" />
            <div className="relative flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-serif text-base text-foreground">Beneficiary Manager</p>
                <p className="text-xs text-muted-foreground">Who inherits what — across every account</p>
              </div>
              <ChevronRight className="h-4 w-4 text-primary" />
            </div>
          </LuxCard>
        </Link>
      </div>

      {/* Attorney card */}
      <div className="mt-6 px-5">
        <p className="label-mono mb-2">Attorney on file</p>
        <LuxCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full gradient-violet text-sm font-medium text-foreground">
              {attorney.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-base text-foreground">{attorney.name}</p>
              <p className="truncate text-xs text-muted-foreground">{attorney.firm}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{attorney.phone}</p>
            </div>
            <button className="flex h-9 w-9 items-center justify-center rounded-full gradient-violet glow-violet">
              <Phone className="h-3.5 w-3.5 text-foreground" />
            </button>
          </div>
        </LuxCard>
      </div>
    </MobileShell>
  );
}

function DocIcon({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "current") return <CheckCircle2 className="h-5 w-5 text-success" strokeWidth={1.8} />;
  if (s === "needs_review" || s === "needs review")
    return <AlertTriangle className="h-5 w-5 text-warning" strokeWidth={1.8} />;
  return <Circle className="h-5 w-5 text-muted-foreground" strokeWidth={1.8} />;
}

function DocStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const label = s === "needs_review" ? "Needs Review" : s.charAt(0).toUpperCase() + s.slice(1);
  const styles: Record<string, string> = {
    current: "bg-success/15 text-success",
    needs_review: "bg-warning/15 text-warning",
    "needs review": "bg-warning/15 text-warning",
    expired: "bg-destructive/15 text-destructive",
    missing: "bg-destructive/15 text-destructive",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${styles[s] ?? "bg-muted/40 text-muted-foreground"}`}
    >
      {label}
    </span>
  );
}

