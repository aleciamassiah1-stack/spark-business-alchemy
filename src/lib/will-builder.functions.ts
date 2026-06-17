import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId } from "@/integrations/supabase/auth-helper";

export type WillData = {
  testator?: {
    fullName?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    dob?: string;
    maritalStatus?: "single" | "married" | "divorced" | "widowed" | "";
    spouseName?: string;
  };
  executor?: {
    name?: string;
    relation?: string;
    phone?: string;
    email?: string;
    alternateName?: string;
    alternateRelation?: string;
  };
  guardian?: {
    hasMinorChildren?: boolean;
    children?: Array<{ name: string; dob?: string }>;
    primaryName?: string;
    primaryRelation?: string;
    alternateName?: string;
  };
  beneficiaries?: Array<{
    name: string;
    relation?: string;
    sharePercent?: number;
  }>;
  specificBequests?: Array<{ item: string; recipient: string }>;
  residualClause?: "beneficiaries" | "spouse" | "custom";
  residualCustom?: string;
  finalWishes?: {
    disposition?: "burial" | "cremation" | "donation" | "executor" | "";
    notes?: string;
    organDonor?: boolean;
  };
  digitalAssets?: string;
  pets?: Array<{ name: string; caretakerName?: string; fundAmount?: number }>;
  attestation?: {
    witness1Name?: string;
    witness2Name?: string;
    notary?: boolean;
  };
};

export const getWillDraft = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  const { data, error } = await supabaseAdmin
    .from("will_drafts")
    .select("id, data, step, status, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { draft: null, error: error.message };
  return { draft: data, error: null };
});

export const saveWillDraft = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { id?: string; data: WillData; step: number; status?: "draft" | "completed" }) =>
      z
        .object({
          id: z.string().uuid().optional(),
          data: z.any(),
          step: z.number().int().min(0).max(20),
          status: z.enum(["draft", "completed"]).default("draft"),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("will_drafts")
        .update({ data: data.data, step: data.step, status: data.status })
        .eq("id", data.id)
        .eq("user_id", userId);
      return { ok: !error, id: data.id, error: error?.message ?? null };
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("will_drafts")
      .insert({ user_id: userId, data: data.data, step: data.step, status: data.status })
      .select("id")
      .single();
    return { ok: !error, id: inserted?.id ?? null, error: error?.message ?? null };
  });
