
-- =====================================================================
-- 1. Managed profiles + profile access
-- =====================================================================

CREATE TABLE public.managed_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  display_name text NOT NULL,
  relationship text,
  date_of_birth date,
  initials text,
  color text,
  is_self boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_managed_profiles_owner ON public.managed_profiles(owner_user_id);

ALTER TABLE public.managed_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profile_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.managed_profiles(id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, auth_user_id)
);

CREATE INDEX idx_profile_access_user ON public.profile_access(auth_user_id);
CREATE INDEX idx_profile_access_profile ON public.profile_access(profile_id);

ALTER TABLE public.profile_access ENABLE ROW LEVEL SECURITY;

-- Security definer to check if current user can act as a given profile_id.
-- profile_id here is the uuid stored in existing wealth tables' user_id column.
-- It matches when: (a) it equals auth.uid() (legacy own data), or
-- (b) it's a managed_profile the user has access to.
CREATE OR REPLACE FUNCTION public.has_profile_access(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profile_access
      WHERE auth_user_id = auth.uid()
        AND profile_id = _profile_id
    )
    OR EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      JOIN public.profile_access pa ON pa.profile_id = mp.id
      WHERE pa.auth_user_id = auth.uid()
        AND mp.id = _profile_id
    )
$$;

-- RLS for managed_profiles
CREATE POLICY "Users view profiles they can access"
  ON public.managed_profiles FOR SELECT TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profile_access
      WHERE profile_id = managed_profiles.id
        AND auth_user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users insert own profiles"
  ON public.managed_profiles FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owners update own profiles"
  ON public.managed_profiles FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owners delete own non-self profiles"
  ON public.managed_profiles FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid() AND is_self = false);

-- RLS for profile_access
CREATE POLICY "Users view own access rows"
  ON public.profile_access FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.id = profile_access.profile_id
        AND mp.owner_user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Owners grant access to their profiles"
  ON public.profile_access FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.id = profile_access.profile_id
        AND mp.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Owners revoke access to their profiles"
  ON public.profile_access FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.id = profile_access.profile_id
        AND mp.owner_user_id = auth.uid()
    )
  );

-- updated_at trigger
CREATE TRIGGER managed_profiles_touch
  BEFORE UPDATE ON public.managed_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================================
-- 2. Backfill: every existing auth user gets a self-profile
-- =====================================================================

INSERT INTO public.managed_profiles (id, owner_user_id, display_name, is_self, initials)
SELECT
  u.id, u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'Self'),
  true,
  upper(substring(COALESCE(u.raw_user_meta_data->>'full_name', u.email, 'S'), 1, 2))
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.managed_profiles mp WHERE mp.id = u.id
);

INSERT INTO public.profile_access (profile_id, auth_user_id, role)
SELECT mp.id, mp.owner_user_id, 'owner'
FROM public.managed_profiles mp
WHERE mp.is_self = true
ON CONFLICT (profile_id, auth_user_id) DO NOTHING;

