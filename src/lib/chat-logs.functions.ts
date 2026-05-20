import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId } from "@/integrations/supabase/auth-helper";

async function requireAdmin(): Promise<void> {
  const uid = await requireUserId();
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const listConciergeSessions = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  // Latest 200 sessions by most recent message.
  const { data, error } = await supabaseAdmin
    .from("concierge_chat_logs")
    .select("session_id, user_id, user_email, role, content, created_at")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);

  const map = new Map<
    string,
    {
      sessionId: string;
      userId: string | null;
      userEmail: string | null;
      messageCount: number;
      lastAt: string;
      firstAt: string;
      preview: string;
    }
  >();
  for (const row of data ?? []) {
    const existing = map.get(row.session_id);
    if (existing) {
      existing.messageCount += 1;
      if (row.created_at < existing.firstAt) existing.firstAt = row.created_at;
      if (!existing.userEmail && row.user_email) existing.userEmail = row.user_email;
      if (!existing.userId && row.user_id) existing.userId = row.user_id;
    } else {
      map.set(row.session_id, {
        sessionId: row.session_id,
        userId: row.user_id,
        userEmail: row.user_email,
        messageCount: 1,
        lastAt: row.created_at,
        firstAt: row.created_at,
        preview: row.role === "user" ? row.content.slice(0, 140) : row.content.slice(0, 140),
      });
    }
  }
  return {
    sessions: Array.from(map.values()).sort((a, b) =>
      a.lastAt < b.lastAt ? 1 : -1,
    ),
  };
});

export const getConciergeSession = createServerFn({ method: "POST" })
  .inputValidator((input: { sessionId: string }) => {
    if (!input?.sessionId || typeof input.sessionId !== "string") {
      throw new Error("sessionId required");
    }
    return input;
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    const { data: rows, error } = await supabaseAdmin
      .from("concierge_chat_logs")
      .select("id, role, content, created_at, user_email, user_id, model")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true })
      .limit(1000);
    if (error) throw new Error(error.message);
    return { messages: rows ?? [] };
  });
