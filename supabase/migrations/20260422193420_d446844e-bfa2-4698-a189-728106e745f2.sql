ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS beds numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS baths numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS sqft numeric;