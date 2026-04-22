
-- 1. Wipe the test user completely (cascades to all owned rows via user_id)
DELETE FROM public.subscriptions WHERE user_id = 'd28116fc-df85-42ca-bcf1-a8620641a346';
DELETE FROM public.user_roles WHERE user_id = 'd28116fc-df85-42ca-bcf1-a8620641a346';
DELETE FROM public.manual_access WHERE user_id = 'd28116fc-df85-42ca-bcf1-a8620641a346';
DELETE FROM public.family_members WHERE user_id = 'd28116fc-df85-42ca-bcf1-a8620641a346';
DELETE FROM public.properties WHERE user_id = 'd28116fc-df85-42ca-bcf1-a8620641a346';
DELETE FROM public.estate_documents WHERE user_id = 'd28116fc-df85-42ca-bcf1-a8620641a346';
DELETE FROM public.insurance_policies WHERE user_id = 'd28116fc-df85-42ca-bcf1-a8620641a346';
DELETE FROM public.transaction_rules WHERE user_id = 'd28116fc-df85-42ca-bcf1-a8620641a346';
DELETE FROM public.aggregated_transactions WHERE user_id = 'd28116fc-df85-42ca-bcf1-a8620641a346';
DELETE FROM public.aggregated_holdings WHERE user_id = 'd28116fc-df85-42ca-bcf1-a8620641a346';
DELETE FROM public.aggregated_accounts WHERE user_id = 'd28116fc-df85-42ca-bcf1-a8620641a346';
DELETE FROM public.plaid_items WHERE user_id = 'd28116fc-df85-42ca-bcf1-a8620641a346';
DELETE FROM auth.users WHERE id = 'd28116fc-df85-42ca-bcf1-a8620641a346';

-- 2. user_intake table — captures plan choice + intake form answers
CREATE TABLE public.user_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL,                          -- 'essential' | 'private' | 'family_office'
  billing_interval text NOT NULL DEFAULT 'monthly', -- 'monthly' | 'annual'
  full_name text,
  net_worth_band text,                         -- e.g. '<1M', '1-5M', '5-25M', '25M+'
  primary_goal text,
  has_advisor boolean,
  advisor_name text,
  advisor_firm text,
  advisor_email text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own intake"
  ON public.user_intake FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own intake"
  ON public.user_intake FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own intake"
  ON public.user_intake FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER user_intake_touch_updated_at
  BEFORE UPDATE ON public.user_intake
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
