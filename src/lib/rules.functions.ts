import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// =================================================================
// Transaction Rules — pattern-based merchant → category mapping
// =================================================================

export type TransactionRule = {
  id: string;
  name: string;
  category: string;
  priority: number;
  merchant_pattern: string | null;
  match_type: "exact" | "contains" | "starts_with";
  description_keyword: string | null;
  amount_min: number | null;
  amount_max: number | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

const ruleInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  priority: z.number().int().min(1).max(9999).default(100),
  merchant_pattern: z.string().trim().max(200).nullable().optional(),
  match_type: z.enum(["exact", "contains", "starts_with"]).default("contains"),
  description_keyword: z.string().trim().max(200).nullable().optional(),
  amount_min: z.number().min(0).nullable().optional(),
  amount_max: z.number().min(0).nullable().optional(),
  enabled: z.boolean().default(true),
});

// ---------- LIST ----------
export const listRules = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("transaction_rules")
    .select("*")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });
  return {
    rules: (data ?? []) as TransactionRule[],
    error: error?.message ?? null,
  };
});

// ---------- UPSERT (with backfill) ----------
export const upsertRule = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id?: string;
      name: string;
      category: string;
      priority?: number;
      merchant_pattern?: string | null;
      match_type?: "exact" | "contains" | "starts_with";
      description_keyword?: string | null;
      amount_min?: number | null;
      amount_max?: number | null;
      enabled?: boolean;
    }) => {
      const { id, ...rest } = input;
      const parsed = ruleInputSchema.parse({
        ...rest,
        priority: rest.priority ?? 100,
        match_type: rest.match_type ?? "contains",
        enabled: rest.enabled ?? true,
      });
      // At least one matching condition is required
      if (
        !parsed.merchant_pattern &&
        !parsed.description_keyword &&
        parsed.amount_min == null &&
        parsed.amount_max == null
      ) {
        throw new Error(
          "Rule needs at least one condition: merchant pattern, description keyword, or amount range.",
        );
      }
      return { id, ...parsed };
    },
  )
  .handler(async ({ data }) => {
    const payload = {
      name: data.name,
      category: data.category,
      priority: data.priority,
      merchant_pattern: data.merchant_pattern ?? null,
      match_type: data.match_type,
      description_keyword: data.description_keyword ?? null,
      amount_min: data.amount_min ?? null,
      amount_max: data.amount_max ?? null,
      enabled: data.enabled,
    };

    let savedId = data.id;
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("transaction_rules")
        .update(payload)
        .eq("id", data.id);
      if (error) return { ok: false as const, error: error.message, updated: 0 };
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from("transaction_rules")
        .insert(payload)
        .select("id")
        .single();
      if (error) return { ok: false as const, error: error.message, updated: 0 };
      savedId = inserted?.id;
    }

    // Always re-apply ALL rules so priority/conflict resolution is correct
    const { data: appliedCount, error: rpcErr } = await supabaseAdmin.rpc(
      "apply_transaction_rules",
      { target_rule_id: null },
    );
    if (rpcErr) {
      return {
        ok: true as const,
        error: `Saved, but backfill failed: ${rpcErr.message}`,
        updated: 0,
        id: savedId,
      };
    }
    return {
      ok: true as const,
      error: null as string | null,
      updated: (appliedCount as number | null) ?? 0,
      id: savedId,
    };
  });

// ---------- DELETE ----------
export const deleteRule = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    // First clear matches for this rule
    await supabaseAdmin
      .from("aggregated_transactions")
      .update({ custom_category: null, applied_rule_id: null })
      .eq("applied_rule_id", data.id);
    const { error } = await supabaseAdmin
      .from("transaction_rules")
      .delete()
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    // Re-apply remaining rules in case other rules now match these transactions
    await supabaseAdmin.rpc("apply_transaction_rules", { target_rule_id: null });
    return { ok: true as const, error: null as string | null };
  });

// ---------- REAPPLY (manual) ----------
export const reapplyAllRules = createServerFn({ method: "POST" }).handler(async () => {
  const { data, error } = await supabaseAdmin.rpc("apply_transaction_rules", {
    target_rule_id: null,
  });
  if (error) return { ok: false as const, error: error.message, updated: 0 };
  return { ok: true as const, error: null as string | null, updated: (data as number) ?? 0 };
});

// ---------- QUICK CREATE (inline from a transaction) ----------
export const quickCreateRule = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { merchant: string; category: string; matchType?: "exact" | "contains" }) =>
      z
        .object({
          merchant: z.string().trim().min(1).max(200),
          category: z.string().trim().min(1).max(80),
          matchType: z.enum(["exact", "contains"]).default("contains"),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const payload = {
      name: `${data.merchant} → ${data.category}`,
      category: data.category,
      priority: 100,
      merchant_pattern: data.merchant,
      match_type: data.matchType,
      enabled: true,
    };
    const { data: inserted, error } = await supabaseAdmin
      .from("transaction_rules")
      .insert(payload)
      .select("id")
      .single();
    if (error) return { ok: false as const, error: error.message, updated: 0 };
    const { data: count } = await supabaseAdmin.rpc("apply_transaction_rules", {
      target_rule_id: null,
    });
    return {
      ok: true as const,
      error: null as string | null,
      id: inserted?.id,
      updated: (count as number | null) ?? 0,
    };
  });

// ---------- CATEGORY SUGGESTIONS ----------
// Pull distinct categories from existing transactions + rules so the user has autocomplete
export const listCategorySuggestions = createServerFn({ method: "GET" }).handler(async () => {
  const [txRes, ruleRes] = await Promise.all([
    supabaseAdmin
      .from("aggregated_transactions")
      .select("category, custom_category")
      .limit(1000),
    supabaseAdmin.from("transaction_rules").select("category"),
  ]);
  const set = new Set<string>();
  for (const r of txRes.data ?? []) {
    if (r.category) set.add(r.category);
    if (r.custom_category) set.add(r.custom_category);
  }
  for (const r of ruleRes.data ?? []) {
    if (r.category) set.add(r.category);
  }
  // Add a few sensible defaults
  ["Food & Dining", "Groceries", "Transport", "Travel", "Subscriptions", "Utilities", "Income", "Transfer", "Shopping", "Healthcare", "Entertainment"].forEach(
    (c) => set.add(c),
  );
  return { categories: Array.from(set).sort() };
});
