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
} from "@/lib/access.functions";
import { fmtCurrency } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Æther Wealth" },
      { name: "description", content: "Operations console for revenue, members, and access." },
    ],
  }),
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
          <div className="flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-success">
              {metrics?.environment ?? "—"}
            </span>
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
                      <MemberRow key={m.user_id} m={m} onChanged={load} />
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

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

function MemberRow({ m, onChanged }: { m: Members[number]; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);

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

  return (
    <tr className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02]">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-foreground">{m.email ?? "—"}</span>
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
        <div className="inline-flex items-center gap-1.5">
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
        </div>
      </td>
    </tr>
  );
}
