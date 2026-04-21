-- =================================================================
-- 1. Add user_id to all owned tables (nullable for now to allow backfill)
-- =================================================================

ALTER TABLE public.properties        ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.insurance_policies ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.estate_documents  ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.plaid_items       ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.transaction_rules ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.aggregated_accounts     ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.aggregated_holdings     ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.aggregated_transactions ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.sync_log          ADD COLUMN IF NOT EXISTS user_id uuid;

-- =================================================================
-- 2. Backfill existing rows to the first existing user (demo data owner)
-- =================================================================

DO $$
DECLARE
  fallback_uid uuid;
BEGIN
  SELECT id INTO fallback_uid FROM auth.users ORDER BY created_at ASC LIMIT 1;

  IF fallback_uid IS NOT NULL THEN
    UPDATE public.properties             SET user_id = fallback_uid WHERE user_id IS NULL;
    UPDATE public.insurance_policies     SET user_id = fallback_uid WHERE user_id IS NULL;
    UPDATE public.estate_documents       SET user_id = fallback_uid WHERE user_id IS NULL;
    UPDATE public.plaid_items            SET user_id = fallback_uid WHERE user_id IS NULL;
    UPDATE public.transaction_rules      SET user_id = fallback_uid WHERE user_id IS NULL;
    UPDATE public.aggregated_accounts    SET user_id = fallback_uid WHERE user_id IS NULL;
    UPDATE public.aggregated_holdings    SET user_id = fallback_uid WHERE user_id IS NULL;
    UPDATE public.aggregated_transactions SET user_id = fallback_uid WHERE user_id IS NULL;
    UPDATE public.sync_log               SET user_id = fallback_uid WHERE user_id IS NULL;
  END IF;
END $$;

-- =================================================================
-- 3. Indexes for per-user lookups
-- =================================================================

