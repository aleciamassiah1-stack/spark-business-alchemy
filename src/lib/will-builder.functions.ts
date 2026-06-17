import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId } from "@/integrations/supabase/auth-helper";
import { resolveActiveProfileId } from "./active-profile.server";

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

export type WillSeedData = {
  familyMembers: Array<{
    name: string;
    relationship: string;
    age: number | null;
  }>;
  insuranceBeneficiaries: string[];
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

export const getWillSeedData = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  const profileId = await resolveActiveProfileId(userId);

  // Fetch family members
  const { data: familyData, error: familyError } = await supabaseAdmin
    .from("family_members")
    .select("name, relationship, age")
    .eq("user_id", profileId)
    .order("created_at", { ascending: true });
  if (familyError) {
    console.error("getWillSeedData family error", familyError);
  }

  // Fetch insurance policies to extract beneficiaries
  const { data: policyData, error: policyError } = await supabaseAdmin
    .from("insurance_policies")
    .select("beneficiaries")
    .eq("user_id", profileId);
  if (policyError) {
    console.error("getWillSeedData policy error", policyError);
  }

  const familyMembers = (familyData ?? []).map((m) => ({
    name: String(m.name ?? "").trim(),
    relationship: String(m.relationship ?? "").trim(),
    age: m.age ?? null,
  }));

  const beniSet = new Set<string>();
  for (const p of policyData ?? []) {
    const list = Array.isArray(p.beneficiaries)
      ? (p.beneficiaries as unknown[]).map((x) => String(x).trim()).filter(Boolean)
      : [];
    for (const name of list) {
      beniSet.add(name);
    }
  }

  return {
    familyMembers,
    insuranceBeneficiaries: Array.from(beniSet),
  } as WillSeedData;
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

