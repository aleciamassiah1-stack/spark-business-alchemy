import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, FileText, Loader2, AlertCircle, Check } from "lucide-react";
import { fmtCurrency } from "@/lib/format";

export type TaxReturnReviewDraft = {
  form_type: string;
  tax_year: number | null;
  business_name: string | null;
  revenue: number | null;
  net_profit: number | null;
  total_assets: number | null;
  total_liabilities: number | null;
  cost_of_goods_sold: number | null;
  total_expenses: number | null;
  depreciation: number | null;
  officer_compensation: number | null;
  notes: string | null;
  parsed_by_ai: boolean;
  // Per-field opt-in: whether the value should be applied to the business store
  apply: {
    revenue: boolean;
    net_profit: boolean;
    total_assets: boolean;
    total_liabilities: boolean;
  };
};

const FORM_TYPES = ["1120", "1120-S", "1065", "Schedule C", "1040", "other"];

type CurrentValues = {
  annualRevenue: number;
  netProfit: number;
  totalAssets: number;
  totalLiabilities: number;
};

export function TaxReturnReviewModal({
  open,
  initial,
  fileName,
  current,
  onClose,
  onSave,
  saving = false,
  error = null,
}: {
  open: boolean;
  initial: TaxReturnReviewDraft | null;
  fileName?: string;
  current: CurrentValues;
  onClose: () => void;
  onSave: (draft: TaxReturnReviewDraft) => void | Promise<void>;
  saving?: boolean;
  error?: string | null;
}) {
  const [draft, setDraft] = useState<TaxReturnReviewDraft | null>(initial);

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  if (!open || !draft) return null;

  const set = <K extends keyof TaxReturnReviewDraft>(k: K, v: TaxReturnReviewDraft[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const setApply = (k: keyof TaxReturnReviewDraft["apply"], v: boolean) =>
    setDraft((d) => (d ? { ...d, apply: { ...d.apply, [k]: v } } : d));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(draft);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-white/[0.08] bg-[oklch(0.16_0.025_280)] sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gold/30 blur-3xl" />
          <div className="relative max-h-[88vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="label-mono">Review extracted tax return</p>
                  {draft.parsed_by_ai && (
                    <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gold">
                      <Sparkles className="h-2.5 w-2.5" /> AI
                    </span>
                  )}
                </div>
                <h2 className="mt-1 font-serif text-xl text-foreground">
                  Confirm before applying
                </h2>
                {fileName && (
                  <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                    {fileName}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                disabled={saving}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] leading-relaxed text-muted-foreground">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
              We pulled these line items from your return. Toggle a row off to skip it,
              or edit any value before applying. Nothing changes until you tap{" "}
              <span className="font-medium text-foreground">Apply to business</span>.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Form">
                  <select
                    value={draft.form_type}
                    onChange={(e) => set("form_type", e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none"
                  >
                    {FORM_TYPES.map((t) => (
                      <option key={t} value={t} className="bg-background">
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tax year">
                  <NumberInput
                    value={draft.tax_year}
                    onChange={(v) => set("tax_year", v)}
                    placeholder="2024"
                    integer
                  />
                </Field>
              </div>

              <div className="space-y-2.5">
                <p className="label-mono pt-1">Apply these to your business</p>

                <ApplyRow
                  label="Annual revenue"
                  checked={draft.apply.revenue}
                  onCheck={(v) => setApply("revenue", v)}
                  current={current.annualRevenue}
                  value={draft.revenue}
                  onChange={(v) => set("revenue", v)}
                />
                <ApplyRow
                  label="Net profit"
                  checked={draft.apply.net_profit}
                  onCheck={(v) => setApply("net_profit", v)}
                  current={current.netProfit}
                  value={draft.net_profit}
                  onChange={(v) => set("net_profit", v)}
                />
                <ApplyRow
                  label="Total assets"
                  checked={draft.apply.total_assets}
                  onCheck={(v) => setApply("total_assets", v)}
                  current={current.totalAssets}
                  value={draft.total_assets}
                  onChange={(v) => set("total_assets", v)}
                  hint="Adds a single 'Tax Return — Assets' line so totals match"
                />
                <ApplyRow
                  label="Total liabilities"
                  checked={draft.apply.total_liabilities}
                  onCheck={(v) => setApply("total_liabilities", v)}
                  current={current.totalLiabilities}
                  value={draft.total_liabilities}
                  onChange={(v) => set("total_liabilities", v)}
                  hint="Adds a single 'Tax Return — Liabilities' line so totals match"
                />
              </div>

              <details className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  More extracted fields
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Field label="COGS">
                    <NumberInput
                      value={draft.cost_of_goods_sold}
                      onChange={(v) => set("cost_of_goods_sold", v)}
                    />
                  </Field>
                  <Field label="Total expenses">
                    <NumberInput
                      value={draft.total_expenses}
                      onChange={(v) => set("total_expenses", v)}
                    />
                  </Field>
                  <Field label="Depreciation">
                    <NumberInput
                      value={draft.depreciation}
                      onChange={(v) => set("depreciation", v)}
                    />
                  </Field>
                  <Field label="Officer comp">
                    <NumberInput
                      value={draft.officer_compensation}
                      onChange={(v) => set("officer_compensation", v)}
                    />
                  </Field>
                </div>
                {draft.notes && (
                  <p className="mt-3 rounded-lg bg-white/[0.03] p-2 text-[11px] leading-relaxed text-muted-foreground">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-gold">
                      AI note ·{" "}
                    </span>
                    {draft.notes}
                  </p>
                )}
              </details>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-[11px] text-destructive">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="flex-1 rounded-full border border-white/[0.08] bg-white/[0.02] py-3 text-sm font-medium text-foreground disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex flex-[1.4] items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground glow-violet disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Applying…
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Apply to business
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function ApplyRow({
  label,
  checked,
  onCheck,
  current,
  value,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onCheck: (v: boolean) => void;
  current: number;
  value: number | null;
  onChange: (v: number | null) => void;
  hint?: string;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 transition-colors ${
        checked
          ? "border-primary/40 bg-primary/5"
          : "border-white/[0.06] bg-white/[0.02] opacity-70"
      }`}
    >
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheck(e.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-white/5 accent-primary"
        />
        <span className="flex-1 text-[12px] font-medium text-foreground">{label}</span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          now {fmtCurrency(current, { compact: true })}
        </span>
      </label>
      <div className="mt-2 flex items-center gap-2">
        <span className="font-mono text-[10px] text-muted-foreground">→</span>
        <NumberInput value={value} onChange={onChange} placeholder="—" disabled={!checked} />
      </div>
      {hint && (
        <p className="mt-1.5 font-mono text-[9px] leading-snug text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  integer = false,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  integer?: boolean;
}) {
  return (
    <input
      type="number"
      inputMode={integer ? "numeric" : "decimal"}
      step={integer ? "1" : "0.01"}
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") onChange(null);
        else {
          const n = integer ? parseInt(raw, 10) : Number(raw);
          onChange(Number.isFinite(n) ? n : null);
        }
      }}
      placeholder={placeholder}
      className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 font-mono text-sm tabular-nums text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none disabled:opacity-50"
    />
  );
}
