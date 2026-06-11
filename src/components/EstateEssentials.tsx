import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Scroll, Upload, Users, Sparkles, Loader2, ChevronRight, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { LuxCard } from "@/components/LuxCard";
import { fmtCurrency } from "@/lib/format";
import {
  listEstateDocuments,
  listInsurancePolicies,
  upsertEstateDocument,
  uploadWealthDocument,
} from "@/lib/wealth.functions";

type EstateDoc = {
  id: string;
  document_type: string;
  title: string;
  status: string | null;
  signed_date: string | null;
  expiration_date: string | null;
  document_path: string | null;
  document_url: string | null;
  created_at: string;
};

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
  total: number;
  allocations: Array<{ source: string; amount: number }>;
  fromAi: boolean;
};

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

export function EstateEssentials() {
  const [docs, setDocs] = useState<EstateDoc[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [d, p] = await Promise.all([listEstateDocuments(), listInsurancePolicies()]);
      setDocs((d.documents ?? []) as EstateDoc[]);
      setPolicies((p.policies ?? []) as Policy[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const latestWill = useMemo(() => {
    const wills = docs.filter((d) => d.document_type === "will");
    if (wills.length === 0) return null;
    return [...wills].sort((a, b) => {
      const ad = a.signed_date ?? a.created_at;
      const bd = b.signed_date ?? b.created_at;
      return new Date(bd).getTime() - new Date(ad).getTime();
    })[0];
  }, [docs]);

  const beneficiaries: DerivedBeneficiary[] = useMemo(() => {
    const map = new Map<string, DerivedBeneficiary>();
    for (const p of policies) {
      const list = Array.isArray(p.beneficiaries)
        ? (p.beneficiaries as unknown[]).map((x) => String(x).trim()).filter(Boolean)
        : [];
      if (list.length === 0) continue;
      const coverage = Number(p.coverage_amount) || 0;
      const share = coverage / list.length;
      for (const name of list) {
        const key = name.toLowerCase();
        const source = `${p.insurer_name} · ${p.policy_type}`;
        const existing = map.get(key);
        if (existing) {
          existing.total += share;
          existing.allocations.push({ source, amount: share });
          if (p.parsed_by_ai) existing.fromAi = true;
        } else {
          map.set(key, {
            name,
            initials: initialsOf(name),
            total: share,
            allocations: [{ source, amount: share }],
            fromAi: !!p.parsed_by_ai,
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [policies]);

  const totalEstate = beneficiaries.reduce((s, b) => s + b.total, 0);

  async function handleUploadWill(file: File) {
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File too large (max 15MB)");
      return;
    }
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const up = await uploadWealthDocument({
        data: {
          folder: "estate",
          fileName: file.name,
          base64,
          mimeType: file.type || "application/octet-stream",
        },
      });
      if (!up.ok) {
        toast.error(up.error ?? "Upload failed");
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      const res = await upsertEstateDocument({
        data: {
          document_type: "will",
          title: file.name.replace(/\.[^.]+$/, "") || "Last Will & Testament",
          status: "current",
          signed_date: today,
          document_path: up.path,
          document_url: up.url,
        },
      });
      if (!res.ok) {
        toast.error(res.error ?? "Saved file but couldn't record document");
        return;
      }
      toast.success("Will uploaded");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="mt-5 space-y-4 px-5">
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUploadWill(f);
        }}
      />

      {/* Will card */}
      <div>
        <p className="label-mono mb-2">Will & estate plan</p>
        <LuxCard className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Scroll className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              {loading ? (
                <div className="flex h-10 items-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : latestWill ? (
                <>
                  <p className="truncate font-serif text-lg text-foreground">{latestWill.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last updated {fmtDate(latestWill.signed_date) ?? fmtDate(latestWill.created_at)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                        latestWill.status === "expired"
                          ? "bg-destructive/15 text-destructive"
                          : latestWill.status === "needs_review"
                            ? "bg-warning/15 text-warning"
                            : "bg-primary/15 text-primary"
                      }`}
                    >
                      {(latestWill.status ?? "current").replace("_", " ")}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-serif text-lg text-foreground">No will on file</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Upload your most recent will so your family can find it instantly.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {latestWill ? "Upload new version" : "Upload will"}
            </button>
            {latestWill?.document_url ? (
              <a
                href={latestWill.document_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-medium text-foreground transition hover:bg-white/[0.06]"
              >
                <FileText className="h-3.5 w-3.5" />
                View current
              </a>
            ) : null}
            <Link
              to="/legacy"
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-medium text-foreground transition hover:bg-white/[0.06]"
            >
              Manage estate plan
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </LuxCard>
      </div>

      {/* Beneficiaries card */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="label-mono">Beneficiaries</p>
          {totalEstate > 0 && (
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Total {fmtCurrency(totalEstate, { compact: true })}
            </p>
          )}
        </div>
        <LuxCard className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : beneficiaries.length === 0 ? (
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gold/15 text-gold">
                <Users className="h-5 w-5" />
              </div>
              <p className="font-serif text-base text-foreground">No beneficiaries yet</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Add an insurance policy on Connections to populate this list automatically.
              </p>
              <Link
                to="/connections"
                className="mt-3 inline-flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1.5 text-xs font-medium text-gold"
              >
                Add a policy <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {beneficiaries.map((b) => {
                const pct = totalEstate > 0 ? (b.total / totalEstate) * 100 : 0;
                return (
                  <div key={b.name} className="rounded-xl bg-white/[0.03] p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-violet text-sm font-medium text-foreground">
                        {b.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-serif text-sm text-foreground">{b.name}</p>
                          {b.fromAi && (
                            <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gold">
                              <Sparkles className="h-2.5 w-2.5" /> AI
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {b.allocations.length}{" "}
                          {b.allocations.length === 1 ? "policy" : "policies"}
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
                    <div className="mt-2 flex flex-col gap-1">
                      {b.allocations.map((a, idx) => (
                        <div
                          key={`${a.source}-${idx}`}
                          className="flex items-center justify-between text-[11px]"
                        >
                          <p className="truncate text-muted-foreground">{a.source}</p>
                          <p className="font-mono tabular-nums text-foreground">
                            {fmtCurrency(a.amount, { compact: true })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <Link
                to="/beneficiaries"
                className="mt-1 inline-flex items-center justify-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-medium text-foreground transition hover:bg-white/[0.06]"
              >
                Open full beneficiary view
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </LuxCard>
      </div>
    </div>
  );
}
