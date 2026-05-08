ALTER TABLE public.plaid_items
ADD COLUMN IF NOT EXISTS new_accounts_available boolean NOT NULL DEFAULT false;