
CREATE TABLE public.property_valuations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  estimated_value NUMERIC NOT NULL,
  value_low NUMERIC NOT NULL,
  value_high NUMERIC NOT NULL,
  confidence TEXT NOT NULL,
  price_per_sqft NUMERIC,
  comps JSONB NOT NULL DEFAULT '[]'::jsonb,
  market_summary TEXT,
  assumptions TEXT,
  input_address TEXT,
  input_beds NUMERIC,
  input_baths NUMERIC,
  input_sqft NUMERIC,
  source TEXT NOT NULL DEFAULT 'ai',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_property_valuations_property_created
  ON public.property_valuations (property_id, created_at DESC);

CREATE INDEX idx_property_valuations_user
  ON public.property_valuations (user_id);

ALTER TABLE public.property_valuations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own valuations"
  ON public.property_valuations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own valuations"
  ON public.property_valuations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own valuations"
  ON public.property_valuations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
