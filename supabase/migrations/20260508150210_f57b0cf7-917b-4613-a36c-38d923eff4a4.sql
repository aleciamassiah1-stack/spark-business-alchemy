CREATE TABLE public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('terms', 'privacy', 'plaid_disclosure')),
  version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_consents_user_kind ON public.user_consents (user_id, kind, accepted_at DESC);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own consents"
  ON public.user_consents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own consents"
  ON public.user_consents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins read all consents"
  ON public.user_consents FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));