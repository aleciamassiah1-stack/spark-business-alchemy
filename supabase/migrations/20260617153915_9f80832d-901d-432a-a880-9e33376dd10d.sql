CREATE TABLE public.will_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.will_drafts TO authenticated;
GRANT ALL ON public.will_drafts TO service_role;

ALTER TABLE public.will_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own will drafts"
  ON public.will_drafts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX will_drafts_user_id_idx ON public.will_drafts(user_id);

CREATE TRIGGER set_will_drafts_user_id
  BEFORE INSERT ON public.will_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id_default();

CREATE TRIGGER update_will_drafts_updated_at
  BEFORE UPDATE ON public.will_drafts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();