import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Phone, Mail, MessageCircle, Calendar, ExternalLink, Send, Sparkles, X, MailPlus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { useAuth } from "@/lib/auth-context";
import { sendTransactionalEmail } from "@/lib/email/send";
import { submitServiceRequest } from "@/lib/service-requests.functions";
import { isIosNative } from "@/lib/native";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Concierge Support — Æther Wealth" },
      { name: "description", content: "Reach your private concierge team — chat with AI 24/7 or email our team." },
    ],
  }),
  component: () => (
    <RequireOnboarding>
      <SupportPage />
    </RequireOnboarding>
  ),
});

const TEAM_EMAIL = "team@aetherwealth.co";
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/concierge-chat`;

type Msg = { role: "user" | "assistant"; content: string };

function SupportPage() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <MobileShell title="Concierge" subtitle="Your private support line">
      <div className="flex flex-col gap-4 px-5 pb-6">
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="relative overflow-hidden rounded-2xl border border-primary/30 gradient-hero px-5 py-5 text-left glow-violet"
        >
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/30 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="label-mono text-primary/80">Ask the concierge</p>
              <p className="font-serif text-lg text-foreground">Instant answers, 24/7</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                AI-assisted · escalates to our team when needed
              </p>
            </div>
            <MessageCircle className="h-4 w-4 text-primary" />
          </div>
        </button>

        <div>
          <p className="label-mono mb-2 px-1">Reach a human</p>
          <LuxCard className="divide-y divide-white/[0.04]">
            <ContactRow
              icon={Mail}
              label="Email our team"
              desc={TEAM_EMAIL}
              href={`mailto:${TEAM_EMAIL}`}
            />
            <ContactRow
              icon={Calendar}
              label="Book a private review"
              desc="30 or 60 minutes, in person or video"
              href={`mailto:${TEAM_EMAIL}?subject=Schedule%20a%20review`}
            />
            <ContactRow
              icon={Phone}
              label="Request a callback"
              desc="Leave your number and we'll ring"
              href={`mailto:${TEAM_EMAIL}?subject=Callback%20request`}
            />
          </LuxCard>
        </div>

        <p className="px-1 text-center text-[11px] italic text-muted-foreground">
          AI replies are guidance only · sensitive matters are handled by our team.
        </p>
      </div>

      <ConciergeChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </MobileShell>
  );
}

function ContactRow({
  icon: Icon,
  label,
  desc,
  href,
}: {
  icon: typeof Phone;
  label: string;
  desc: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.02]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.04]">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground" />
    </a>
  );
}

function ConciergeChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Good day. I'm your Æther Wealth concierge. You can ask me anything — about Æther Wealth, your membership, planning workflows, or general questions — and I'll help or route you to our team when needed.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [emailingTeam, setEmailingTeam] = useState(false);
  const sessionIdRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
    }, 220);

    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setSending(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content !== messages[messages.length - 1]?.content) {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          sessionId: sessionIdRef.current,
        }),
        signal: controller.signal,
      });

      if (resp.status === 429) {
        toast.error("Concierge is busy. Please try again in a moment.");
        setSending(false);
        return;
      }
      if (resp.status === 402) {
        toast.error("Concierge is temporarily unavailable.");
        setSending(false);
        return;
      }
      if (!resp.ok || !resp.body) {
        toast.error("Could not reach the concierge. Please try again.");
        setSending(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsert(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsert(content);
          } catch {
            /* ignore */
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error("Concierge connection lost.");
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }

  async function sendToTeam() {
    if (emailingTeam) return;
    const userMessages = messages.filter((m) => m.role === "user");
    if (userMessages.length === 0) {
      toast.error("Type at least one message before sending the chat to the team.");
      return;
    }
    if (!user?.email) {
      toast.error("Please sign in so the team can reply to you.");
      return;
    }

    const ok = window.confirm(
      `Send this conversation to ${TEAM_EMAIL}? The team will reply to ${user.email}.`,
    );
    if (!ok) return;

    setEmailingTeam(true);
    try {
      const transcript = messages
        .map((m) => `${m.role === "user" ? "Member" : "Concierge"}: ${m.content}`)
        .join("\n\n");
      const lastUserMessage = userMessages[userMessages.length - 1].content;

      await sendTransactionalEmail({
        templateName: "concierge-message",
        idempotencyKey: `concierge-${user.id}-${Date.now()}`,
        templateData: {
          fromEmail: user.email,
          fromName: (user.user_metadata as Record<string, unknown> | undefined)?.full_name as string | undefined ?? user.email,
          message: lastUserMessage,
          conversation: transcript,
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        },
      });
      // Also record this as a service request so it shows up in the admin inbox.
      void submitServiceRequest({
        data: {
          type: "concierge",
          subject: lastUserMessage.slice(0, 120),
          body: { message: lastUserMessage, conversation: transcript },
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        },
      }).catch(() => {
        /* DB row is best-effort here since email already succeeded */
      });
      toast.success("Sent to the team. They'll reply to you by email shortly.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I've forwarded this conversation to **${TEAM_EMAIL}**. A team member will reply to **${user.email}** as soon as possible.`,
        },
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send to the team.");
    } finally {
      setEmailingTeam(false);
    }
  }
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div
            className="relative flex h-[85dvh] max-h-[85dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-background"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-serif text-base text-foreground">Concierge</p>
                  <p className="text-[11px] text-muted-foreground">AI · always on</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={sendToTeam}
                  disabled={emailingTeam}
                  className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] text-foreground transition-colors hover:bg-primary/15 disabled:opacity-50"
                  aria-label="Send conversation to the team"
                  title={`Email this chat to ${TEAM_EMAIL}`}
                >
                  <MailPlus className="h-3.5 w-3.5 text-primary" />
                  {emailingTeam ? "Sending…" : "Send to team"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                  aria-label="Close concierge chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div className="flex flex-col gap-3">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-white/[0.04] text-foreground"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                          <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {sending && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-white/[0.04] px-4 py-2.5 text-sm text-muted-foreground">
                      <span className="inline-flex gap-1">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
                      </span>
                    </div>
                  </div>
                )}
                {messages.length === 1 && !sending && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {[
                      "What can you help with?",
                      ...(isIosNative() ? [] : ["How does pricing work?"]),
                      "How do I contact support?",
                    ].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => send(q)}
                        className="rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-[12px] text-foreground/90 transition-colors hover:border-primary/45 hover:bg-primary/10"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <footer className="shrink-0 border-t border-white/[0.06] p-3 pb-[max(env(safe-area-inset-bottom),12px)]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  ref={inputRef}
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Ask anything…"
                  rows={1}
                  className="pointer-events-auto max-h-32 flex-1 resize-none rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                For sensitive matters, email{" "}
                <a href={`mailto:${TEAM_EMAIL}`} className="underline">
                  {TEAM_EMAIL}
                </a>
              </p>
            </footer>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
