-- 1. Add provider + Apple/RevenueCat identifier columns
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS apple_original_transaction_id text,
  ADD COLUMN IF NOT EXISTS revenuecat_app_user_id text;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_provider_check
  CHECK (provider IN ('stripe', 'apple'));

-- 2. Stripe fields must become nullable so Apple rows can exist
ALTER TABLE public.subscriptions
  ALTER COLUMN stripe_subscription_id DROP NOT NULL,
  ALTER COLUMN stripe_customer_id DROP NOT NULL,
  ALTER COLUMN product_id DROP NOT NULL;

-- 3. Replace the blanket UNIQUE on stripe_subscription_id with a partial
--    index scoped to Stripe rows only, so multiple Apple rows with NULL
--    stripe_subscription_id are allowed.
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_stripe_subscription_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_uniq
  ON public.subscriptions (stripe_subscription_id)
  WHERE provider = 'stripe' AND stripe_subscription_id IS NOT NULL;

-- 4. Idempotency for Apple webhooks: one row per (user, original_transaction_id)
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_apple_original_txn_uniq
  ON public.subscriptions (user_id, apple_original_transaction_id)
  WHERE provider = 'apple' AND apple_original_transaction_id IS NOT NULL;

-- 5. Helpful lookups
CREATE INDEX IF NOT EXISTS subscriptions_provider_user_idx
  ON public.subscriptions (user_id, provider, environment);

-- 6. Update has_active_subscription so Apple subs grant access too.
--    Existing logic (admin, manual_access, Stripe sub) is preserved verbatim.
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
    -- Active or trialing paid subscription from EITHER provider
    or exists (
      select 1 from public.subscriptions
      where user_id = user_uuid
        and environment = check_env
        and (
          (status in ('active', 'trialing') and (current_period_end is null or current_period_end > now()))
          or (status = 'canceled' and current_period_end > now())
        )
    )
$function$;