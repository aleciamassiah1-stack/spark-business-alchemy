ALTER TABLE public.user_intake ADD COLUMN IF NOT EXISTS last_four_ssn_hash text;
ALTER TABLE public.family_link_requests ADD COLUMN IF NOT EXISTS recipient_last_four_ssn_hash text;