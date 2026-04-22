-- Pending account deletions: soft-delete with 30-day grace period
CREATE TABLE public.pending_account_deletions (
  user_id uuid PRIMARY KEY,
  email text,
  scheduled_at timestamp with time zone NOT NULL DEFAULT now(),
  purge_after timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days'),
  requested_by uuid,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_account_deletions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all pending deletions
CREATE POLICY "Admins manage pending deletions"
ON public.pending_account_deletions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can read their own pending deletion (so the app can warn them)
CREATE POLICY "Users read own pending deletion"
ON public.pending_account_deletions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Purge function: deletes all rows whose grace period has expired.
-- Cascades through public tables that store user_id, then removes the auth user.
CREATE OR REPLACE FUNCTION public.purge_expired_account_deletions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  victim record;
  purged_count integer := 0;
BEGIN
  FOR victim IN
    SELECT user_id FROM public.pending_account_deletions
    WHERE purge_after <= now()
  LOOP
    -- Application data keyed by user_id
    DELETE FROM public.aggregated_transactions WHERE user_id = victim.user_id;
    DELETE FROM public.aggregated_holdings WHERE user_id = victim.user_id;
    DELETE FROM public.aggregated_accounts WHERE user_id = victim.user_id;
    DELETE FROM public.plaid_items WHERE user_id = victim.user_id;
    DELETE FROM public.sync_log WHERE user_id = victim.user_id;
    DELETE FROM public.transaction_rules WHERE user_id = victim.user_id;
    DELETE FROM public.estate_documents WHERE user_id = victim.user_id;
    DELETE FROM public.insurance_policies WHERE user_id = victim.user_id;
    DELETE FROM public.properties WHERE user_id = victim.user_id;
    DELETE FROM public.property_valuations WHERE user_id = victim.user_id;
    DELETE FROM public.family_members WHERE user_id = victim.user_id;
    DELETE FROM public.user_intake WHERE user_id = victim.user_id;
    DELETE FROM public.subscriptions WHERE user_id = victim.user_id;
    DELETE FROM public.manual_access WHERE user_id = victim.user_id;
    DELETE FROM public.user_roles WHERE user_id = victim.user_id;

    -- Remove the auth user (cascades to auth.identities, sessions, etc.)
    DELETE FROM auth.users WHERE id = victim.user_id;

    DELETE FROM public.pending_account_deletions WHERE user_id = victim.user_id;
    purged_count := purged_count + 1;
  END LOOP;

  RETURN purged_count;
END;
$$;

-- Daily cron: purge expired soft-deleted accounts at 03:00 UTC
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'purge-expired-account-deletions',
  '0 3 * * *',
  $$ SELECT public.purge_expired_account_deletions(); $$
);