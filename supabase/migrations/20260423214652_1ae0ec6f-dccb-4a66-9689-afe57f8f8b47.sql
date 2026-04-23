-- Defense-in-depth: explicitly deny SELECT to authenticated users on plaid_items.
-- Service role bypasses RLS, so server functions still work.
-- Without an explicit SELECT policy + RLS enabled, the default is already deny,
-- but having an explicit policy silences security scanners and makes intent clear.
DROP POLICY IF EXISTS "Block authenticated select plaid_items" ON public.plaid_items;
CREATE POLICY "Block authenticated select plaid_items"
  ON public.plaid_items
  FOR SELECT
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Block authenticated delete plaid_items" ON public.plaid_items;
CREATE POLICY "Block authenticated delete plaid_items"
  ON public.plaid_items
  FOR DELETE
  TO authenticated
  USING (false);