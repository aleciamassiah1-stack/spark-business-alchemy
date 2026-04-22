import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type EntityType,
  seedFromQuickSetup,
  saveBusiness,
  loadBusiness,
} from "@/lib/business-store";

const entityOptions: EntityType[] = ["LLC", "S-Corp", "C-Corp", "Partnership", "Sole Prop"];

type Props = {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
};

// Bottom-sheet quick setup. Three fields, lives over the screen,
// slides up from the bottom in the dark luxury style.
export function BusinessQuickSetup({ open, onClose, onComplete }: Props) {
  const [name, setName] = useState("");
  const [entity, setEntity] = useState<EntityType>("LLC");
  const [revenueStr, setRevenueStr] = useState("");

  useEffect(() => {
    if (open) {
      const existing = loadBusiness();
      setName(existing.name ?? "");
      setEntity(existing.entityType ?? "LLC");
      setRevenueStr(existing.annualRevenue ? String(existing.annualRevenue) : "");
    }
  }, [open]);

  const submit = () => {
    if (!name.trim()) return;
    const annualRevenue = Number(revenueStr.replace(/[^0-9.]/g, "")) || 0;
    const next = seedFromQuickSetup({ name: name.trim(), entityType: entity, annualRevenue });
    saveBusiness(next);
    onComplete();
  };

  const skip = () => {
    const cur = loadBusiness();
    saveBusiness({ ...cur, setupComplete: true });
    onComplete();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[430px] rounded-t-3xl border-t border-white/[0.06] gradient-card p-6 pb-8 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.6)]"
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/10" />
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-violet glow-violet">
                <Briefcase className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="label-mono">Business</p>
                <h2 className="font-serif text-xl text-foreground">Set up your business</h2>
              </div>
            </div>

            <div className="space-y-4">
              <Field label="Business name">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Whitfield Ventures LLC"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
                />
              </Field>

              <Field label="Entity type">
                <div className="flex flex-wrap gap-2">
                  {entityOptions.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEntity(e)}
                      className={`rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-wide transition-colors ${
                        entity === e
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-white/[0.08] bg-white/[0.02] text-muted-foreground"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Annual revenue (or custom valuation)">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
                    $
                  </span>
                  <input
                    inputMode="numeric"
                    value={revenueStr}
                    onChange={(e) => setRevenueStr(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="500000"
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 pl-8 pr-4 font-mono text-sm tabular-nums text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
                  />
                </div>
                <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                  We&apos;ll estimate valuation at ~2.4× revenue. You can refine later.
                </p>
              </Field>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <Button
                onClick={submit}
                disabled={!name.trim()}
                className="h-11 w-full rounded-full gradient-violet font-medium glow-violet"
              >
                Set Up Business
              </Button>
              <button
                onClick={skip}
                className="text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 label-mono">{label}</p>
      {children}
    </div>
  );
}
