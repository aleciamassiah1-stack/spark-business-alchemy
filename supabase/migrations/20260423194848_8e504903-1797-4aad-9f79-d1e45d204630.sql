-- Restrict plaid_items SELECT so end users can never read access_token via the
-- public PostgREST API. Server code uses the service role and bypasses RLS,
-- so internal sync flows are unaffected.

-- Drop the broad SELECT policy that allowed users to read every column
-- (including access_token).
DROP POLICY IF EXISTS "Users view own items" ON public.plaid_items;

-- Helper: returns the user's plaid items WITHOUT the access_token.
-- SECURITY INVOKER + auth.uid() ensures users only see their own rows.
CREATE OR REPLACE FUNCTION public.get_my_plaid_items()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  item_id text,
  institution_id text,
  institution_name text,
  status text,
  last_synced_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT id, user_id, item_id, institution_id, institution_name,
         status, last_synced_at, created_at, updated_at
  FROM public.plaid_items
  WHERE user_id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.get_my_plaid_items() TO authenticated;