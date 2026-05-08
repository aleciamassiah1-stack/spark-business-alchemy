CREATE OR REPLACE FUNCTION public.purge_expired_account_deletions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  victim record;
  purged_count integer := 0;
BEGIN
  FOR victim IN
    SELECT user_id FROM public.pending_account_deletions
    WHERE purge_after <= now()
  LOOP
    DELETE FROM public.aggregated_transactions WHERE user_id = victim.user_id;
    DELETE FROM public.aggregated_holdings WHERE user_id = victim.user_id;
    DELETE FROM public.aggregated_liabilities WHERE user_id = victim.user_id;
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

    DELETE FROM auth.users WHERE id = victim.user_id;

    DELETE FROM public.pending_account_deletions WHERE user_id = victim.user_id;
    purged_count := purged_count + 1;
  END LOOP;

  RETURN purged_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_purge_user_by_email(target_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  victim_id uuid;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT id INTO victim_id FROM auth.users WHERE lower(email) = lower(target_email);
  IF victim_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'email', target_email);
  END IF;

  DELETE FROM public.aggregated_transactions WHERE user_id = victim_id;
  DELETE FROM public.aggregated_holdings    WHERE user_id = victim_id;
  DELETE FROM public.aggregated_liabilities WHERE user_id = victim_id;
  DELETE FROM public.aggregated_accounts    WHERE user_id = victim_id;
  DELETE FROM public.plaid_items            WHERE user_id = victim_id;
  DELETE FROM public.sync_log               WHERE user_id = victim_id;
  DELETE FROM public.transaction_rules      WHERE user_id = victim_id;
  DELETE FROM public.estate_documents       WHERE user_id = victim_id;
  DELETE FROM public.insurance_policies     WHERE user_id = victim_id;
  DELETE FROM public.property_valuations    WHERE user_id = victim_id;
  DELETE FROM public.properties             WHERE user_id = victim_id;
  DELETE FROM public.family_members         WHERE user_id = victim_id;
  DELETE FROM public.user_intake            WHERE user_id = victim_id;
  DELETE FROM public.subscriptions          WHERE user_id = victim_id;
  DELETE FROM public.manual_access          WHERE user_id = victim_id;
  DELETE FROM public.user_roles             WHERE user_id = victim_id;
  DELETE FROM public.pending_account_deletions WHERE user_id = victim_id;

  DELETE FROM auth.users WHERE id = victim_id;

  RETURN jsonb_build_object('found', true, 'purged_user_id', victim_id, 'email', target_email);
END;
$function$;