CREATE INDEX IF NOT EXISTS idx_properties_user_id              ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_user_id               ON public.insurance_policies(user_id);
CREATE INDEX IF NOT EXISTS idx_estate_user_id                  ON public.estate_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_user_id             ON public.plaid_items(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_user_id                   ON public.transaction_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_agg_accounts_user_id            ON public.aggregated_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_agg_holdings_user_id            ON public.aggregated_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_agg_transactions_user_id        ON public.aggregated_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_user_id                ON public.sync_log(user_id);

-- =================================================================
-- 4. Trigger to auto-stamp user_id from auth.uid() on insert
--    (so existing inserts from the SDK still work)
-- =================================================================

CREATE OR REPLACE FUNCTION public.set_user_id_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_user_id_properties        ON public.properties;
DROP TRIGGER IF EXISTS trg_set_user_id_insurance         ON public.insurance_policies;
DROP TRIGGER IF EXISTS trg_set_user_id_estate            ON public.estate_documents;
DROP TRIGGER IF EXISTS trg_set_user_id_plaid_items       ON public.plaid_items;
DROP TRIGGER IF EXISTS trg_set_user_id_rules             ON public.transaction_rules;
DROP TRIGGER IF EXISTS trg_set_user_id_agg_accounts      ON public.aggregated_accounts;
DROP TRIGGER IF EXISTS trg_set_user_id_agg_holdings      ON public.aggregated_holdings;
DROP TRIGGER IF EXISTS trg_set_user_id_agg_transactions  ON public.aggregated_transactions;
DROP TRIGGER IF EXISTS trg_set_user_id_sync_log          ON public.sync_log;

CREATE TRIGGER trg_set_user_id_properties        BEFORE INSERT ON public.properties             FOR EACH ROW EXECUTE FUNCTION public.set_user_id_default();
CREATE TRIGGER trg_set_user_id_insurance         BEFORE INSERT ON public.insurance_policies     FOR EACH ROW EXECUTE FUNCTION public.set_user_id_default();
CREATE TRIGGER trg_set_user_id_estate            BEFORE INSERT ON public.estate_documents       FOR EACH ROW EXECUTE FUNCTION public.set_user_id_default();
CREATE TRIGGER trg_set_user_id_plaid_items       BEFORE INSERT ON public.plaid_items            FOR EACH ROW EXECUTE FUNCTION public.set_user_id_default();
CREATE TRIGGER trg_set_user_id_rules             BEFORE INSERT ON public.transaction_rules      FOR EACH ROW EXECUTE FUNCTION public.set_user_id_default();
CREATE TRIGGER trg_set_user_id_agg_accounts      BEFORE INSERT ON public.aggregated_accounts    FOR EACH ROW EXECUTE FUNCTION public.set_user_id_default();
CREATE TRIGGER trg_set_user_id_agg_holdings      BEFORE INSERT ON public.aggregated_holdings    FOR EACH ROW EXECUTE FUNCTION public.set_user_id_default();
CREATE TRIGGER trg_set_user_id_agg_transactions  BEFORE INSERT ON public.aggregated_transactions FOR EACH ROW EXECUTE FUNCTION public.set_user_id_default();
CREATE TRIGGER trg_set_user_id_sync_log          BEFORE INSERT ON public.sync_log               FOR EACH ROW EXECUTE FUNCTION public.set_user_id_default();

-- =================================================================
-- 5. Drop ALL existing public/permissive policies, recreate as owner-only
-- =================================================================

-- properties
DROP POLICY IF EXISTS "Public can read properties"   ON public.properties;
DROP POLICY IF EXISTS "Public can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Public can update properties" ON public.properties;
DROP POLICY IF EXISTS "Public can delete properties" ON public.properties;

CREATE POLICY "Users view own properties"   ON public.properties FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own properties" ON public.properties FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own properties" ON public.properties FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own properties" ON public.properties FOR DELETE TO authenticated USING (user_id = auth.uid());

-- insurance_policies
DROP POLICY IF EXISTS "Public can read insurance"   ON public.insurance_policies;
DROP POLICY IF EXISTS "Public can insert insurance" ON public.insurance_policies;
DROP POLICY IF EXISTS "Public can update insurance" ON public.insurance_policies;
DROP POLICY IF EXISTS "Public can delete insurance" ON public.insurance_policies;

CREATE POLICY "Users view own policies"   ON public.insurance_policies FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own policies" ON public.insurance_policies FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own policies" ON public.insurance_policies FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own policies" ON public.insurance_policies FOR DELETE TO authenticated USING (user_id = auth.uid());

-- estate_documents
DROP POLICY IF EXISTS "Public can read estate"   ON public.estate_documents;
DROP POLICY IF EXISTS "Public can insert estate" ON public.estate_documents;
DROP POLICY IF EXISTS "Public can update estate" ON public.estate_documents;
DROP POLICY IF EXISTS "Public can delete estate" ON public.estate_documents;

CREATE POLICY "Users view own estate"   ON public.estate_documents FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own estate" ON public.estate_documents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own estate" ON public.estate_documents FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own estate" ON public.estate_documents FOR DELETE TO authenticated USING (user_id = auth.uid());

-- plaid_items
DROP POLICY IF EXISTS "Public can read items metadata" ON public.plaid_items;

CREATE POLICY "Users view own items"   ON public.plaid_items FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own items" ON public.plaid_items FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own items" ON public.plaid_items FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own items" ON public.plaid_items FOR DELETE TO authenticated USING (user_id = auth.uid());

-- transaction_rules
DROP POLICY IF EXISTS rules_select_all ON public.transaction_rules;
DROP POLICY IF EXISTS rules_insert_all ON public.transaction_rules;
DROP POLICY IF EXISTS rules_update_all ON public.transaction_rules;
DROP POLICY IF EXISTS rules_delete_all ON public.transaction_rules;

CREATE POLICY "Users view own rules"   ON public.transaction_rules FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own rules" ON public.transaction_rules FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own rules" ON public.transaction_rules FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own rules" ON public.transaction_rules FOR DELETE TO authenticated USING (user_id = auth.uid());

-- aggregated_accounts
DROP POLICY IF EXISTS "Public can read accounts" ON public.aggregated_accounts;
CREATE POLICY "Users view own accounts" ON public.aggregated_accounts FOR SELECT TO authenticated USING (user_id = auth.uid());
-- Inserts/updates done via service role (server functions). No client write policies.

-- aggregated_holdings
DROP POLICY IF EXISTS "Public can read holdings" ON public.aggregated_holdings;
CREATE POLICY "Users view own holdings" ON public.aggregated_holdings FOR SELECT TO authenticated USING (user_id = auth.uid());

-- aggregated_transactions
DROP POLICY IF EXISTS "Public can read transactions" ON public.aggregated_transactions;
CREATE POLICY "Users view own transactions" ON public.aggregated_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());

-- sync_log
DROP POLICY IF EXISTS "Public can read sync log" ON public.sync_log;
CREATE POLICY "Users view own sync log" ON public.sync_log FOR SELECT TO authenticated USING (user_id = auth.uid());

-- =================================================================
-- 6. Storage rules: users only access files in their own folder
--    Path convention: "<user_id>/<insurance|estate>/<filename>"
-- =================================================================

DROP POLICY IF EXISTS "Users read own wealth docs"   ON storage.objects;
DROP POLICY IF EXISTS "Users upload own wealth docs" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own wealth docs" ON storage.objects;

CREATE POLICY "Users read own wealth docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'wealth-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own wealth docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'wealth-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own wealth docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'wealth-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
