CREATE TABLE public.aggregated_liabilities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  liability_type text NOT NULL CHECK (liability_type IN ('credit','student','mortgage')),
  last_payment_amount numeric,
  last_payment_date date,
  next_payment_due_date date,
  minimum_payment_amount numeric,
  apr numeric,
  interest_rate_percentage numeric,
  interest_rate_type text,
  origination_date date,
  expected_payoff_date date,
  last_statement_balance numeric,
  last_statement_issue_date date,
  escrow_balance numeric,
  ytd_interest_paid numeric,
  ytd_principal_paid numeric,
  loan_name text,
  loan_status text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  iso_currency_code text DEFAULT 'USD',
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX aggregated_liabilities_account_type_uniq
  ON public.aggregated_liabilities (account_id, liability_type);

CREATE INDEX aggregated_liabilities_user_idx
  ON public.aggregated_liabilities (user_id);

ALTER TABLE public.aggregated_liabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own liabilities"
  ON public.aggregated_liabilities FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own liabilities"
  ON public.aggregated_liabilities FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own liabilities"
  ON public.aggregated_liabilities FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own liabilities"
  ON public.aggregated_liabilities FOR DELETE TO authenticated
  USING (user_id = auth.uid());