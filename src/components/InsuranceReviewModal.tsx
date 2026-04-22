import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ShieldCheck, Loader2, AlertCircle } from "lucide-react";

export type InsuranceReviewDraft = {
  policy_type: string;
  insurer_name: string;
  policy_number: string | null;
  coverage_amount: number | null;
  premium_amount: number | null;
  premium_frequency: string;
  renewal_date: string | null;
  status: string;
  beneficiaries: string[];
  parsed_by_ai: boolean;
};

const POLICY_TYPES = [
  "life",
  "auto",
  "home",
  "umbrella",
  "health",
  "disability",
  "other",
];
const FREQS = ["monthly", "quarterly", "semi-annual", "annual", "unknown"];
const STATUSES = ["active", "pending", "renewal due", "expired"];

export function InsuranceReviewModal({
  open,
  initial,
  fileName,
  onClose,
  onSave,
  saving = false,
  error = null,
}: {
  open: boolean;
  initial: InsuranceReviewDraft | null;
  fileName?: string;
  onClose: () => void;
  onSave: (draft: InsuranceReviewDraft) => void | Promise<void>;
  saving?: boolean;
  error?: string | null;
}) {
  const [draft, setDraft] = useState<InsuranceReviewDraft | null>(initial);

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  if (!open || !draft) return null;

  const set = <K extends keyof InsuranceReviewDraft>(k: K, v: InsuranceReviewDraft[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.insurer_name.trim()) return;
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
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative max-h-[88vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="label-mono">Review extracted policy</p>
                  {draft.parsed_by_ai && (
                    <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gold">
                      <Sparkles className="h-2.5 w-2.5" /> AI
                    </span>
                  )}
                </div>
                <h2 className="mt-1 font-serif text-xl text-foreground">
                  Confirm before saving
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
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              We pulled these details from your document. Edit anything that
              looks off — nothing is saved until you tap{" "}
              <span className="font-medium text-foreground">Confirm & save</span>.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Policy type">
                  <Select
                    value={draft.policy_type}
                    onChange={(v) => set("policy_type", v)}
                    options={POLICY_TYPES}
                  />
                </Field>
                <Field label="Status">
                  <Select
                    value={draft.status}
                    onChange={(v) => set("status", v)}
                    options={STATUSES}
                  />
                </Field>
              </div>

              <Field label="Insurer">
                <Input
                  value={draft.insurer_name}
                  onChange={(v) => set("insurer_name", v)}
                  placeholder="e.g. Chubb"
                  required
                />
              </Field>

              <Field label="Policy number">
                <Input
                  value={draft.policy_number ?? ""}
                  onChange={(v) => set("policy_number", v || null)}
                  placeholder="Optional"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Coverage (USD)">
                  <NumberInput
                    value={draft.coverage_amount}
                    onChange={(v) => set("coverage_amount", v)}
                    placeholder="0"
                  />
                </Field>
                <Field label="Premium (USD)">
                  <NumberInput
                    value={draft.premium_amount}
                    onChange={(v) => set("premium_amount", v)}
                    placeholder="0"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Frequency">
                  <Select
                    value={draft.premium_frequency}
                    onChange={(v) => set("premium_frequency", v)}
                    options={FREQS}
                  />
                </Field>
                <Field label="Renewal date">
                  <Input
                    type="date"
                    value={draft.renewal_date ?? ""}
                    onChange={(v) => set("renewal_date", v || null)}
                  />
                </Field>
              </div>

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
                  disabled={saving || !draft.insurer_name.trim()}
                  className="flex flex-[1.4] items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground glow-violet disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    "Confirm & save"
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

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none"
    />
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step="0.01"
      min="0"
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") onChange(null);
        else {
          const n = Number(raw);
          onChange(Number.isFinite(n) ? n : null);
        }
      }}
      placeholder={placeholder}
      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 font-mono text-sm tabular-nums text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm capitalize text-foreground focus:border-primary/50 focus:outline-none"
    >
      {options.map((o) => (
        <option key={o} value={o} className="bg-background capitalize">
          {o}
        </option>
      ))}
    </select>
  );
}
