## What you'll get

A new **Budgets** section where you can set a monthly spending cap per category (e.g. $300 Groceries, $150 Gas, $400 Shopping). Spending is calculated from your connected bank/card transactions. Progress shows on the home dashboard, and the weekly digest email flags any budget that's over or pacing over.

## Categories

A starter list is created for each user on first visit:

- Groceries, Dining, Gas & Transport, Shopping, Subscriptions, Utilities, Entertainment, Travel, Healthcare, Other

You can:
- **Add** a new category (name + optional color/icon)
- **Rename** or **delete** any category (yours or starter)
- **Merge** a category's matching rules into an existing one when deleting

Categories reuse the existing `transaction_rules` engine — so any transaction already auto-categorized (e.g. "Whole Foods" → Groceries) automatically counts toward that budget. You can also map merchants to categories from the Budgets page.

## Budget rules

- One budget = one category + monthly limit (USD)
- Period resets on the 1st of each month
- Spend = sum of `amount` from `aggregated_transactions` where (category or custom_category) matches, in the current month, across all linked accounts
- Income / transfers / refunds are excluded

## Where it shows up

1. **Budgets page** (`/budgets`, in the More menu) — list of budgets with progress bars, edit/add/delete, category manager
2. **Home dashboard** — compact "This month's budgets" card with the top 3 + an "over budget" badge count
3. **Weekly digest email** — new section "Budget check-in" listing any budget ≥80% used or over, with $ over/under

## Technical details

**New tables (migration):**

- `budget_categories` — `id`, `user_id`, `name`, `color`, `icon`, `is_starter`, timestamps. RLS scoped to `auth.uid()`. Seeded on first read via server fn (not a DB trigger, so it stays in app code).
- `budgets` — `id`, `user_id`, `category_id` (FK), `amount_cents` (int), `period` ('monthly'), `active` (bool), timestamps. RLS scoped to `auth.uid()`. Unique `(user_id, category_id)` where `active=true`.

Both follow the project's GRANT/RLS conventions (authenticated + service_role grants, policies on `auth.uid() = user_id`).

**Server functions (`src/lib/budgets.functions.ts`):**

- `listBudgetsWithSpend()` — returns `{ budget, category, spent_cents, pct }[]` for current month
- `upsertBudget({ category_id, amount_cents })`
- `deleteBudget({ id })`
- `listCategories()` — auto-seeds starter set if user has none
- `upsertCategory({ id?, name, color, icon })` (Zod-validated: name 1–40 chars, trimmed)
- `deleteCategory({ id, reassign_to? })` — reassigns any `transaction_rules.category` rows to the target

Spend calc: SQL aggregate on `aggregated_transactions` filtered by `coalesce(custom_category, category) = category.name`, `date >= date_trunc('month', now())`, `amount > 0` (debits in this codebase), excluding `category in ('Income','Transfer')`.

**UI:**

- `src/routes/budgets.tsx` — list + add/edit dialog using existing `Dialog`, `Input`, `Progress` components and the design tokens (no custom colors)
- `src/components/BudgetsCard.tsx` — dashboard card, added to `src/routes/index.tsx` under the existing wealth cards
- Category manager section on the same page (rename/add/delete + reassign-on-delete dropdown)

**Weekly digest:**

- Extend the existing digest template (under `src/lib/email-templates/`) with a "Budget check-in" block rendered from the same `listBudgetsWithSpend` data, only showing budgets at ≥80%.

**Out of scope for this build (call out if you want them next):**

- Weekly budgets (currently monthly only)
- Per-account budgets ("$300 groceries on Chase only")
- Household roll-up across linked spouse accounts
- Real-time push notifications at 80%/100%
- Rollover of unused budget into next month