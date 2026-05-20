
# Two features to build

## 1. Household profile switcher (Option C)

Goal: when logged in as `aleciamassiah1`, you can switch between "My data" and "Husband's data" from a single account, and edit either side.

### Approach (lightweight — no full RLS rewrite)

Rather than re-keying every table from `user_id` → `household_id` (a multi-day refactor across ~20 tables), use a **"managed profiles"** model:

- New table `managed_profiles` — extra wealth profiles owned by your auth user (you, spouse, child, etc.). Each has its own `id` (uuid) used as the `user_id` value in existing data tables.
- New table `profile_access` — maps `auth_user_id` → list of `profile_ids` they can act as, with a role (`owner` / `member`).
- Add a `has_profile_access(profile_id)` security-definer function.
- Update RLS on all wealth tables (`aggregated_*`, `properties`, `insurance_policies`, `estate_documents`, `family_members`, `user_intake`, `transaction_rules`, `sync_log`, `plaid_link_events`) so `user_id = auth.uid() OR has_profile_access(user_id)`.
- Your existing `auth.uid()` becomes profile #1 automatically (backfill migration).
- Frontend: profile switcher in the header (avatar dropdown). Selected `activeProfileId` stored in React context + localStorage. All Supabase reads filter by `activeProfileId`; all inserts set `user_id = activeProfileId`.
- Plaid items stay scoped to the auth user (one bank connection per real person), but linked profiles can view aggregated data via the access check.

This gives you true shared-account editing without rewriting the data model.

### What stays the same

- Subscription, role, MFA, auth — all keyed to `auth.uid()`, unchanged.
- Family Links (cross-account view) — still works for couples with separate logins.

## 2. Admin request inbox + email notifications

### Database
- `service_requests` table: `id`, `user_id`, `profile_id` (nullable, which profile it's about), `type` (`meeting` | `report` | `concierge` | `wealth_manager` | `other`), `subject`, `body` (jsonb payload), `status` (`new` | `in_progress` | `resolved`), `assigned_admin`, `created_at`, `resolved_at`.
- RLS: users see/insert their own; admins see/manage all.
- Realtime enabled so the admin badge updates live.

### Server fn `submitServiceRequest`
- Inserts the row.
- Sends transactional email to admin (`aleciamassiah1@gmail.com`) via existing `/lovable/email/transactional/send` infra with a new `service-request-notification` template.
- Returns request id.

### Wire existing CTAs
- "Schedule meeting", "Request report", "Message advisor / wealth manager" buttons currently route to UI-only modals or the single transactional email. Repoint them all at `submitServiceRequest`.

### Admin UI
- New route `/admin/requests` — table of all requests, filter by status, click row to view details + mark resolved.
- Badge with unread count on the admin nav entry (realtime subscription).

---

## Order of work

1. Migrations: `managed_profiles`, `profile_access`, `has_profile_access()`, backfill auth users as profile #1, update RLS across wealth tables.
2. Migrations: `service_requests` + RLS + realtime.
3. Frontend: `ActiveProfileContext` + profile switcher in header.
4. Frontend: thread `activeProfileId` through all data hooks/queries.
5. Server fn `submitServiceRequest` + email template + wire CTAs.
6. Admin `/admin/requests` page + badge.

This is ~1500–2000 LOC across migrations, server fns, context, switcher, and admin page. Will be one large change set. Ready to start when you confirm.
