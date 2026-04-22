import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Scroll,
  Users,
  FileText,
  Phone,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Plus,
  Loader2,
  Pencil,
  ExternalLink,
  X,
  Trash2,
  Home,
  Sparkles,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { trustAccounts as demoTrustAccounts, attorney as demoAttorney } from "@/lib/mock-data";
import { useIsTestAccount } from "@/lib/test-account";
import {
  listEstateDocuments,
  listProperties,
  listPropertyValuations,
  upsertEstateDocument,
  deleteEstateDocument,
  estimatePropertyValueRentCast,
  savePropertyValuation,
} from "@/lib/wealth.functions";
import { fmtCurrency } from "@/lib/format";

type Property = {
  id: string;
  name: string;
  address: string;
  estimated_value: number | null;
  mortgage_balance: number | null;
  image_url: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
};

type Valuation = {
  id: string;
  property_id: string;
  estimated_value: number;
  value_low: number;
  value_high: number;
  confidence: string;
  price_per_sqft: number | null;
  market_summary: string | null;
  source: string | null;
  created_at: string;
};

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

const DOC_TYPES: Array<{ value: EditableDocType; label: string }> = [
  { value: "will", label: "Last Will & Testament" },
  { value: "healthcare_directive", label: "Healthcare Directive" },
  { value: "power_of_attorney", label: "Power of Attorney" },
  { value: "trust", label: "Trust Document" },
  { value: "other", label: "Other" },
];

type EditableDocType =
  | "will"
  | "healthcare_directive"
  | "power_of_attorney"
  | "trust"
  | "other";
type EditableStatus = "current" | "needs_review" | "expired";

