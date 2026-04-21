-- 1. Add custom_category column to preserve original Plaid category
ALTER TABLE public.aggregated_transactions
  ADD COLUMN IF NOT EXISTS custom_category text,
  ADD COLUMN IF NOT EXISTS applied_rule_id uuid;

-- 2. Create transaction_rules table
CREATE TABLE IF NOT EXISTS public.transaction_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  priority integer NOT NULL DEFAULT 100,
  -- Pattern fields (any combination — all provided must match)
  merchant_pattern text,           -- substring match (case-insensitive) on merchant_name OR name
  match_type text NOT NULL DEFAULT 'contains' CHECK (match_type IN ('exact','contains','starts_with')),
  description_keyword text,        -- substring on transaction name
  amount_min numeric,              -- inclusive lower bound (absolute value)
  amount_max numeric,              -- inclusive upper bound (absolute value)
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transaction_rules_priority_idx
  ON public.transaction_rules (priority ASC) WHERE enabled = true;

-- 3. RLS — single-user app, allow all
ALTER TABLE public.transaction_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rules_select_all" ON public.transaction_rules;
DROP POLICY IF EXISTS "rules_insert_all" ON public.transaction_rules;
DROP POLICY IF EXISTS "rules_update_all" ON public.transaction_rules;
DROP POLICY IF EXISTS "rules_delete_all" ON public.transaction_rules;

CREATE POLICY "rules_select_all" ON public.transaction_rules FOR SELECT USING (true);
CREATE POLICY "rules_insert_all" ON public.transaction_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "rules_update_all" ON public.transaction_rules FOR UPDATE USING (true);
CREATE POLICY "rules_delete_all" ON public.transaction_rules FOR DELETE USING (true);

-- 4. updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transaction_rules_touch ON public.transaction_rules;
CREATE TRIGGER transaction_rules_touch
  BEFORE UPDATE ON public.transaction_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. apply_transaction_rules — recategorize matching transactions
CREATE OR REPLACE FUNCTION public.apply_transaction_rules(target_rule_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rule_record record;
  total_updated integer := 0;
  rows_updated integer := 0;
BEGIN
  -- Clear matches for the targeted rule(s) so removed/edited rules don't linger
  IF target_rule_id IS NOT NULL THEN
    UPDATE public.aggregated_transactions
       SET custom_category = NULL, applied_rule_id = NULL
     WHERE applied_rule_id = target_rule_id;
  ELSE
    UPDATE public.aggregated_transactions
       SET custom_category = NULL, applied_rule_id = NULL
     WHERE applied_rule_id IS NOT NULL;
  END IF;

  -- Apply rules in priority order (ascending = highest priority first)
  FOR rule_record IN
    SELECT * FROM public.transaction_rules
     WHERE enabled = true
       AND (target_rule_id IS NULL OR id = target_rule_id)
     ORDER BY priority ASC, created_at ASC
  LOOP
    UPDATE public.aggregated_transactions t
       SET custom_category = rule_record.category,
           applied_rule_id = rule_record.id
     WHERE t.applied_rule_id IS NULL  -- first match wins
       AND (
         rule_record.merchant_pattern IS NULL
         OR (
           rule_record.match_type = 'exact' AND (
             lower(coalesce(t.merchant_name, '')) = lower(rule_record.merchant_pattern)
             OR lower(t.name) = lower(rule_record.merchant_pattern)
           )
         )
         OR (
           rule_record.match_type = 'contains' AND (
             lower(coalesce(t.merchant_name, '')) LIKE '%' || lower(rule_record.merchant_pattern) || '%'
             OR lower(t.name) LIKE '%' || lower(rule_record.merchant_pattern) || '%'
           )
         )
         OR (
           rule_record.match_type = 'starts_with' AND (
             lower(coalesce(t.merchant_name, '')) LIKE lower(rule_record.merchant_pattern) || '%'
             OR lower(t.name) LIKE lower(rule_record.merchant_pattern) || '%'
           )
         )
       )
       AND (
         rule_record.description_keyword IS NULL
         OR lower(t.name) LIKE '%' || lower(rule_record.description_keyword) || '%'
       )
       AND (rule_record.amount_min IS NULL OR abs(t.amount) >= rule_record.amount_min)
       AND (rule_record.amount_max IS NULL OR abs(t.amount) <= rule_record.amount_max);

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    total_updated := total_updated + rows_updated;
  END LOOP;

  RETURN total_updated;
END;
$$;