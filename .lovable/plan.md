## Goal

Bring the app's end-user notices and consent flow up to what Plaid's MSA + production-launch checklist requires, and document it so the requirement is verifiably met.

## Current state

- **`/connections`** shows pre-Link disclosure text naming Plaid, linking to Plaid's End User Privacy Policy, and pointing to our Privacy/Terms.
- **`/privacy`** Section 11 already mentions Plaid as a data processor and links to plaid.com/legal.
- **Onboarding "Connect" screen** only says "via Plaid · Read-only · 256-bit encrypted" before pushing the user to `/connections`.
- **Signup form** has no explicit "I agree to Terms / Privacy" acknowledgment.
- **No record** is kept of when/where a user accepted these terms.

## Gaps Plaid expects us to close

1. Affirmative consent at signup to Terms + Privacy (and, by extension, the Plaid disclosure inside Privacy).
2. Stronger pre-Link disclosure: name Plaid, list the data categories accessed (balances, transactions, identity, account/routing, investment holdings, liabilities), state the purpose, give the user a clear way to decline/revoke.
3. First-time pre-Link consent confirmation so we can prove the user saw the disclosure before Link opened.
4. Audit trail: persist `consent_accepted_at`, `consent_version`, and `plaid_disclosure_accepted_at` per user.
5. Privacy policy tweaks: data categories Plaid receives, US processing, retention after disconnect.

## Plan

### 1. Signup consent (frontend)
- Add a required checkbox to the signup form in `src/components/Onboarding.tsx` (`AuthForm`): "I agree to the Terms of Service and Privacy Policy, and I understand that connecting a financial account uses Plaid as described in the Privacy Policy."
- Block submit until checked. Surface inline error if missing.

### 2. Pre-Link consent gate (frontend)
- New `PlaidConsentDialog` component in `src/components/PlaidConsentDialog.tsx` shown on `/connections` the first time the user clicks "Connect bank" (and again from the Onboarding "Connect" screen if launched there).
- Dialog content: Plaid name + role, exact data categories pulled, purpose, link to Plaid End User Privacy Policy, link to our Privacy. Two actions: "Continue to Plaid" / "Cancel".
- Persist acceptance locally (`localStorage`) and server-side (see step 4) so it's not shown again.

### 3. Tighten existing /connections disclosure copy
- Replace the current short paragraph in `src/routes/connections.tsx` (around line 1118) with the same canonical disclosure used in the dialog, so even returning users always see it next to the Connect button.

### 4. Consent audit trail (backend)
- Add columns to `public.user_intake` (or a new `user_consents` table — leaning toward a new table): `terms_accepted_at`, `privacy_accepted_at`, `terms_version`, `plaid_disclosure_accepted_at`, `plaid_disclosure_version`.
- New server fn `recordConsent({ kind, version })` in a `*.functions.ts` file, gated by `requireSupabaseAuth`.
- Call it: on successful signup (terms/privacy) and on accepting the Plaid dialog.

### 5. Privacy policy updates
- In `src/routes/privacy.tsx` Section 11, add: explicit data categories Plaid accesses on our behalf, that Plaid processes data in the US, that disconnecting an institution triggers `/item/remove` and purges the related stored data within 30 days.
- Bump "Last updated" date.

### 6. QA
- Verify signup is blocked without the checkbox.
- Verify the consent dialog appears once, and that the Plaid Link handler only opens after acceptance.
- Verify `recordConsent` rows land in the DB with the right `user_id`.
- Verify retention sweep + `/item/remove` references in the privacy copy still match the code.

## Out of scope

- Cookie banner (only essential cookies — not legally required in US; can revisit for EU rollout).
- Reconsent prompts when versions bump (will add when we first bump a version).

## Technical notes

- The new table option is preferred over expanding `user_intake` because intake is a one-time profile blob, while consent should be append-only and queryable per kind/version.
- Server fn must use `requireSupabaseAuth` middleware (see tanstack-supabase-integration). RLS: users can `select`/`insert` their own rows; no update/delete from clients.
- The Plaid disclosure dialog should NOT itself open Plaid Link — it just gates the existing `openPlaidLink` flow in `connections.tsx`, so `loadPlaidScript` / token exchange code is untouched.
