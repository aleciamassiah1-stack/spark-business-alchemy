import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId, getCurrentUserId } from "@/integrations/supabase/auth-helper";

const accountSchema = z.object({
  name: z.string().trim().min(1).max(80),
  balance: z.number().min(-1_000_000_000_000).max(1_000_000_000_000),
});

const memberInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  relationship: z.string().trim().min(1).max(50),
  age: z.number().int().min(0).max(150).nullable(),
  net_worth: z.number().min(0).max(1_000_000_000_000),
  initials: z.string().trim().max(4).nullable().optional(),
  accounts: z.array(accountSchema).max(50).default([]),
});

type FamilyMemberRow = {
  id: string;
  user_id: string;
  name: string;
  relationship: string;
  age: number | null;
  initials: string | null;
  net_worth: number;
  iso_currency_code: string | null;
  accounts: Array<{ name: string; balance: number }>;
  created_at: string;
};

export const listFamilyMembers = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getCurrentUserId();
  if (!userId) return { members: [] as FamilyMemberRow[] };
  const { data, error } = await supabaseAdmin
    .from("family_members")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("listFamilyMembers error", error);
    return { members: [] as FamilyMemberRow[] };
  }
  return { members: (data ?? []) as unknown as FamilyMemberRow[] };
});

export const upsertFamilyMember = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id?: string;
      name: string;
      relationship: string;
      age: number | null;
      net_worth: number;
      initials?: string | null;
      accounts?: Array<{ name: string; balance: number }>;
    }) => {
      const { id, ...rest } = input;
      const parsed = memberInputSchema.parse({
        ...rest,
        accounts: rest.accounts ?? [],
        initials: rest.initials ?? null,
      });
      return { id, ...parsed };
    },
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const payload = {
      user_id: userId,
      name: data.name,
      relationship: data.relationship,
      age: data.age,
      net_worth: data.net_worth,
      initials: data.initials ?? null,
      accounts: data.accounts,
    };
    if (data.id) {
      const { data: row, error } = await supabaseAdmin
        .from("family_members")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", userId) // critical: server-enforced ownership
        .select()
        .single();
      if (error || !row) {
        console.error("updateFamilyMember error", error);
        throw new Error("Could not save family member");
      }
      return { member: row };
    }
    const { data: row, error } = await supabaseAdmin
      .from("family_members")
      .insert(payload)
      .select()
      .single();
    if (error || !row) {
      console.error("insertFamilyMember error", error);
      throw new Error("Could not save family member");
    }
    return { member: row };
  });

export const deleteFamilyMember = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { error } = await supabaseAdmin
      .from("family_members")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId); // critical: server-enforced ownership
    if (error) {
      console.error("deleteFamilyMember error", error);
      throw new Error("Could not delete family member");
    }
    return { ok: true as const };
  });