-- Auto-create self-profile for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.managed_profiles (id, owner_user_id, display_name, is_self, initials)
  VALUES (
    NEW.id, NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1), 'Self'),
    true,
    upper(substring(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'S'), 1, 2))
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profile_access (profile_id, auth_user_id, role)
  VALUES (NEW.id, NEW.id, 'owner')
  ON CONFLICT (profile_id, auth_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- =====================================================================
-- 3. Extend wealth-table RLS to allow access via managed profiles
--    Strategy: add additional permissive policies using has_profile_access().
--    Existing user_id = auth.uid() policies remain intact (additive).
-- =====================================================================

-- aggregated_accounts
CREATE POLICY "Profile members view accounts"
  ON public.aggregated_accounts FOR SELECT TO authenticated
  USING (has_profile_access(user_id));
CREATE POLICY "Profile members insert accounts"
  ON public.aggregated_accounts FOR INSERT TO authenticated
  WITH CHECK (has_profile_access(user_id));
CREATE POLICY "Profile members update accounts"
  ON public.aggregated_accounts FOR UPDATE TO authenticated
  USING (has_profile_access(user_id)) WITH CHECK (has_profile_access(user_id));
CREATE POLICY "Profile members delete accounts"
  ON public.aggregated_accounts FOR DELETE TO authenticated
  USING (has_profile_access(user_id));

-- aggregated_holdings
CREATE POLICY "Profile members view holdings"
  ON public.aggregated_holdings FOR SELECT TO authenticated
  USING (has_profile_access(user_id));
CREATE POLICY "Profile members insert holdings"
  ON public.aggregated_holdings FOR INSERT TO authenticated
  WITH CHECK (has_profile_access(user_id));
CREATE POLICY "Profile members update holdings"
  ON public.aggregated_holdings FOR UPDATE TO authenticated
  USING (has_profile_access(user_id)) WITH CHECK (has_profile_access(user_id));
CREATE POLICY "Profile members delete holdings"
  ON public.aggregated_holdings FOR DELETE TO authenticated
  USING (has_profile_access(user_id));

-- aggregated_liabilities
CREATE POLICY "Profile members view liabilities"
  ON public.aggregated_liabilities FOR SELECT TO authenticated
  USING (has_profile_access(user_id));
CREATE POLICY "Profile members insert liabilities"
  ON public.aggregated_liabilities FOR INSERT TO authenticated
  WITH CHECK (has_profile_access(user_id));
CREATE POLICY "Profile members update liabilities"
  ON public.aggregated_liabilities FOR UPDATE TO authenticated
  USING (has_profile_access(user_id)) WITH CHECK (has_profile_access(user_id));
CREATE POLICY "Profile members delete liabilities"
  ON public.aggregated_liabilities FOR DELETE TO authenticated
  USING (has_profile_access(user_id));

-- aggregated_transactions
CREATE POLICY "Profile members view transactions"
  ON public.aggregated_transactions FOR SELECT TO authenticated
  USING (has_profile_access(user_id));
CREATE POLICY "Profile members insert transactions"
  ON public.aggregated_transactions FOR INSERT TO authenticated
  WITH CHECK (has_profile_access(user_id));
CREATE POLICY "Profile members update transactions"
  ON public.aggregated_transactions FOR UPDATE TO authenticated
  USING (has_profile_access(user_id)) WITH CHECK (has_profile_access(user_id));
CREATE POLICY "Profile members delete transactions"
  ON public.aggregated_transactions FOR DELETE TO authenticated
  USING (has_profile_access(user_id));

-- properties
CREATE POLICY "Profile members view properties"
  ON public.properties FOR SELECT TO authenticated
  USING (has_profile_access(user_id));
CREATE POLICY "Profile members insert properties"
  ON public.properties FOR INSERT TO authenticated
  WITH CHECK (has_profile_access(user_id));
CREATE POLICY "Profile members update properties"
  ON public.properties FOR UPDATE TO authenticated
  USING (has_profile_access(user_id)) WITH CHECK (has_profile_access(user_id));
CREATE POLICY "Profile members delete properties"
  ON public.properties FOR DELETE TO authenticated
  USING (has_profile_access(user_id));

-- property_valuations
CREATE POLICY "Profile members view valuations"
  ON public.property_valuations FOR SELECT TO authenticated
  USING (has_profile_access(user_id));
CREATE POLICY "Profile members insert valuations"
  ON public.property_valuations FOR INSERT TO authenticated
  WITH CHECK (has_profile_access(user_id));
CREATE POLICY "Profile members update valuations"
  ON public.property_valuations FOR UPDATE TO authenticated
  USING (has_profile_access(user_id)) WITH CHECK (has_profile_access(user_id));
CREATE POLICY "Profile members delete valuations"
  ON public.property_valuations FOR DELETE TO authenticated
  USING (has_profile_access(user_id));

-- insurance_policies
CREATE POLICY "Profile members view policies"
  ON public.insurance_policies FOR SELECT TO authenticated
  USING (has_profile_access(user_id));
CREATE POLICY "Profile members insert policies"
  ON public.insurance_policies FOR INSERT TO authenticated
  WITH CHECK (has_profile_access(user_id));
CREATE POLICY "Profile members update policies"
  ON public.insurance_policies FOR UPDATE TO authenticated
  USING (has_profile_access(user_id)) WITH CHECK (has_profile_access(user_id));
CREATE POLICY "Profile members delete policies"
  ON public.insurance_policies FOR DELETE TO authenticated
  USING (has_profile_access(user_id));

-- estate_documents
CREATE POLICY "Profile members view estate"
  ON public.estate_documents FOR SELECT TO authenticated
  USING (has_profile_access(user_id));
CREATE POLICY "Profile members insert estate"
  ON public.estate_documents FOR INSERT TO authenticated
  WITH CHECK (has_profile_access(user_id));
CREATE POLICY "Profile members update estate"
  ON public.estate_documents FOR UPDATE TO authenticated
  USING (has_profile_access(user_id)) WITH CHECK (has_profile_access(user_id));
CREATE POLICY "Profile members delete estate"
  ON public.estate_documents FOR DELETE TO authenticated
  USING (has_profile_access(user_id));

-- family_members
CREATE POLICY "Profile members view family"
  ON public.family_members FOR SELECT TO authenticated
  USING (has_profile_access(user_id));
CREATE POLICY "Profile members insert family"
  ON public.family_members FOR INSERT TO authenticated
  WITH CHECK (has_profile_access(user_id));
CREATE POLICY "Profile members update family"
  ON public.family_members FOR UPDATE TO authenticated
  USING (has_profile_access(user_id)) WITH CHECK (has_profile_access(user_id));
CREATE POLICY "Profile members delete family"
  ON public.family_members FOR DELETE TO authenticated
  USING (has_profile_access(user_id));

-- user_intake
CREATE POLICY "Profile members view intake"
  ON public.user_intake FOR SELECT TO authenticated
  USING (has_profile_access(user_id));
CREATE POLICY "Profile members insert intake"
  ON public.user_intake FOR INSERT TO authenticated
  WITH CHECK (has_profile_access(user_id));
CREATE POLICY "Profile members update intake"
  ON public.user_intake FOR UPDATE TO authenticated
  USING (has_profile_access(user_id)) WITH CHECK (has_profile_access(user_id));

-- transaction_rules
CREATE POLICY "Profile members view rules"
  ON public.transaction_rules FOR SELECT TO authenticated
  USING (has_profile_access(user_id));
CREATE POLICY "Profile members insert rules"
  ON public.transaction_rules FOR INSERT TO authenticated
  WITH CHECK (has_profile_access(user_id));
CREATE POLICY "Profile members update rules"
  ON public.transaction_rules FOR UPDATE TO authenticated
  USING (has_profile_access(user_id)) WITH CHECK (has_profile_access(user_id));
CREATE POLICY "Profile members delete rules"
  ON public.transaction_rules FOR DELETE TO authenticated
  USING (has_profile_access(user_id));

-- sync_log
CREATE POLICY "Profile members view sync_log"
  ON public.sync_log FOR SELECT TO authenticated
  USING (has_profile_access(user_id));

-- =====================================================================
-- 4. Service requests (admin inbox)
-- =====================================================================

CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,                   -- auth user who submitted
  profile_id uuid,                          -- which managed profile it concerns
  type text NOT NULL CHECK (type IN ('meeting','report','concierge','wealth_manager','other')),
  subject text NOT NULL,
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','resolved')),
  assigned_admin uuid,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX idx_service_requests_status ON public.service_requests(status, created_at DESC);
CREATE INDEX idx_service_requests_user ON public.service_requests(user_id, created_at DESC);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own requests"
  ON public.service_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own requests"
  ON public.service_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins update requests"
  ON public.service_requests FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete requests"
  ON public.service_requests FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER service_requests_touch
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Enable realtime for live admin badge
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
ALTER TABLE public.service_requests REPLICA IDENTITY FULL;
