import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronDown, Pencil, Trash2, X, UserPlus, Check, Clock, ShieldCheck, Unlink, Scroll, Users, ChevronRight } from "lucide-react";
import { z } from "zod";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { EstateEssentials } from "@/components/EstateEssentials";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { fmtCurrency } from "@/lib/format";
import { listFamilyMembers, upsertFamilyMember, deleteFamilyMember } from "@/lib/family.functions";
import {
  createFamilyLinkRequest,
  listMyFamilyLinkRequests,
  respondFamilyLinkRequest,
  cancelFamilyLinkRequest,
  listLinkedPartnersWealth,
  removeFamilyLink,
  getMyIdentity,
  setMyIdentity,
} from "@/lib/family-links.functions";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useAccess } from "@/lib/access-context";
import { UpgradeWall } from "@/components/UpgradeWall";

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
  const { tier, limits } = useAccess();
  const familyLocked = limits.maxFamilyMembers === 0;
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [showForm, setShowForm] = useState(false);

  type Partner = {
    user_id: string;
    name: string;
    email: string;
    net_worth: number;
    accounts: Array<{ name: string; balance: number; type: string | null }>;
  };
  type LinkRequest = {
    id: string;
    requester_user_id: string;
    recipient_email: string;
    recipient_dob: string;
    recipient_user_id: string | null;
    status: string;
    message: string | null;
    admin_notes: string | null;
    created_at: string;
  };

  const [partners, setPartners] = useState<Partner[]>([]);
  const [outgoing, setOutgoing] = useState<LinkRequest[]>([]);
  const [incoming, setIncoming] = useState<LinkRequest[]>([]);
  const [requesterNames, setRequesterNames] = useState<Record<string, { name: string; email: string }>>({});
  const [linksLoading, setLinksLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [dobOnFile, setDobOnFile] = useState<string | null>(null);
  const [hasSsn4OnFile, setHasSsn4OnFile] = useState(false);
  const [showDobEdit, setShowDobEdit] = useState(false);
  const [selfNetWorth, setSelfNetWorth] = useState(0);

  const partnersTotal = partners.reduce((s, p) => s + Number(p.net_worth || 0), 0);
  const manualTotal = members.reduce((s, m) => s + Number(m.net_worth || 0), 0);
  const total = manualTotal + partnersTotal + (partners.length > 0 ? selfNetWorth : 0);

  const load = async () => {
    if (!user) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { members: rows } = await listFamilyMembers();
      const normalized = (rows ?? []).map((r: any) => ({
        ...r,
        accounts: Array.isArray(r.accounts) ? r.accounts : [],
      })) as FamilyMember[];
      setMembers(normalized);
      if (normalized.length && !open) setOpen(normalized[0].id);
    } catch {
      toast.error("Failed to load family members");
    } finally {
      setLoading(false);
    }
  };

  const loadLinks = async () => {
    if (!user) {
      setPartners([]);
      setOutgoing([]);
      setIncoming([]);
      setLinksLoading(false);
      return;
    }
    setLinksLoading(true);
    try {
      const [linkedRes, reqs, ident] = await Promise.all([
        listLinkedPartnersWealth(),
        listMyFamilyLinkRequests(),
        getMyIdentity(),
      ]);
      setPartners(linkedRes.partners as Partner[]);
      setSelfNetWorth(Number((linkedRes as any)?.self?.net_worth ?? 0));
      setOutgoing(reqs.outgoing as LinkRequest[]);
      setIncoming(reqs.incoming as LinkRequest[]);
      setRequesterNames(reqs.requesterNames as Record<string, { name: string; email: string }>);
      setDobOnFile(ident.date_of_birth);
      setHasSsn4OnFile(!!ident.has_ssn4);
    } catch (e) {
      console.error(e);
    } finally {
      setLinksLoading(false);
    }
  };

  useEffect(() => {
    if (ready) {
      load();
      loadLinks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.id]);

  // Refresh combined totals whenever the tab regains focus
  useEffect(() => {
    if (!ready) return;
    const onFocus = () => {
      load();
      loadLinks();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.id]);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this family member?")) return;
    try {
      await deleteFamilyMember({ data: { id } });
      toast.success("Member removed");
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    }
  };

  const handleRespond = async (id: string, action: "accept" | "decline") => {
    try {
      await respondFamilyLinkRequest({ data: { id, action } });
      toast.success(action === "accept" ? "Accepted — sent for review" : "Declined");
      await loadLinks();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not respond");
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this request?")) return;
    try {
      await cancelFamilyLinkRequest({ data: { id } });
      toast.success("Cancelled");
      await loadLinks();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel");
    }
  };

  const handleUnlink = async (partnerId: string) => {
    if (!confirm("Remove this linked account? Their data will no longer appear in your vault.")) return;
    try {
      await removeFamilyLink({ data: { partner_user_id: partnerId } });
      toast.success("Unlinked");
      await loadLinks();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not unlink");
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
    <MobileShell title="Family Vault" subtitle="Will, beneficiaries & linked households">
      {/* Will & Beneficiaries — surfaced first */}
      <EstateEssentials />


      {/* Linked accounts (cross-account requests) */}
      <div className="mt-5 flex items-center justify-between px-5">
        <p className="label-mono">Linked accounts</p>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/25"
        >
          <UserPlus className="h-3 w-3" /> Send link request
        </button>
      </div>

      <div className="mt-2 flex flex-col gap-2 px-5">
        <button
          onClick={() => setShowDobEdit(true)}
          className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left text-[11px] text-muted-foreground hover:bg-white/[0.04]"
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3" />
            Identity on file (DOB · SSN last 4)
          </span>
          <span className="font-mono text-foreground">
            {dobOnFile && hasSsn4OnFile
              ? `${dobOnFile} · ••••`
              : "Not set — tap to add"}
          </span>
        </button>

        {linksLoading ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">Loading…</p>
        ) : (
          <>
            {incoming
              .filter((r) => r.status === "pending_recipient")
              .map((r) => {
                const who = requesterNames[r.requester_user_id];
                return (
                  <LuxCard key={r.id} className="p-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-primary">Incoming request</p>
                      <p className="mt-0.5 font-serif text-base text-foreground">{who?.name ?? "Someone"}</p>
                      <p className="text-[11px] text-muted-foreground">{who?.email}</p>
                      {r.message && <p className="mt-2 text-xs italic text-muted-foreground">"{r.message}"</p>}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => handleRespond(r.id, "accept")} className="flex-1">
                        <Check className="h-3 w-3 mr-1" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRespond(r.id, "decline")}
                        className="flex-1"
                      >
                        Decline
                      </Button>
                    </div>
                  </LuxCard>
                );
              })}

            {partners.map((p, i) => (
              <LuxCard key={p.user_id} delay={i * 0.05} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full gradient-violet text-sm font-medium text-foreground glow-violet">
                    {(p.name || "?")
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((s) => s[0]?.toUpperCase())
                      .join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-base text-foreground truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">Linked · {p.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm tabular-nums text-foreground">
                      {fmtCurrency(Number(p.net_worth || 0), { compact: true })}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {p.accounts.length} account{p.accounts.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                {p.accounts.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1.5">
                    {p.accounts.map((a, idx) => (
                      <div
                        key={`${a.name}-${idx}`}
                        className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2"
                      >
                        <p className="text-xs text-foreground truncate">{a.name}</p>
                        <p className="font-mono text-xs tabular-nums text-foreground">
                          {fmtCurrency(Number(a.balance || 0), { compact: true })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => handleUnlink(p.user_id)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-[11px] font-medium text-destructive hover:bg-destructive/20"
                >
                  <Unlink className="h-3 w-3" /> Unlink
                </button>
              </LuxCard>
            ))}

            {outgoing
              .filter((r) => r.status === "pending_recipient" || r.status === "pending_admin")
              .map((r) => (
                <LuxCard key={r.id} className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {r.status === "pending_recipient" ? "Awaiting recipient" : "Awaiting admin review"}
                      </p>
                      <p className="text-sm text-foreground truncate">{r.recipient_email}</p>
                    </div>
                    <button
                      onClick={() => handleCancel(r.id)}
                      className="rounded-full border border-white/[0.08] px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </LuxCard>
              ))}

            {!incoming.some((r) => r.status === "pending_recipient") &&
              partners.length === 0 &&
              outgoing.length === 0 && (
                <LuxCard className="p-5 text-center">
                  <p className="font-serif text-sm text-foreground">No linked accounts yet</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Send a request to a spouse or family member with their own account to combine net worth.
                  </p>
                </LuxCard>
              )}
          </>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between px-5">
        <div>
          <p className="label-mono">Manual members</p>
          {limits.maxFamilyMembers != null && limits.maxFamilyMembers > 0 && (
            <p className="font-mono text-[10px] text-muted-foreground">
              {members.length}/{limits.maxFamilyMembers} on your plan
            </p>
          )}
        </div>
        {!familyLocked && (
          <button
            onClick={openAdd}
            disabled={
              limits.maxFamilyMembers != null && members.length >= limits.maxFamilyMembers
            }
            className="flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/25 disabled:opacity-50"
          >
            <Plus className="h-3 w-3" /> Add member
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-2 px-5 pb-6">
        {familyLocked ? (
          <UpgradeWall
            minTier="private"
            feature="Family Vault"
            description="Track a spouse, children, and dependents on a single household net worth — with optional invite-based linking."
            perks={[
              "Up to 5 manual members on Private, unlimited on Family Office",
              "Combined household net worth at a glance",
              "Invite spouse to securely link their accounts",
              "Per-member account breakdowns",
            ]}
            fullPage={false}
          >
            <></>
          </UpgradeWall>
        ) : loading ? (
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
          <>
            {limits.maxFamilyMembers != null &&
              members.length >= limits.maxFamilyMembers && (
                <LuxCard className="border border-warning/30 bg-warning/5 p-4">
                  <p className="font-serif text-sm text-foreground">
                    You've reached your {limits.maxFamilyMembers}-member limit
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Upgrade to Family Office for unlimited family members and full white label.
                  </p>
                  <Link
                    to="/pricing"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
                  >
                    Upgrade to Family Office
                  </Link>
                </LuxCard>
              )}
            {members.map((m, i) => {
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
            })}
          </>
        )}
      </div>

      {/* Combined family net worth — summary at the bottom */}
      <div className="mt-5 px-5 pb-6">
        <LuxCard className="gradient-hero p-5">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative">
            <p className="label-mono">Combined family net worth</p>
            <p className="mt-1 font-serif text-4xl text-foreground">{fmtCurrency(total, { compact: true })}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {partners.length > 0 ? "you + " : ""}{partners.length} linked · {members.length} manual
            </p>
          </div>
        </LuxCard>
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

      <InviteLinkDialog
        open={showInvite}
        onOpenChange={setShowInvite}
        onSent={async () => {
          setShowInvite(false);
          await loadLinks();
        }}
      />

      <DobEditDialog
        open={showDobEdit}
        onOpenChange={setShowDobEdit}
        currentDob={dobOnFile}
        onSaved={async (v) => {
          setDobOnFile(v);
          setHasSsn4OnFile(true);
          setShowDobEdit(false);
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
    try {
      const { member } = await upsertFamilyMember({
        data: {
          id: editing?.id,
          name: parsed.data.name,
          relationship: parsed.data.relationship,
          age: parsed.data.age,
          net_worth: parsed.data.net_worth,
          initials: initialsOf(parsed.data.name),
          accounts: cleanAccounts,
        },
      });
      setSaving(false);
      toast.success(editing ? "Member updated" : "Member added");
      onSaved({
        ...(member as any),
        accounts: Array.isArray((member as any).accounts) ? (member as any).accounts : [],
      });
    } catch (e) {
      setSaving(false);
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
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

function InviteLinkDialog({
  open,
  onOpenChange,
  onSent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSent: () => void | Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [ssn4, setSsn4] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setDob("");
      setSsn4("");
      setMessage("");
    }
  }, [open]);

  const handleSend = async () => {
    const parsed = z
      .object({
        email: z.string().trim().toLowerCase().email("Enter a valid email"),
        dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date of birth"),
        ssn4: z.string().regex(/^\d{4}$/, "Last 4 of SSN must be 4 digits"),
      })
      .safeParse({ email, dob, ssn4 });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSending(true);
    try {
      const res = await createFamilyLinkRequest({
        data: {
          recipient_email: parsed.data.email,
          recipient_dob: parsed.data.dob,
          recipient_ssn4: parsed.data.ssn4,
          message: message.trim() ? message.trim() : undefined,
        },
      });
      toast.success(
        res.recipient_has_account
          ? "Request sent — they'll see it when they sign in"
          : "Request saved — they'll need to create an account to accept",
      );
      await onSent();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send link request</DialogTitle>
          <DialogDescription>
            Combine net worth with a spouse or family member. They'll need to accept and Æther Wealth
            management will review before the link goes live.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="link-email">Their email</Label>
            <Input
              id="link-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              maxLength={255}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="link-dob">Their date of birth</Label>
            <Input id="link-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="link-ssn">Their SSN (last 4)</Label>
            <Input
              id="link-ssn"
              inputMode="numeric"
              maxLength={4}
              value={ssn4}
              onChange={(e) => setSsn4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="1234"
            />
            <p className="text-[11px] text-muted-foreground">
              DOB and last 4 of SSN must both match what they have on file.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="link-msg">Message (optional)</Label>
            <Textarea
              id="link-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hey love, let's combine our vault."
              maxLength={500}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? "Sending…" : "Send request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DobEditDialog({
  open,
  onOpenChange,
  currentDob,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentDob: string | null;
  onSaved: (v: string) => void | Promise<void>;
}) {
  const [dob, setDob] = useState("");
  const [ssn4, setSsn4] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDob(currentDob ?? "");
      setSsn4("");
    }
  }, [open, currentDob]);

  const handleSave = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      toast.error("Pick a valid date");
      return;
    }
    if (!/^\d{4}$/.test(ssn4)) {
      toast.error("Enter the last 4 digits of your SSN");
      return;
    }
    setSaving(true);
    try {
      await setMyIdentity({ data: { date_of_birth: dob, ssn4 } });
      toast.success("Saved");
      await onSaved(dob);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Identity verification</DialogTitle>
          <DialogDescription>
            Required so we can confirm it's really you when someone sends a family link request.
            Your SSN last 4 is hashed before storage — we never keep the raw digits.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="dob-edit">Date of birth</Label>
            <Input id="dob-edit" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ssn-edit">SSN (last 4)</Label>
            <Input
              id="ssn-edit"
              inputMode="numeric"
              maxLength={4}
              value={ssn4}
              onChange={(e) => setSsn4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="1234"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
