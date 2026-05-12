import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  TrendingUp,
  Users,
  CreditCard,
  Search,
  Gift,
  X,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Trash2,
  Undo2,
  Flame,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAccess } from "@/lib/access-context";
import {
  adminGetMetrics,
  adminListMembers,
  adminGrantAccess,
  adminRevokeAccess,
  adminSetRole,
  adminScheduleAccountDeletion,
  adminCancelAccountDeletion,
  adminPurgeAccountNow,
  checkAccess,
} from "@/lib/access.functions";
import { fmtCurrency } from "@/lib/format";
import { toast } from "sonner";
import { redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Æther Wealth" },
      { name: "description", content: "Operations console for revenue, members, and access." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  // Server-side guard: prevent the admin page shell from being served to
  // anyone who isn't an authenticated admin. Defense in depth — server
  // functions also independently enforce requireAdmin().
  beforeLoad: async () => {
    const result = await checkAccess();
    if (!result.authenticated) {
      throw redirect({ to: "/signin" });
    }
    if (!result.isAdmin) {
      throw redirect({ to: "/" });
    }
  },
  component: AdminPage,
});

type Metrics = Awaited<ReturnType<typeof adminGetMetrics>>;
type Members = Awaited<ReturnType<typeof adminListMembers>>["members"];

function AdminPage() {
  const auth = useAuth();
  const access = useAccess();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [members, setMembers] = useState<Members>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Redirect non-admins
  useEffect(() => {
    if (auth.ready && !auth.user) navigate({ to: "/signin" });
  }, [auth.ready, auth.user, navigate]);
  useEffect(() => {
    if (access.ready && !access.isAdmin && auth.user) navigate({ to: "/" });
  }, [access.ready, access.isAdmin, auth.user, navigate]);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const [m, list] = await Promise.all([adminGetMetrics(), adminListMembers()]);
      setMetrics(m);
      setMembers(list.members);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load admin data";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (access.ready && access.isAdmin) load();
  }, [access.ready, access.isAdmin, load]);

  if (!access.ready || (access.ready && !access.isAdmin)) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  const filtered = members.filter((m) =>
    query.trim()
      ? (m.email ?? "").toLowerCase().includes(query.toLowerCase()) ||
        m.user_id.toLowerCase().includes(query.toLowerCase())
      : true,
  );

  return (
    <div className="min-h-[100dvh] bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/80 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
              aria-label="Back"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary/80">
                Operations
              </p>
              <h1 className="font-serif text-xl text-foreground">Admin Console</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/property-image-test"
              className="hidden sm:inline-flex items-center rounded-full border border-border/40 bg-background/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/30"
            >
              Image diagnostics
            </Link>
            <div className="flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-success">
                {metrics?.environment ?? "—"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 pt-8">
        {err && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> {err}
          </div>
        )}

        {/* KPI grid */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI
            label="MRR"
            value={metrics ? fmtCurrency(metrics.mrr) : "—"}
            icon={TrendingUp}
            tone="primary"
            loading={loading}
          />
          <KPI
            label="ARR"
            value={metrics ? fmtCurrency(metrics.arr) : "—"}
            icon={CreditCard}
            tone="gold"
            loading={loading}
          />
          <KPI
            label="Active subscribers"
            value={metrics ? String(metrics.activeSubscribers) : "—"}
            sub={metrics ? `${metrics.trialing} trialing` : ""}
            icon={Users}
            loading={loading}
          />
          <KPI
            label="Total users"
            value={metrics ? String(metrics.totalUsers) : "—"}
            sub={metrics ? `${metrics.churnedThisMonth} churned this month` : ""}
            icon={Users}
            loading={loading}
          />
        </section>

        {/* Members table */}
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Members
              </p>
              <h2 className="font-serif text-lg text-foreground">
                {filtered.length} of {members.length}
              </h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search email or id…"
                className="w-64 rounded-full border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    <th className="px-4 py-3 font-mono font-normal">Email</th>
                    <th className="px-4 py-3 font-mono font-normal">Plan</th>
                    <th className="px-4 py-3 font-mono font-normal">Status</th>
                    <th className="px-4 py-3 font-mono font-normal">Joined</th>
                    <th className="px-4 py-3 font-mono font-normal">Last sign-in</th>
                    <th className="px-4 py-3 text-right font-mono font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      </td>
                    </tr>
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        No members found.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    filtered.map((m) => (
                      <MemberRow
                        key={m.user_id}
                        m={m}
                        currentUserId={auth.user?.id ?? null}
                        onChanged={load}
                      />
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <FamilyLinkReviewSection />

        {/* Recent subs */}
        {metrics && metrics.recentSubscriptions.length > 0 && (
          <section className="mt-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Recent subscriptions
            </p>
            <h2 className="font-serif text-lg text-foreground">Latest 10</h2>
            <div className="mt-3 divide-y divide-white/[0.04] overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              {metrics.recentSubscriptions.map((s, i) => (
                <div
                  key={`${s.created_at}-${i}`}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <div>
                    <p className="text-foreground">{s.price_id ?? "—"}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {new Date(s.created_at ?? "").toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase ${
                      s.status === "active" || s.status === "trialing"
                        ? "bg-success/15 text-success"
                        : "bg-white/5 text-muted-foreground"
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function KPI({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof TrendingUp;
  tone?: "primary" | "gold";
  loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <Icon
          className={`h-4 w-4 ${tone === "gold" ? "text-gold" : tone === "primary" ? "text-primary" : "text-muted-foreground"}`}
          strokeWidth={1.6}
        />
      </div>
      <p className="mt-2 font-serif text-2xl text-foreground">
        {loading ? <span className="text-muted-foreground">…</span> : value}
      </p>
      {sub && <p className="mt-1 font-mono text-[10px] text-muted-foreground">{sub}</p>}
    </motion.div>
  );
}

function MemberRow({
  m,
  currentUserId,
  onChanged,
}: {
  m: Members[number];
  currentUserId: string | null;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const isSelf = currentUserId === m.user_id;

  const grant = async () => {
    setBusy(true);
    try {
      await adminGrantAccess({
        data: { userId: m.user_id, reason: "Comp from admin console" },
      });
      toast.success("Access granted");
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      await adminRevokeAccess({ data: { userId: m.user_id } });
      toast.success("Access revoked");
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleAdmin = async () => {
    setBusy(true);
    try {
      await adminSetRole({ data: { userId: m.user_id, makeAdmin: !m.is_admin } });
      toast.success(m.is_admin ? "Admin removed" : "Promoted to admin");
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const scheduleDelete = async () => {
    if (isSelf) {
      toast.error("You cannot schedule deletion of your own admin account");
      return;
    }
    const ok = window.confirm(
      `Delete ${m.email ?? "this account"}?\n\nThe account will be retained for 30 days and then permanently purged. You can cancel within that window.`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await adminScheduleAccountDeletion({ data: { userId: m.user_id } });
      const purgeDate = new Date(res.purgeAfter).toLocaleDateString();
      toast.success(`Deletion scheduled — purges ${purgeDate}`);
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const cancelDelete = async () => {
    if (isSelf) {
      toast.error("You cannot cancel deletion of your own admin account");
      return;
    }
    setBusy(true);
    try {
      await adminCancelAccountDeletion({ data: { userId: m.user_id } });
      toast.success("Deletion cancelled");
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const purgeNow = async () => {
    if (isSelf) {
      toast.error("You cannot purge your own admin account");
      return;
    }
    const label = m.email ?? "this account";
    const ok = window.confirm(
      `PERMANENTLY purge ${label}?\n\nThis immediately deletes ALL data and the auth user. This CANNOT be undone and skips the 30-day grace period.`,
    );
    if (!ok) return;
    const confirm2 = window.prompt(`Type the email to confirm:\n${label}`);
    if (!confirm2 || confirm2.trim().toLowerCase() !== (m.email ?? "").toLowerCase()) {
      toast.error("Email did not match — purge cancelled");
      return;
    }
    setBusy(true);
    try {
      await adminPurgeAccountNow({ data: { userId: m.user_id } });
      toast.success(`Purged ${label}`);
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const isPendingDeletion = !!m.pending_deletion_at;
  const daysRemaining = m.pending_purge_after
    ? Math.max(
        0,
        Math.ceil((new Date(m.pending_purge_after).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      )
    : 0;

  return (
    <tr
      className={`border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] ${
        isPendingDeletion ? "bg-destructive/[0.04]" : ""
      }`}
    >
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${isPendingDeletion ? "text-muted-foreground line-through" : "text-foreground"}`}>
            {m.email ?? "—"}
          </span>
          {m.is_admin && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-primary">
              Admin
            </span>
          )}
          {m.has_manual_access && (
            <span className="rounded-full bg-gold/15 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-gold">
              Comp
            </span>
          )}
          {isPendingDeletion && (
            <span className="rounded-full bg-destructive/15 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-destructive">
              Deleting · {daysRemaining}d
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{m.plan ?? "—"}</td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${
            m.status === "active" || m.status === "trialing"
              ? "bg-success/15 text-success"
              : m.status
                ? "bg-white/5 text-muted-foreground"
                : "bg-destructive/10 text-destructive"
          }`}
        >
          {m.status ?? "no plan"}
        </span>
      </td>
      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
        {new Date(m.created_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
        {m.last_sign_in_at ? new Date(m.last_sign_in_at).toLocaleDateString() : "—"}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
          {m.has_manual_access ? (
            <button
              onClick={revoke}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground disabled:opacity-50"
            >
              <X className="h-3 w-3" /> Revoke
            </button>
          ) : (
            <button
              onClick={grant}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-1 text-[11px] text-gold hover:bg-gold/20 disabled:opacity-50"
            >
              <Gift className="h-3 w-3" /> Comp
            </button>
          )}
          <button
            onClick={toggleAdmin}
            disabled={busy}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] disabled:opacity-50 ${
              m.is_admin
                ? "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            }`}
          >
            <ShieldCheck className="h-3 w-3" /> {m.is_admin ? "Demote" : "Make admin"}
          </button>
          {isPendingDeletion ? (
            <button
              onClick={cancelDelete}
              disabled={busy || isSelf}
              title={
                isSelf
                  ? "You cannot restore your own admin account"
                  : "Cancel scheduled deletion"
              }
              className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[11px] text-success hover:bg-success/20 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Undo2 className="h-3 w-3" /> Restore
            </button>
          ) : (
            <button
              onClick={scheduleDelete}
              disabled={busy || m.is_admin || isSelf}
              title={
                isSelf
                  ? "You cannot delete your own admin account"
                  : m.is_admin
                    ? "Demote admin before deleting"
                    : "Soft-delete (30-day grace)"
              }
              className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] text-destructive hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}
          <button
            onClick={purgeNow}
            disabled={busy || m.is_admin || isSelf}
            title={
              isSelf
                ? "You cannot purge your own admin account"
                : m.is_admin
                  ? "Demote admin before purging"
                  : "Permanently purge all data NOW (no grace period)"
            }
            className="inline-flex items-center gap-1 rounded-full bg-destructive/20 px-2.5 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/30 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Flame className="h-3 w-3" /> Purge
          </button>
          {isSelf && (
            <span className="ml-1 inline-flex items-center rounded-full bg-white/[0.04] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              You
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

function FamilyLinkReviewSection() {
  const [rows, setRows] = useState<any[]>([]);
  const [users, setUsers] = useState<Record<string, { email: string; name: string }>>({});
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const mod = await import("@/lib/family-links.functions");
      const res = await mod.adminListFamilyLinkRequests();
      setRows(res.requests as any[]);
      setUsers(res.users as Record<string, { email: string; name: string }>);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const review = async (id: string, action: "approve" | "decline") => {
    setActing(id);
    try {
      const notes =
        action === "decline"
          ? window.prompt("Reason for decline (optional)") ?? undefined
          : undefined;
      const mod = await import("@/lib/family-links.functions");
      await mod.adminReviewFamilyLinkRequest({ data: { id, action, notes } });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setActing(null);
    }
  };

  const pending = rows.filter((r) => r.status === "pending_admin");
  const recent = rows.filter((r) => r.status !== "pending_admin").slice(0, 8);

  return (
    <section className="mt-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Family link requests
      </p>
      <h2 className="font-serif text-lg text-foreground">
        {pending.length} awaiting review
      </h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        {loading ? (
          <div className="px-4 py-8 text-center text-muted-foreground">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          </div>
        ) : pending.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Nothing awaiting review.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {pending.map((r) => {
              const requester = users[r.requester_user_id];
              const recipient = r.recipient_user_id ? users[r.recipient_user_id] : null;
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-foreground">
                      {requester?.name || requester?.email || r.requester_user_id}
                      <span className="text-muted-foreground"> → </span>
                      {recipient?.name || recipient?.email || r.recipient_email}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      DOB match: {r.dob_match ? "yes" : "no"} · {new Date(r.created_at).toLocaleString()}
                    </p>
                    {r.message && (
                      <p className="mt-1 text-xs italic text-muted-foreground">"{r.message}"</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => review(r.id, "approve")}
                      disabled={acting === r.id}
                      className="rounded-full bg-success/15 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/25 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => review(r.id, "decline")}
                      disabled={acting === r.id}
                      className="rounded-full bg-destructive/15 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/25 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {recent.length > 0 && (
        <div className="mt-3 divide-y divide-white/[0.04] overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          {recent.map((r) => {
            const requester = users[r.requester_user_id];
            return (
              <div
                key={r.id}
                className="flex items-center justify-between px-4 py-2.5 text-xs text-muted-foreground"
              >
                <span className="truncate">
                  {(requester?.email || r.requester_user_id) + " → " + r.recipient_email}
                </span>
                <span className="font-mono uppercase tracking-wider">
                  {r.status.replace("_", " ")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