const STATUSES: Array<{ value: EditableStatus; label: string }> = [
  { value: "current", label: "Current" },
  { value: "needs_review", label: "Needs Review" },
  { value: "expired", label: "Expired" },
];

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
  const isTestAccount = useIsTestAccount();
  const trustAccounts = isTestAccount ? demoTrustAccounts : [];
  const attorney = isTestAccount ? demoAttorney : null;
  const trustTotal = trustAccounts.reduce((s, t) => s + t.value, 0);
  const [docs, setDocs] = useState<EstateDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EstateDoc | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [valuationsByProperty, setValuationsByProperty] = useState<Record<string, Valuation[]>>({});
  const [propertiesLoading, setPropertiesLoading] = useState(true);

  async function reload() {
    const res = await listEstateDocuments();
    setDocs((res.documents ?? []) as EstateDoc[]);
  }

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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await listProperties();
        if (!mounted) return;
        const props = (res.properties ?? []) as Property[];
        setProperties(props);
        // Fetch latest valuations in parallel for each property
        const valuationLists = await Promise.all(
          props.map((p) => listPropertyValuations({ data: { property_id: p.id } })),
        );
        if (!mounted) return;
        const map: Record<string, Valuation[]> = {};
        props.forEach((p, i) => {
          map[p.id] = (valuationLists[i].valuations ?? []) as Valuation[];
        });
        setValuationsByProperty(map);
      } finally {
        if (mounted) setPropertiesLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const totalRealEstateValue = properties.reduce((s, p) => s + (Number(p.estimated_value) || 0), 0);
  const totalRealEstateEquity = properties.reduce(
    (s, p) => s + Math.max(0, (Number(p.estimated_value) || 0) - (Number(p.mortgage_balance) || 0)),
    0,
  );

  return (
    <MobileShell title="Legacy" subtitle="Trust & Estate">
      {/* Real estate — properties with photos and AI valuations */}
      <div className="px-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="label-mono">
            Real estate {properties.length > 0 ? `· ${fmtCurrency(totalRealEstateValue, { compact: true })}` : ""}
          </p>
          <Link
            to="/connections"
            className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] text-foreground"
          >
            <Plus className="h-3 w-3" /> Add property
          </Link>
        </div>

        {propertiesLoading ? (
          <LuxCard className="flex items-center justify-center p-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </LuxCard>
        ) : properties.length === 0 ? (
          <LuxCard className="p-6 text-center">
            <Home className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 font-serif text-base text-foreground">No properties yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a home to track its value, equity, and AI-estimated worth over time.
            </p>
            <Link
              to="/connections"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full gradient-violet px-4 py-2 text-xs font-medium text-foreground glow-violet"
            >
              <Plus className="h-3.5 w-3.5" /> Add your first property
            </Link>
          </LuxCard>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Equity summary banner */}
            <LuxCard className="gradient-hero p-4">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/30 blur-3xl" />
              <div className="relative grid grid-cols-2 gap-3">
                <div>
                  <p className="label-mono">Total value</p>
                  <p className="mt-1 font-serif text-2xl text-foreground">
                    {fmtCurrency(totalRealEstateValue, { compact: true })}
                  </p>
                </div>
                <div>
                  <p className="label-mono">Equity</p>
                  <p className="mt-1 font-serif text-2xl text-foreground">
                    {fmtCurrency(totalRealEstateEquity, { compact: true })}
                  </p>
                </div>
              </div>
            </LuxCard>

            {properties.map((p, i) => (
              <PropertyCard
                key={p.id}
                property={p}
                valuation={valuationsByProperty[p.id]?.[0] ?? null}
                delay={i * 0.05}
                onValuationSaved={async () => {
                  const res = await listPropertyValuations({ data: { property_id: p.id } });
                  setValuationsByProperty((prev) => ({
                    ...prev,
                    [p.id]: (res.valuations ?? []) as Valuation[],
                  }));
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Trust accounts — demo data only for the test account */}
      {trustAccounts.length > 0 ? (
        <div className="mt-6 px-5">
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
      ) : null}

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
              return (
                <div key={d.id} className="flex items-center gap-3 px-4 py-3.5">
                  <DocIcon status={status} />
                  <button
                    type="button"
                    onClick={() => setEditing(d)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm text-foreground">{d.title || label}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {label} · Updated {updated}
                    </p>
                  </button>
                  <DocStatusBadge status={status} />
                  {d.document_url ? (
                    <a
                      href={d.document_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                      aria-label="Open document"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setEditing(d)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                    aria-label="Edit document"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
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

      {/* Attorney card — demo data only for the test account */}
      {attorney ? (
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
      ) : null}

      {editing ? (
        <EditEstateDocModal
          doc={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reload();
          }}
          onDeleted={async () => {
            setEditing(null);
            await reload();
          }}
        />
      ) : null}
    </MobileShell>
  );
}

function EditEstateDocModal({
  doc,
  onClose,
  onSaved,
  onDeleted,
}: {
  doc: EstateDoc;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onDeleted: () => void | Promise<void>;
}) {
  const initialType = (DOC_TYPES.find((t) => t.value === doc.document_type)?.value ??
    "other") as EditableDocType;
  const initialStatus = (STATUSES.find(
    (s) => s.value === (doc.status ?? "current").toLowerCase(),
  )?.value ?? "current") as EditableStatus;

  const [title, setTitle] = useState(doc.title ?? "");
  const [docType, setDocType] = useState<EditableDocType>(initialType);
  const [status, setStatus] = useState<EditableStatus>(initialStatus);
  const [signedDate, setSignedDate] = useState(doc.signed_date ?? "");
  const [expirationDate, setExpirationDate] = useState(doc.expiration_date ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const res = await upsertEstateDocument({
        data: {
          id: doc.id,
          document_type: docType,
          title: title.trim(),
          status,
          signed_date: signedDate || null,
          expiration_date: expirationDate || null,
        },
      });
      if (!res.ok) {
        toast.error(res.error ?? "Couldn't save changes");
        return;
      }
      toast.success("Document updated");
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await deleteEstateDocument({ data: { id: doc.id } });
      if (!res.ok) {
        toast.error(res.error ?? "Couldn't delete document");
        return;
      }
      toast.success("Document deleted");
      await onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <form
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-white/[0.06] bg-background p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="label-mono">Edit document</p>
            <p className="mt-1 font-serif text-lg text-foreground">Update details</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Title">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/40"
              placeholder="e.g. Last Will & Testament"
              autoFocus
            />
          </Field>

          <Field label="Type">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as EditableDocType)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/40"
            >
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value} className="bg-background">
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <div className="grid grid-cols-3 gap-2">
              {STATUSES.map((s) => {
                const active = s.value === status;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatus(s.value)}
                    className={`rounded-xl border px-2 py-2 text-xs transition-colors ${
                      active
                        ? "border-primary/50 bg-primary/15 text-foreground"
                        : "border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Signed">
              <input
                type="date"
                value={signedDate}
                onChange={(e) => setSignedDate(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/40"
              />
            </Field>
            <Field label="Expires">
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/40"
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground hover:bg-white/[0.06]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || deleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-full gradient-violet px-4 py-2.5 text-sm font-medium text-foreground glow-violet disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>

        <div className="mt-3 border-t border-white/[0.04] pt-3">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <p className="flex-1 text-xs text-muted-foreground">
                Delete this document? This cannot be undone.
              </p>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-foreground hover:bg-white/[0.06] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-full bg-destructive/15 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/25 disabled:opacity-60"
              >
                {deleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={saving}
              className="flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete document
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-mono mb-1.5 block">{label}</span>
      {children}
    </label>
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

function PropertyCard({
  property,
  valuation,
  delay = 0,
  onValuationSaved,
}: {
  property: Property;
  valuation: Valuation | null;
  delay?: number;
  onValuationSaved?: () => void | Promise<void>;
}) {
  const [running, setRunning] = useState(false);
  const value = Number(property.estimated_value) || 0;
  const mortgage = Number(property.mortgage_balance) || 0;
  const equity = Math.max(0, value - mortgage);
  const ltv = value > 0 ? Math.min(100, Math.round((mortgage / value) * 100)) : 0;
  const aiDelta = valuation ? valuation.estimated_value - value : 0;
  const aiDeltaPct = value > 0 && valuation ? (aiDelta / value) * 100 : 0;
  const confidence = (valuation?.confidence ?? "").toLowerCase();
  const confidenceStyle: Record<string, string> = {
    high: "bg-success/15 text-success",
    medium: "bg-primary/15 text-primary",
    low: "bg-warning/15 text-warning",
  };
  const source = (valuation?.source ?? "ai").toLowerCase();
  const isRentCast = source === "rentcast";

  async function runRentCast() {
    setRunning(true);
    try {
      const res = await estimatePropertyValueRentCast({
        data: {
          address: property.address,
          beds: property.beds,
          baths: property.baths,
          sqft: property.sqft,
        },
      });
      if (!res.ok || !res.valuation) {
        toast.error(res.error ?? "Couldn't get RentCast valuation");
        return;
      }
      const saved = await savePropertyValuation({
        data: {
          property_id: property.id,
          valuation: res.valuation,
          input_address: property.address,
          input_beds: property.beds,
          input_baths: property.baths,
          input_sqft: property.sqft,
          source: "rentcast",
        },
      });
      if (!saved.ok) {
        toast.error(saved.error ?? "Couldn't save valuation");
        return;
      }
      toast.success(
        `RentCast: ${fmtCurrency(res.valuation.estimated_value, { compact: true })}`,
      );
      await onValuationSaved?.();
    } finally {
      setRunning(false);
    }
  }

  return (
    <LuxCard delay={delay} className="overflow-hidden">
      {/* Photo */}
      <div className="relative h-40 w-full overflow-hidden bg-white/[0.03]">
        {property.image_url ? (
          <img
            src={property.image_url}
            alt={property.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Home className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <p className="font-serif text-lg leading-tight text-foreground drop-shadow">
            {property.name}
          </p>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{property.address}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-white/[0.04] border-t border-white/[0.04]">
        <div className="px-3 py-3">
          <p className="label-mono">Value</p>
          <p className="mt-0.5 font-mono text-sm tabular-nums text-foreground">
            {fmtCurrency(value, { compact: true })}
          </p>
        </div>
        <div className="px-3 py-3">
          <p className="label-mono">Equity</p>
          <p className="mt-0.5 font-mono text-sm tabular-nums text-foreground">
            {fmtCurrency(equity, { compact: true })}
          </p>
        </div>
        <div className="px-3 py-3">
          <p className="label-mono">LTV</p>
          <p className="mt-0.5 font-mono text-sm tabular-nums text-foreground">{ltv}%</p>
        </div>
      </div>

      {/* Beds / baths / sqft chip row */}
      {(property.beds || property.baths || property.sqft) && (
        <div className="flex flex-wrap gap-2 border-t border-white/[0.04] px-4 py-2.5">
          {property.beds ? (
            <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              {property.beds} bed
            </span>
          ) : null}
          {property.baths ? (
            <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              {property.baths} bath
            </span>
          ) : null}
          {property.sqft ? (
            <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              {Number(property.sqft).toLocaleString()} sqft
            </span>
          ) : null}
        </div>
      )}

      {/* Latest valuation block */}
      {valuation ? (
        <div className="border-t border-white/[0.04] bg-primary/[0.04] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <p className="label-mono">
                {isRentCast ? "RentCast AVM (live)" : "AI valuation"}
              </p>
            </div>
            {confidence ? (
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                  confidenceStyle[confidence] ?? "bg-muted/40 text-muted-foreground"
                }`}
              >
                {confidence} confidence
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <p className="font-serif text-xl text-foreground">
              {fmtCurrency(valuation.estimated_value, { compact: true })}
            </p>
            <p
              className={`font-mono text-[11px] ${
                aiDelta >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {aiDelta >= 0 ? "+" : ""}
              {fmtCurrency(aiDelta, { compact: true })} ({aiDeltaPct >= 0 ? "+" : ""}
              {aiDeltaPct.toFixed(1)}%) vs entered
            </p>
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            Range {fmtCurrency(valuation.value_low, { compact: true })}–
            {fmtCurrency(valuation.value_high, { compact: true })}
            {valuation.price_per_sqft ? ` · $${Math.round(valuation.price_per_sqft)}/sqft` : ""}
          </p>
          {valuation.market_summary ? (
            <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
              {valuation.market_summary}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Action buttons */}
      <div className="flex items-center gap-2 border-t border-white/[0.04] px-4 py-3">
        <button
          type="button"
          onClick={runRentCast}
          disabled={running}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full gradient-violet px-3 py-2 text-[11px] font-medium text-foreground glow-violet disabled:opacity-60"
        >
          {running ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {running ? "Fetching live comps…" : valuation ? "Refresh RentCast valuation" : "Get live RentCast valuation"}
        </button>
      </div>
    </LuxCard>
  );
}
