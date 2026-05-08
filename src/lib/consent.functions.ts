// Consent audit trail. Records which version of Terms / Privacy / Plaid disclosure
// each user accepted, and when. Append-only — RLS prevents updates and deletes.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ConsentKind = z.enum(["terms", "privacy", "plaid_disclosure"]);

const recordConsentSchema = z.object({
  kind: ConsentKind,
  version: z.string().min(1).max(32),
  userAgent: z.string().max(500).optional(),
});

export const recordConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => recordConsentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("user_consents").insert({
      user_id: userId,
      kind: data.kind,
      version: data.version,
      user_agent: data.userAgent ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getMyConsents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_consents")
      .select("kind, version, accepted_at")
      .eq("user_id", userId)
      .order("accepted_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { consents: data ?? [] };
  });
