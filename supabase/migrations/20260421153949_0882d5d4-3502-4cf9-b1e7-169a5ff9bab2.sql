
-- Plaid items (one per connected institution)
CREATE TABLE public.plaid_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  institution_id TEXT,
  institution_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Aggregated accounts (balances)
CREATE TABLE public.aggregated_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.plaid_items(id) ON DELETE CASCADE,
  plaid_account_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  official_name TEXT,
  mask TEXT,
  type TEXT NOT NULL,
  subtype TEXT,
  current_balance NUMERIC(18,2),
  available_balance NUMERIC(18,2),
  iso_currency_code TEXT DEFAULT 'USD',
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_aggregated_accounts_item ON public.aggregated_accounts(item_id);

-- Aggregated holdings (investments)
CREATE TABLE public.aggregated_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.aggregated_accounts(id) ON DELETE CASCADE,
  security_id TEXT,
  ticker TEXT,
  name TEXT,
  type TEXT,
  quantity NUMERIC(18,6),
  institution_price NUMERIC(18,4),
  institution_value NUMERIC(18,2),
  cost_basis NUMERIC(18,2),
  iso_currency_code TEXT DEFAULT 'USD',
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_aggregated_holdings_account ON public.aggregated_holdings(account_id);

-- Sync log
CREATE TABLE public.sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.plaid_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  accounts_updated INTEGER DEFAULT 0,
  holdings_updated INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_log_created ON public.sync_log(created_at DESC);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_plaid_items_updated_at
BEFORE UPDATE ON public.plaid_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.plaid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aggregated_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aggregated_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

-- Demo policies: public read of non-sensitive data; writes only via service role (server functions)
-- Never expose access_token to clients
CREATE POLICY "Public can read items metadata"
  ON public.plaid_items FOR SELECT
  USING (true);

CREATE POLICY "Public can read accounts"
  ON public.aggregated_accounts FOR SELECT
  USING (true);

CREATE POLICY "Public can read holdings"
  ON public.aggregated_holdings FOR SELECT
  USING (true);

CREATE POLICY "Public can read sync log"
  ON public.sync_log FOR SELECT
  USING (true);
