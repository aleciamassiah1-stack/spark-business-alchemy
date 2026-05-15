CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid, check_env text DEFAULT 'live'::text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    -- Admins always have access
    public.has_role(user_uuid, 'admin')
    -- Manually granted access (unexpired)
    or exists (
      select 1 from public.manual_access
      where user_id = user_uuid
        and (expires_at is null or expires_at > now())
    )
    -- Active or trialing paid subscription from EITHER provider in the requested env
    or exists (
      select 1 from public.subscriptions
      where user_id = user_uuid
        and environment = check_env
        and (
          (status in ('active', 'trialing') and (current_period_end is null or current_period_end > now()))
          or (status = 'canceled' and current_period_end > now())
        )
    )
    -- App Review demo account: also accept SANDBOX subscriptions so the
    -- reviewer's StoreKit sandbox purchase grants access on the live build.
    or (
      user_uuid = 'dfbeec13-5ff6-4371-84e5-9eb6358ec877'::uuid
      and exists (
        select 1 from public.subscriptions
        where user_id = user_uuid
          and environment = 'sandbox'
          and (
            (status in ('active', 'trialing') and (current_period_end is null or current_period_end > now()))
            or (status = 'canceled' and current_period_end > now())
          )
      )
    )
$function$;