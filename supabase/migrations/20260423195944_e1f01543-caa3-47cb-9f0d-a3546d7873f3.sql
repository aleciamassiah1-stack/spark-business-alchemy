-- Drop conflicting permissive policies that allowed authenticated users
-- to write to plaid_items (which holds sensitive Plaid access_tokens).
-- Only the service role (used by edge functions) should write this table.
DROP POLICY IF EXISTS "Users insert own items" ON public.plaid_items;
DROP POLICY IF EXISTS "Users update own items" ON public.plaid_items;
DROP POLICY IF EXISTS "Users delete own items" ON public.plaid_items;

-- Keep the explicit blocking policies as a defense-in-depth signal.
-- Service role bypasses RLS, so internal sync flows are unaffected.