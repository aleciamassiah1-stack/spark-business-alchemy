
CREATE TABLE public.concierge_chat_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  session_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  model text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_concierge_chat_logs_session ON public.concierge_chat_logs (session_id, created_at);
CREATE INDEX idx_concierge_chat_logs_user ON public.concierge_chat_logs (user_id, created_at DESC);
CREATE INDEX idx_concierge_chat_logs_created ON public.concierge_chat_logs (created_at DESC);

ALTER TABLE public.concierge_chat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own chat logs"
  ON public.concierge_chat_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages chat logs"
  ON public.concierge_chat_logs FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
