import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId, getCurrentUserId } from "@/integrations/supabase/auth-helper";

export type BudgetCategory = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  is_starter: boolean;
  created_at: string;
  updated_at: string;
};

export type Budget = {
  id: string;
  user_id: string;
  category_id: string;
  amount_cents: number;
  period: "monthly";
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type BudgetWithSpend = {
  budget: Budget;
  category: BudgetCategory;
  spent_cents: number;
  pct: number;
};

const STARTER_CATEGORIES: { name: string; color: string; icon: string }[] = [
  { name: "Groceries", color: "#10b981", icon: "shopping-cart" },
  { name: "Dining", color: "#f59e0b", icon: "utensils" },
  { name: "Gas & Transport", color: "#3b82f6", icon: "car" },
  { name: "Shopping", color: "#ec4899", icon: "shopping-bag" },
  { name: "Subscriptions", color: "#8b5cf6", icon: "repeat" },
  { name: "Utilities", color: "#06b6d4", icon: "bolt" },
  { name: "Entertainment", color: "#f43f5e", icon: "film" },
  { name: "Travel", color: "#14b8a6", icon: "plane" },
  { name: "Healthcare", color: "#ef4444", icon: "heart" },
  { name: "Other", color: "#94a3b8", icon: "circle" },
];

async function seedIfEmpty(userId: string) {
  const { data: existing } = await supabaseAdmin
    .from("budget_categories")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  if (existing && existing.length > 0) return;
  await supabaseAdmin.from("budget_categories").insert(
    STARTER_CATEGORIES.map((c) => ({
      user_id: userId,
      name: c.name,
      color: c.color,
      icon: c.icon,
      is_starter: true,
    })),
  );
}

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getCurrentUserId();
  if (!userId) return { categories: [] as BudgetCategory[] };
  await seedIfEmpty(userId);
  const { data } = await supabaseAdmin
    .from("budget_categories")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  return { categories: (data ?? []) as BudgetCategory[] };
});

const categoryInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(40),
  color: z.string().trim().max(20).nullable().optional(),
  icon: z.string().trim().max(40).nullable().optional(),
});

export const upsertCategory = createServerFn({ method: "POST" })
  .inputValidator((input: z.input<typeof categoryInput>) => categoryInput.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("budget_categories")
        .update({
          name: data.name,
          color: data.color ?? null,
          icon: data.icon ?? null,
        })
        .eq("id", data.id)
        .eq("user_id", userId);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, error: null };
    }
    const { error } = await supabaseAdmin.from("budget_categories").insert({
      user_id: userId,
      name: data.name,
      color: data.color ?? null,
      icon: data.icon ?? null,
      is_starter: false,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, error: null };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { error } = await supabaseAdmin
      .from("budget_categories")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, error: null };
  });

const budgetInput = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid(),
  amount_cents: z.number().int().min(100).max(100_000_000),
});

export const upsertBudget = createServerFn({ method: "POST" })
  .inputValidator((input: z.input<typeof budgetInput>) => budgetInput.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("budgets")
        .update({ amount_cents: data.amount_cents, category_id: data.category_id })
        .eq("id", data.id)
        .eq("user_id", userId);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, error: null };
    }
    // upsert by (user_id, category_id) where active
    const { data: existing } = await supabaseAdmin
      .from("budgets")
      .select("id")
      .eq("user_id", userId)
      .eq("category_id", data.category_id)
      .eq("active", true)
      .maybeSingle();
    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from("budgets")
        .update({ amount_cents: data.amount_cents })
        .eq("id", existing.id)
        .eq("user_id", userId);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, error: null };
    }
    const { error } = await supabaseAdmin.from("budgets").insert({
      user_id: userId,
      category_id: data.category_id,
      amount_cents: data.amount_cents,
      period: "monthly",
      active: true,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, error: null };
  });

export const deleteBudget = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { error } = await supabaseAdmin
      .from("budgets")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, error: null };
  });

export const listBudgetsWithSpend = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getCurrentUserId();
  if (!userId) return { items: [] as BudgetWithSpend[] };
  await seedIfEmpty(userId);

  const [budgetsRes, catsRes] = await Promise.all([
    supabaseAdmin
      .from("budgets")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true),
    supabaseAdmin.from("budget_categories").select("*").eq("user_id", userId),
  ]);

  const budgets = (budgetsRes.data ?? []) as Budget[];
  const cats = (catsRes.data ?? []) as BudgetCategory[];
  if (budgets.length === 0) return { items: [] as BudgetWithSpend[] };

  // Pull current-month spending transactions for this user
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const startStr = start.toISOString().slice(0, 10);

  const { data: txs } = await supabaseAdmin
    .from("aggregated_transactions")
    .select("amount, category, custom_category")
    .eq("user_id", userId)
    .gte("date", startStr)
    .gt("amount", 0); // Plaid: positive = outflow

  const spendByCategory = new Map<string, number>();
  for (const t of txs ?? []) {
    const cat = (t.custom_category ?? t.category ?? "").toString();
    if (!cat) continue;
    if (cat === "Income" || cat === "Transfer") continue;
    const cents = Math.round(Number(t.amount) * 100);
    if (!Number.isFinite(cents)) continue;
    spendByCategory.set(cat, (spendByCategory.get(cat) ?? 0) + cents);
  }

  const catById = new Map(cats.map((c) => [c.id, c]));
  const items: BudgetWithSpend[] = budgets
    .map((b) => {
      const category = catById.get(b.category_id);
      if (!category) return null;
      const spent = spendByCategory.get(category.name) ?? 0;
      const pct = b.amount_cents > 0 ? spent / b.amount_cents : 0;
      return { budget: b, category, spent_cents: spent, pct };
    })
    .filter((x): x is BudgetWithSpend => x !== null)
    .sort((a, b) => b.pct - a.pct);

  return { items };
});
