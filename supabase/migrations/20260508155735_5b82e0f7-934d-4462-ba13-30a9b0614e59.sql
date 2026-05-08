CREATE TABLE public.plaid_link_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  view_name text,
  institution_id text,
  institution_name text,
  request_id text,
  link_session_id text,
  error_code text,
  error_type text,
  error_message text,
  exit_status text,
  is_update_mode boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_plaid_link_events_user_created
  ON public.plaid_link_events (user_id, created_at DESC);
CREATE INDEX idx_plaid_link_events_session
  ON public.plaid_link_events (link_session_id);
CREATE INDEX idx_plaid_link_events_event_name
  ON public.plaid_link_events (event_name);

ALTER TABLE public.plaid_link_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own link events"
  ON public.plaid_link_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users view own link events"
  ON public.plaid_link_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view all link events"
  ON public.plaid_link_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));