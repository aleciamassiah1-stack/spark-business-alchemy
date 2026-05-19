CREATE TABLE public.tier_denial_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tier text,
  action text NOT NULL,
  reason text NOT NULL,
  limit_value integer,
  current_count integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tier_denial_log_user_id ON public.tier_denial_log(user_id);
CREATE INDEX idx_tier_denial_log_created_at ON public.tier_denial_log(created_at DESC);

ALTER TABLE public.tier_denial_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read tier denial log"
  ON public.tier_denial_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users read own tier denial log"
  ON public.tier_denial_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role manages tier denial log"
  ON public.tier_denial_log FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');