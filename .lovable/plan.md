## Plan: Plaid Liabilities integration

Adds Plaid's Liabilities product so credit card APRs/min payments, student loan rates/payoff dates, and mortgage rates/escrow/next-payment data flow into Æther Wealth alongside the existing accounts/holdings/transactions sync.

### 1. Database — new `aggregated_liabilities` table (migration)

One row per liability account (matches by `account_id` → `aggregated_accounts.id`). Stores the common normalized fields plus a JSONB grab-bag for product-specific extras.

Columns:
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null` (RLS key)
- `account_id uuid not null` — references our `aggregated_accounts.id`
- `liability_type text not null check in ('credit','student','mortgage')`
- `last_payment_amount numeric` / `last_payment_date date`
- `next_payment_due_date date` / `minimum_payment_amount numeric`
- `apr numeric` (effective/primary APR; credit cards) / `interest_rate_percentage numeric` (student/mortgage)
- `interest_rate_type text` (mortgage: fixed/variable)
- `origination_date date` / `expected_payoff_date date` (student/mortgage)
- `last_statement_balance numeric` / `last_statement_issue_date date` (credit)
- `escrow_balance numeric` / `ytd_interest_paid numeric` / `ytd_principal_paid numeric` (mortgage)
- `loan_name text` / `loan_status text` (student)
- `details jsonb not null default '{}'` — full Plaid sub-object for anything not normalized
- `iso_currency_code text default 'USD'`
- `last_synced_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`
- Unique index on `(account_id, liability_type)` so resync upserts cleanly

RLS: enable + 4 policies (`select/insert/update/delete` where `user_id = auth.uid()`), mirroring `aggregated_holdings`.

### 2. Server — `src/lib/plaid.server.ts`

- Add `"liabilities"` to the products array in `createLinkToken`.
- Add `getLiabilities(access_token)` calling `/liabilities/get`. Typed return:
  ```ts
  { accounts: PlaidAccount[]; liabilities: { credit: PlaidCreditLiability[]; student: PlaidStudentLiability[]; mortgage: PlaidMortgageLiability[] } }
  ```

### 3. Sync — `src/lib/plaid.functions.ts`

In `syncItemInternal`, after the holdings block and before transactions, add a `try`/`catch` "Liabilities" block that:
1. Calls `getLiabilities(access_token)`. If the item doesn't support liabilities, Plaid returns `PRODUCTS_NOT_SUPPORTED` / `NO_LIABILITY_ACCOUNTS` — swallow these like we already do for holdings.
2. Flattens the three arrays into rows mapped to our `account_id` via `acctIdMap` (same `${userId}_${plaidAccountId}` namespacing).
3. Deletes existing liabilities rows for the synced `account_id` set, then inserts fresh rows.
4. Adds `liabilitiesUpdated` count to the return value and `sync_log` row (new column not required — log keeps `accounts_updated`/`holdings_updated`; we just include count in the return for the connections page).

Existing items in the DB won't have liabilities until the user reconnects (Plaid only adds new products to new link tokens). That's acceptable; OK to note in UI later.

### 4. Aggregator — `src/lib/wealth.functions.ts`

Add `liabilities` to the user wealth aggregate so the existing dashboard/timeline/portfolio queries can read it. Initial pass: just expose the rows; deeper analytics (debt avalanche, amortization) are out of scope for this plan.

### 5. UI — minimal surface

Add a "Debt details" section to `src/routes/connections.tsx` (under each connected institution) listing each liability account with: type badge, APR/interest rate, next payment due, minimum payment, last statement balance (credit) or escrow + next payment (mortgage) or repayment plan + payoff date (student). No new route. We can build a dedicated `/debts` page in a later pass if you want.

### 6. Types

`src/integrations/supabase/types.ts` is auto-regenerated after the migration runs — no manual edit.

### Out of scope (call out for later)

- Webhooks for `LIABILITIES_UPDATE` (Plaid pushes when balances/APRs change). Defer until we wire the general Plaid webhook receiver.
- Payoff projections, debt-payment scheduling, mortgage amortization charts.
- Auto loans / personal loans (Plaid Liabilities doesn't cover them broadly).

### Files touched

- `supabase/migrations/<new>.sql` — create table + RLS
- `src/lib/plaid.server.ts` — products array + `getLiabilities`
- `src/lib/plaid.functions.ts` — sync block + return shape
- `src/lib/wealth.functions.ts` — include liabilities in aggregate
- `src/routes/connections.tsx` — render debt details panel

After approval, switch to default mode and implement.
