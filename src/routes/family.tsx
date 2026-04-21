import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronDown } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { family } from "@/lib/mock-data";
import { fmtCurrency } from "@/lib/format";

export const Route = createFileRoute("/family")({
  head: () => ({
    meta: [
      { title: "Family Vault — Æther Wealth" },
      { name: "description", content: "Linked accounts for every member of your family." },
    ],
  }),
  component: FamilyPage,
});

function FamilyPage() {
  const [open, setOpen] = useState<string | null>(family[0]?.id ?? null);
  const total = family.reduce((s, m) => s + m.netWorth, 0);

  return (
    <MobileShell title="Family Vault" subtitle="Linked households">
      <div className="px-5">
        <LuxCard className="gradient-hero p-5">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative">
            <p className="label-mono">Combined family net worth</p>
            <p className="mt-1 font-serif text-4xl text-foreground">{fmtCurrency(total, { compact: true })}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{family.length} linked members</p>
          </div>
        </LuxCard>
      </div>

      <div className="mt-5 flex items-center justify-between px-5">
        <p className="label-mono">Members</p>
        <button className="flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary">
          <Plus className="h-3 w-3" /> Add member
        </button>
      </div>

      <div className="mt-2 flex flex-col gap-2 px-5">
        {family.map((m, i) => {
          const isOpen = open === m.id;
          return (
            <LuxCard key={m.id} delay={i * 0.06} className="overflow-hidden">
              <button onClick={() => setOpen(isOpen ? null : m.id)} className="flex w-full items-center gap-3 px-4 py-4 text-left">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full gradient-violet text-sm font-medium text-foreground glow-violet">
                  {m.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-base text-foreground">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground">{m.relationship} · Age {m.age}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm tabular-nums text-foreground">{fmtCurrency(m.netWorth, { compact: true })}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{m.accounts.length} accounts</p>
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
                    <div className="border-t border-white/[0.06] px-4 py-3">
                      <p className="label-mono mb-2">Linked accounts</p>
                      <div className="flex flex-col gap-1.5">
                        {m.accounts.map((a) => (
                          <div key={a.name} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5">
                            <p className="text-xs text-foreground">{a.name}</p>
                            <p className="font-mono text-xs tabular-nums text-foreground">{fmtCurrency(a.balance, { compact: true })}</p>
                          </div>
                        ))}
                      </div>
                      <button className="mt-3 w-full rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-foreground">
                        View {m.name.split(" ")[0]}'s profile
                      </button>
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
