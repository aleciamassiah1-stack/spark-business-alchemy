-- 1) plaid_items: RESTRICTIVE policy ensures only service_role can ever touch the table,
-- regardless of any permissive policies that may exist now or be added later.
DROP POLICY IF EXISTS "Service role only on plaid_items" ON public.plaid_items;
CREATE POLICY "Service role only on plaid_items"
ON public.plaid_items
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 2) user_intake: remove delegated-profile-member access so SSN hash and DOB
-- can only be read/written by the profile owner themselves.
DROP POLICY IF EXISTS "Profile members view intake" ON public.user_intake;
DROP POLICY IF EXISTS "Profile members update intake" ON public.user_intake;
DROP POLICY IF EXISTS "Profile members insert intake" ON public.user_intake;