
-- 1) Drop overly-permissive public-role storage policies on wealth-documents
DROP POLICY IF EXISTS "Public can read wealth documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload wealth documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can update wealth documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete wealth documents" ON storage.objects;

-- 2) aggregated_accounts: lock writes to owner; reads already scoped
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='aggregated_accounts' AND policyname='Users insert own aggregated_accounts') THEN
    CREATE POLICY "Users insert own aggregated_accounts" ON public.aggregated_accounts
      FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='aggregated_accounts' AND policyname='Users update own aggregated_accounts') THEN
    CREATE POLICY "Users update own aggregated_accounts" ON public.aggregated_accounts
      FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='aggregated_accounts' AND policyname='Users delete own aggregated_accounts') THEN
    CREATE POLICY "Users delete own aggregated_accounts" ON public.aggregated_accounts
      FOR DELETE TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- 3) aggregated_holdings
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='aggregated_holdings' AND policyname='Users insert own aggregated_holdings') THEN
    CREATE POLICY "Users insert own aggregated_holdings" ON public.aggregated_holdings
      FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='aggregated_holdings' AND policyname='Users update own aggregated_holdings') THEN
    CREATE POLICY "Users update own aggregated_holdings" ON public.aggregated_holdings
      FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='aggregated_holdings' AND policyname='Users delete own aggregated_holdings') THEN
    CREATE POLICY "Users delete own aggregated_holdings" ON public.aggregated_holdings
      FOR DELETE TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- 4) aggregated_transactions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='aggregated_transactions' AND policyname='Users insert own aggregated_transactions') THEN
    CREATE POLICY "Users insert own aggregated_transactions" ON public.aggregated_transactions
      FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='aggregated_transactions' AND policyname='Users update own aggregated_transactions') THEN
    CREATE POLICY "Users update own aggregated_transactions" ON public.aggregated_transactions
      FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='aggregated_transactions' AND policyname='Users delete own aggregated_transactions') THEN
    CREATE POLICY "Users delete own aggregated_transactions" ON public.aggregated_transactions
      FOR DELETE TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- 5) sync_log
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sync_log' AND policyname='Users insert own sync_log') THEN
    CREATE POLICY "Users insert own sync_log" ON public.sync_log
      FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sync_log' AND policyname='Users update own sync_log') THEN
    CREATE POLICY "Users update own sync_log" ON public.sync_log
      FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sync_log' AND policyname='Users delete own sync_log') THEN
    CREATE POLICY "Users delete own sync_log" ON public.sync_log
      FOR DELETE TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- 6) property_valuations: add missing UPDATE policy
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='property_valuations' AND policyname='Users update own property_valuations') THEN
    CREATE POLICY "Users update own property_valuations" ON public.property_valuations
      FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 7) plaid_items: prevent users from writing their own access tokens; only service_role can write
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='plaid_items' AND policyname='Block authenticated insert plaid_items') THEN
    CREATE POLICY "Block authenticated insert plaid_items" ON public.plaid_items
      FOR INSERT TO authenticated WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='plaid_items' AND policyname='Block authenticated update plaid_items') THEN
    CREATE POLICY "Block authenticated update plaid_items" ON public.plaid_items
      FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;
