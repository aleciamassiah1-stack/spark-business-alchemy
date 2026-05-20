import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, RefreshCw, Loader2, CheckCircle2, Clock, Inbox, Eye, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useAccess } from "@/lib/access-context";
import { checkAccess } from "@/lib/access.functions";
import {
  listServiceRequests,
  updateServiceRequest,
} from "@/lib/service-requests.functions";
import { sendTransactionalEmail } from "@/lib/email/send";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/requests")({
  head: () => ({
    meta: [
      { title: "Service Requests — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async () => {
    const r = await checkAccess();
    if (!r.authenticated) throw redirect({ to: "/signin" });
    if (!r.isAdmin) throw redirect({ to: "/" });
  },
  component: AdminRequestsPage,
});

type Req = Awaited<ReturnType<typeof listServiceRequests>>["requests"][number];
type Filter = "all" | "new" | "in_progress" | "resolved";
type TypeFilter = "all" | "meeting" | "report" | "concierge" | "wealth_manager" | "other";
type SortKey = "newest" | "oldest";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  in_progress: "In progress",
  resolved: "Resolved",
};

const TYPE_LABEL: Record<string, string> = {
  meeting: "Meeting",
  report: "Report",
  concierge: "Concierge",
  wealth_manager: "Wealth manager",
  other: "Other",
};

function AdminRequestsPage() {
  const auth = useAuth();
  const access = useAccess();
  const [rows, setRows] = useState<Req[]>([]);
  const [filter, setFilter] = useState<Filter>("new");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Req | null>(null);

  const load = useCallback(async (f: Filter) => {
    setLoading(true);
    try {
      const r = await listServiceRequests({ data: { status: f } });
      setRows(r.requests as Req[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (access.ready && access.isAdmin) load(filter);
  }, [access.ready, access.isAdmin, filter, load]);

  // Realtime: refresh on any change
  useEffect(() => {
    if (!auth.user) return;
    const ch = supabase
      .channel("admin-service-requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_requests" },
        () => {
          load(filter);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [auth.user, filter, load]);

  const counts = useMemo(() => {
    const c = { new: 0, in_progress: 0, resolved: 0 };
    for (const r of rows) {
      if (r.status in c) c[r.status as keyof typeof c]++;
    }
    return c;
  }, [rows]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (!q) return true;
      const hay = [
        r.subject,
        r.user_email ?? "",
        r.admin_notes ?? "",
        JSON.stringify(r.body ?? {}),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    return filtered.sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sort === "newest" ? db - da : da - db;
    });
  }, [rows, typeFilter, search, sort]);

  async function setStatus(r: Req, status: "new" | "in_progress" | "resolved") {
    setBusyId(r.id);
    try {
      await updateServiceRequest({ data: { id: r.id, status } });
      toast.success(`Marked ${STATUS_LABEL[status].toLowerCase()}`);
      load(filter);
      if (selected?.id === r.id) setSelected({ ...selected, status });

      // Notify the requester by email (best-effort; don't block on failure).
      if (r.user_email && status !== "new") {
        try {
          await sendTransactionalEmail({
            templateName: "service-request-status-update",
            recipientEmail: r.user_email,
            idempotencyKey: `service-request-${r.id}-${status}`,
            templateData: {
              requestType: r.type,
              subject: r.subject,
              status,
              requestId: r.id,
              adminNotes: r.admin_notes ?? undefined,
            },
          });
        } catch (emailErr) {
          console.error("Failed to notify requester", emailErr);
          toast.error("Status updated, but email notification failed.");
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
              aria-label="Back"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary/80">
                Operations
              </p>
              <h1 className="font-serif text-xl text-foreground">Service Requests</h1>
            </div>
          </div>
          <button
            onClick={() => load(filter)}
            className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 pt-6">
        <div className="mb-4 flex flex-wrap gap-2">
          {(["new", "in_progress", "resolved", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "border border-border/40 bg-background/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : STATUS_LABEL[f]}
              {f !== "all" && ` · ${counts[f as keyof typeof counts] ?? 0}`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Inbox className="mb-3 h-8 w-8 opacity-50" />
            <p>No requests in this view.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {rows.map((r) => (
              <article
                key={r.id}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelected(r)}
                    className="min-w-0 flex-1 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
                        {r.type}
                      </span>
                      <StatusBadge status={r.status} />
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 truncate font-serif text-base text-foreground">
                      {r.subject}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {r.user_email ?? r.user_id}
                    </p>
                  </button>
                  <div className="flex shrink-0 gap-1.5">
                    <ActionBtn
                      onClick={() => setSelected(r)}
                      aria-label={`Open request ${r.subject}`}
                    >
                      <Eye className="h-3 w-3" /> Open
                    </ActionBtn>
                    {r.status !== "in_progress" && (
                      <ActionBtn
                        disabled={busyId === r.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatus(r, "in_progress");
                        }}
                      >
                        <Clock className="h-3 w-3" /> Working
                      </ActionBtn>
                    )}
                    {r.status !== "resolved" && (
                      <ActionBtn
                        disabled={busyId === r.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatus(r, "resolved");
                        }}
                      >
                        <CheckCircle2 className="h-3 w-3" /> Resolve
                      </ActionBtn>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-request-title"
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-background p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
                  {selected.type}
                </span>
                <StatusBadge status={selected.status} />
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/40 bg-background/40 text-muted-foreground hover:text-foreground"
                aria-label="Close request details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <h2 id="service-request-title" className="mb-1 font-serif text-2xl">{selected.subject}</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              From {selected.user_email ?? selected.user_id} ·{" "}
              {new Date(selected.created_at).toLocaleString()}
            </p>
            <pre className="whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-foreground/90">
              {JSON.stringify(selected.body, null, 2)}
            </pre>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setStatus(selected, "in_progress")}
                disabled={busyId === selected.id}
                className="rounded-full border border-border/40 bg-background/40 px-4 py-2 text-xs hover:text-foreground"
              >
                Mark in progress
              </button>
              <button
                onClick={() => setStatus(selected, "resolved")}
                disabled={busyId === selected.id}
                className="rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground"
              >
                Mark resolved
              </button>
              {selected.user_email && (
                <a
                  href={`mailto:${selected.user_email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                  className="ml-auto rounded-full border border-gold/30 bg-gold/5 px-4 py-2 text-xs text-gold"
                >
                  Reply by email
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "new"
      ? "bg-warning/15 text-warning"
      : status === "in_progress"
        ? "bg-primary/15 text-primary"
        : "bg-success/15 text-success";
  return (
    <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${color}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function ActionBtn({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-50"
    >
      {children}
    </button>
  );
}
