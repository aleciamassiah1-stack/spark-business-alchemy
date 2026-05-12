
-- Add date of birth to intake (used for identity confirmation on link requests)
ALTER TABLE public.user_intake ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Status enum
DO $$ BEGIN
  CREATE TYPE public.family_link_status AS ENUM (
    'pending_recipient', 'declined_recipient', 'pending_admin', 'approved', 'declined_admin', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.family_link_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id uuid NOT NULL,
  recipient_email text NOT NULL,
  recipient_dob date NOT NULL,
  recipient_user_id uuid,
  status public.family_link_status NOT NULL DEFAULT 'pending_recipient',
  message text,
  dob_match boolean,
  admin_notes text,
  admin_reviewed_by uuid,
  admin_reviewed_at timestamptz,
  recipient_responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flr_requester ON public.family_link_requests(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_flr_recipient_user ON public.family_link_requests(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_flr_recipient_email ON public.family_link_requests(lower(recipient_email));
CREATE INDEX IF NOT EXISTS idx_flr_status ON public.family_link_requests(status);

ALTER TABLE public.family_link_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own link requests"
  ON public.family_link_requests FOR SELECT TO authenticated
  USING (requester_user_id = auth.uid() OR recipient_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own link requests"
  ON public.family_link_requests FOR INSERT TO authenticated
  WITH CHECK (requester_user_id = auth.uid());

CREATE POLICY "Recipients/requesters/admins update link requests"
  ON public.family_link_requests FOR UPDATE TO authenticated
  USING (requester_user_id = auth.uid() OR recipient_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (requester_user_id = auth.uid() OR recipient_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete link requests"
  ON public.family_link_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_flr_updated_at
  BEFORE UPDATE ON public.family_link_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Approved links between two users (sorted pair, unique)
CREATE TABLE IF NOT EXISTS public.family_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  request_id uuid REFERENCES public.family_link_requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT family_links_sorted CHECK (user_a < user_b),
  CONSTRAINT family_links_unique UNIQUE (user_a, user_b)
);

CREATE INDEX IF NOT EXISTS idx_family_links_a ON public.family_links(user_a);
CREATE INDEX IF NOT EXISTS idx_family_links_b ON public.family_links(user_b);

ALTER TABLE public.family_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own family links"
  ON public.family_links FOR SELECT TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage family links"
  ON public.family_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
