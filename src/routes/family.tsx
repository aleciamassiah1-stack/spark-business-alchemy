import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronDown, Pencil, Trash2, X } from "lucide-react";
import { z } from "zod";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { fmtCurrency } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/family")({
  head: () => ({
    meta: [
      { title: "Family Vault — Æther Wealth" },
      { name: "description", content: "Linked accounts for every member of your family." },
    ],
  }),
  component: () => (
    <RequireOnboarding>
      <FamilyPage />
    </RequireOnboarding>
  ),
});

type AccountRow = { name: string; balance: number };
type FamilyMember = {
  id: string;
  name: string;
  relationship: string;
  age: number | null;
  initials: string | null;
  net_worth: number;
  iso_currency_code: string | null;
  accounts: AccountRow[];
};

const memberSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  relationship: z.string().trim().min(1, "Relationship is required").max(50),
  age: z.number().int().min(0).max(150).nullable(),
  net_worth: z.number().min(0).max(1_000_000_000_000),
});

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function FamilyPage() {
  const { user, ready } = useAuth();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [showForm, setShowForm] = useState(false);

  const total = members.reduce((s, m) => s + Number(m.net_worth || 0), 0);

  const load = async () => {
    if (!user) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("family_members")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Failed to load family members");
    } else {
      const rows = (data ?? []).map((r: any) => ({
        ...r,
        accounts: Array.isArray(r.accounts) ? r.accounts : [],
      })) as FamilyMember[];
      setMembers(rows);
      if (rows.length && !open) setOpen(rows[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.id]);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this family member?")) return;
    const { error } = await supabase.from("family_members").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete");
    } else {
      toast.success("Member removed");
      setMembers((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const openAdd = () => {
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (m: FamilyMember) => {
    setEditing(m);
    setShowForm(true);
  };

  return (
    <MobileShell title="Family Vault" subtitle="Linked households">
      <div className="px-5">
        <LuxCard className="gradient-hero p-5">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative">
            <p className="label-mono">Combined family net worth</p>
            <p className="mt-1 font-serif text-4xl text-foreground">{fmtCurrency(total, { compact: true })}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{members.length} linked members</p>
          </div>
        </LuxCard>
      </div>

      <div className="mt-5 flex items-center justify-between px-5">
        <p className="label-mono">Members</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/25"
        >
          <Plus className="h-3 w-3" /> Add member
        </button>
      </div>

      <div className="mt-2 flex flex-col gap-2 px-5 pb-6">
        {loading ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">Loading…</p>
        ) : members.length === 0 ? (
          <LuxCard className="p-6 text-center">
            <p className="font-serif text-base text-foreground">No family members yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a spouse, child, or dependent to track combined household wealth.
            </p>
            <button
              onClick={openAdd}
              className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
            >
              <Plus className="h-3 w-3" /> Add first member
            </button>
          </LuxCard>
        ) : (
          members.map((m, i) => {
            const isOpen = open === m.id;
            return (
              <LuxCard key={m.id} delay={i * 0.06} className="overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : m.id)}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full gradient-violet text-sm font-medium text-foreground glow-violet">
                    {m.initials || initialsOf(m.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-base text-foreground">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {m.relationship}
                      {m.age != null ? ` · Age ${m.age}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm tabular-nums text-foreground">
                      {fmtCurrency(Number(m.net_worth || 0), { compact: true })}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {m.accounts.length} account{m.accounts.length === 1 ? "" : "s"}
                    </p>
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
                        {m.accounts.length === 0 ? (
                          <p className="rounded-xl bg-white/[0.03] px-3 py-3 text-center text-[11px] text-muted-foreground">
                            No accounts linked yet
                          </p>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {m.accounts.map((a, idx) => (
                              <div
                                key={`${a.name}-${idx}`}
                                className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5"
                              >
                                <p className="text-xs text-foreground">{a.name}</p>
                                <p className="font-mono text-xs tabular-nums text-foreground">
                                  {fmtCurrency(Number(a.balance || 0), { compact: true })}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => openEdit(m)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-foreground transition hover:bg-white/[0.06]"
                          >
                            <Pencil className="h-3 w-3" /> Edit profile
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="flex items-center justify-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive transition hover:bg-destructive/20"
                            aria-label="Remove member"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </LuxCard>
            );
          })
        )}
      </div>

      <MemberFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        editing={editing}
        userId={user?.id ?? null}
        onSaved={(saved) => {
          setMembers((prev) => {
            const idx = prev.findIndex((p) => p.id === saved.id);
            if (idx === -1) return [...prev, saved];
            const next = [...prev];
            next[idx] = saved;
            return next;
          });
          setOpen(saved.id);
          setShowForm(false);
        }}
      />
    </MobileShell>
  );
}

function MemberFormDialog({
  open,
  onOpenChange,
  editing,
  userId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: FamilyMember | null;
  userId: string | null;
  onSaved: (m: FamilyMember) => void;
}) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [age, setAge] = useState<string>("");
  const [netWorth, setNetWorth] = useState<string>("");
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setRelationship(editing.relationship);
      setAge(editing.age != null ? String(editing.age) : "");
      setNetWorth(String(editing.net_worth ?? 0));
      setAccounts(editing.accounts ?? []);
    } else {
      setName("");
      setRelationship("");
      setAge("");
      setNetWorth("");
      setAccounts([]);
    }
  }, [open, editing]);

  const updateAccount = (i: number, patch: Partial<AccountRow>) => {
    setAccounts((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  };

  const handleSave = async () => {
    if (!userId) {
      toast.error("Please sign in first");
      return;
    }
    const parsed = memberSchema.safeParse({
      name,
      relationship,
      age: age === "" ? null : Number(age),
      net_worth: Number(netWorth || 0),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    const cleanAccounts = accounts
      .map((a) => ({ name: a.name.trim(), balance: Number(a.balance) || 0 }))
      .filter((a) => a.name.length > 0);

    setSaving(true);
    const payload = {
      user_id: userId,
      name: parsed.data.name,
      relationship: parsed.data.relationship,
      age: parsed.data.age,
      initials: initialsOf(parsed.data.name),
      net_worth: parsed.data.net_worth,
      accounts: cleanAccounts,
    };

    let result;
    if (editing) {
      result = await supabase
        .from("family_members")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
    } else {
      result = await supabase.from("family_members").insert(payload).select().single();
    }
    setSaving(false);

    if (result.error || !result.data) {
      toast.error(result.error?.message ?? "Save failed");
      return;
    }
    toast.success(editing ? "Member updated" : "Member added");
    onSaved({
      ...(result.data as any),
      accounts: Array.isArray((result.data as any).accounts) ? (result.data as any).accounts : [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit member" : "Add family member"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update their profile and linked accounts." : "Add a spouse, child, or dependent."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="m-name">Full name</Label>
            <Input id="m-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" maxLength={100} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="m-rel">Relationship</Label>
              <Input
                id="m-rel"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="Spouse"
                maxLength={50}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="m-age">Age</Label>
              <Input id="m-age" type="number" value={age} onChange={(e) => setAge(e.target.value)} min={0} max={150} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="m-nw">Net worth (USD)</Label>
            <Input
              id="m-nw"
              type="number"
              value={netWorth}
              onChange={(e) => setNetWorth(e.target.value)}
              placeholder="0"
              min={0}
            />
          </div>

          <div className="mt-2">
            <div className="mb-2 flex items-center justify-between">
              <Label>Linked accounts</Label>
              <button
                type="button"
                onClick={() => setAccounts((p) => [...p, { name: "", balance: 0 }])}
                className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-medium text-primary"
              >
                <Plus className="h-3 w-3" /> Add account
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {accounts.length === 0 ? (
                <p className="rounded-lg bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                  No accounts yet
                </p>
              ) : (
                accounts.map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={a.name}
                      onChange={(e) => updateAccount(i, { name: e.target.value })}
                      placeholder="Account name"
                      maxLength={80}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={a.balance}
                      onChange={(e) => updateAccount(i, { balance: Number(e.target.value) })}
                      placeholder="0"
                      className="w-32"
                    />
                    <button
                      type="button"
                      onClick={() => setAccounts((p) => p.filter((_, idx) => idx !== i))}
                      className="rounded-md p-1 text-muted-foreground hover:text-destructive"
                      aria-label="Remove account"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
