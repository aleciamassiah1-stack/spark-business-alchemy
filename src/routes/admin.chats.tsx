import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, RefreshCw, Loader2, Inbox, Search, X, MessageCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAccess } from "@/lib/access-context";
import { checkAccess } from "@/lib/access.functions";
import {
  listConciergeSessions,
  getConciergeSession,
} from "@/lib/chat-logs.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/chats")({
  head: () => ({
    meta: [
      { title: "Concierge Chat Logs — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async () => {
    const r = await checkAccess();
    if (!r.authenticated) throw redirect({ to: "/signin" });
    if (!r.isAdmin) throw redirect({ to: "/" });
  },
  component: AdminChatsPage,
});

type Session = Awaited<ReturnType<typeof listConciergeSessions>>["sessions"][number];
type Msg = Awaited<ReturnType<typeof getConciergeSession>>["messages"][number];

function AdminChatsPage() {
  const access = useAccess();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openSession, setOpenSession] = useState<Session | null>(null);
  const [thread, setThread] = useState<Msg[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listConciergeSessions();
      setSessions(r.sessions);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load chat logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (access.ready && access.isAdmin) load();
  }, [access.ready, access.isAdmin, load]);

  useEffect(() => {
    if (!openSession) return;
    setThreadLoading(true);
    getConciergeSession({ data: { sessionId: openSession.sessionId } })
      .then((r) => setThread(r.messages))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load conversation"))
      .finally(() => setThreadLoading(false));
  }, [openSession]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) =>
      [s.userEmail ?? "", s.userId ?? "", s.preview, s.sessionId]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [sessions, search]);

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
              <h1 className="font-serif text-xl text-foreground">Concierge Chat Logs</h1>
            </div>
          </div>
          <button
            onClick={() => load()}
            className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 pt-6">
        <div className="mb-4 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, user id, or message preview…"
            className="w-full rounded-full border border-border/40 bg-background/40 py-1.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Inbox className="mb-3 h-8 w-8 opacity-50" />
            <p>{sessions.length === 0 ? "No chat sessions yet." : "No sessions match your search."}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((s) => (
              <button
                key={s.sessionId}
                onClick={() => setOpenSession(s)}
                className="text-left rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-3.5 w-3.5 text-primary" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {s.messageCount} message{s.messageCount === 1 ? "" : "s"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(s.lastAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground">
                  {s.userEmail ?? (s.userId ? `User ${s.userId.slice(0, 8)}…` : "Anonymous")}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.preview}</p>
              </button>
            ))}
          </div>
        )}
      </main>

      {openSession && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpenSession(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-background"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
              <div className="min-w-0">
                <h2 className="font-serif text-lg truncate">
                  {openSession.userEmail ??
                    (openSession.userId
                      ? `User ${openSession.userId.slice(0, 8)}…`
                      : "Anonymous")}
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Session {openSession.sessionId.slice(0, 8)}… ·{" "}
                  {new Date(openSession.firstAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenSession(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/40 bg-background/40 text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {threadLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : thread.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">No messages.</p>
              ) : (
                thread.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl border p-3 text-xs ${
                      m.role === "user"
                        ? "border-primary/20 bg-primary/5"
                        : "border-white/[0.06] bg-white/[0.02]"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        {m.role}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(m.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="prose prose-invert prose-sm max-w-none text-foreground/90">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
