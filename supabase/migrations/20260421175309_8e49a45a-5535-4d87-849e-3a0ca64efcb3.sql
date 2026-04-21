
-- Properties (real estate)
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  property_type TEXT DEFAULT 'residential',
  estimated_value NUMERIC NOT NULL DEFAULT 0,
  mortgage_balance NUMERIC DEFAULT 0,
  purchase_price NUMERIC,
  purchase_date DATE,
  iso_currency_code TEXT DEFAULT 'USD',
  last_valued_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read properties" ON public.properties FOR SELECT USING (true);
CREATE POLICY "Public can insert properties" ON public.properties FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update properties" ON public.properties FOR UPDATE USING (true);
CREATE POLICY "Public can delete properties" ON public.properties FOR DELETE USING (true);

CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insurance policies
CREATE TABLE public.insurance_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_type TEXT NOT NULL, -- life, auto, home, umbrella, health, disability
  insurer_name TEXT NOT NULL,
  policy_number TEXT,
  coverage_amount NUMERIC,
  premium_amount NUMERIC,
  premium_frequency TEXT DEFAULT 'monthly', -- monthly, annual, semi-annual
  renewal_date DATE,
  beneficiaries JSONB DEFAULT '[]'::jsonb,
  document_url TEXT,
  document_path TEXT,
  parsed_by_ai BOOLEAN DEFAULT false,
  raw_extraction JSONB,
  status TEXT DEFAULT 'active', -- active, expired, pending_review
  iso_currency_code TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read insurance" ON public.insurance_policies FOR SELECT USING (true);
CREATE POLICY "Public can insert insurance" ON public.insurance_policies FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update insurance" ON public.insurance_policies FOR UPDATE USING (true);
CREATE POLICY "Public can delete insurance" ON public.insurance_policies FOR DELETE USING (true);

CREATE TRIGGER update_insurance_updated_at
BEFORE UPDATE ON public.insurance_policies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Estate documents
CREATE TABLE public.estate_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type TEXT NOT NULL, -- will, healthcare_directive, power_of_attorney, trust, other
  title TEXT NOT NULL,
  document_url TEXT,
  document_path TEXT,
  status TEXT DEFAULT 'current', -- current, needs_review, expired
  signed_date DATE,
  expiration_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.estate_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read estate" ON public.estate_documents FOR SELECT USING (true);
CREATE POLICY "Public can insert estate" ON public.estate_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update estate" ON public.estate_documents FOR UPDATE USING (true);
CREATE POLICY "Public can delete estate" ON public.estate_documents FOR DELETE USING (true);

CREATE TRIGGER update_estate_updated_at
BEFORE UPDATE ON public.estate_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Banking transactions (pulled from Plaid)
CREATE TABLE public.aggregated_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL,
  plaid_transaction_id TEXT NOT NULL UNIQUE,
  amount NUMERIC NOT NULL,
  iso_currency_code TEXT DEFAULT 'USD',
  date DATE NOT NULL,
  name TEXT NOT NULL,
  merchant_name TEXT,
  category TEXT,
  category_detailed TEXT,
  payment_channel TEXT,
  pending BOOLEAN DEFAULT false,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_account ON public.aggregated_transactions(account_id);
CREATE INDEX idx_transactions_date ON public.aggregated_transactions(date DESC);

ALTER TABLE public.aggregated_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read transactions" ON public.aggregated_transactions FOR SELECT USING (true);

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('wealth-documents', 'wealth-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can upload wealth documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'wealth-documents');

CREATE POLICY "Public can read wealth documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'wealth-documents');

CREATE POLICY "Public can update wealth documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'wealth-documents');

CREATE POLICY "Public can delete wealth documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'wealth-documents');
