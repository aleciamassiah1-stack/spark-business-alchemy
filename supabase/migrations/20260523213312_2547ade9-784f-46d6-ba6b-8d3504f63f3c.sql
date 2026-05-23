-- 1. family_link_requests: restrict non-admin updates to safe columns via trigger
CREATE OR REPLACE FUNCTION public.enforce_family_link_request_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins may update anything
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Non-admins (requester or recipient) may only modify a limited set of columns.
  -- Recipients may also respond by transitioning status to approved/denied and
  -- updating recipient_responded_at and recipient_user_id (when accepting).
  IF NEW.requester_user_id IS DISTINCT FROM OLD.requester_user_id THEN
    RAISE EXCEPTION 'Not allowed to modify requester_user_id';
  END IF;
  IF NEW.recipient_email IS DISTINCT FROM OLD.recipient_email THEN
    RAISE EXCEPTION 'Not allowed to modify recipient_email';
  END IF;
  IF NEW.recipient_dob IS DISTINCT FROM OLD.recipient_dob THEN
    RAISE EXCEPTION 'Not allowed to modify recipient_dob';
  END IF;
  IF NEW.recipient_last_four_ssn_hash IS DISTINCT FROM OLD.recipient_last_four_ssn_hash THEN
    RAISE EXCEPTION 'Not allowed to modify recipient_last_four_ssn_hash';
  END IF;
  IF NEW.dob_match IS DISTINCT FROM OLD.dob_match THEN
    RAISE EXCEPTION 'Not allowed to modify dob_match';
  END IF;
  IF NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
    RAISE EXCEPTION 'Not allowed to modify admin_notes';
  END IF;
  IF NEW.admin_reviewed_by IS DISTINCT FROM OLD.admin_reviewed_by THEN
    RAISE EXCEPTION 'Not allowed to modify admin_reviewed_by';
  END IF;
  IF NEW.admin_reviewed_at IS DISTINCT FROM OLD.admin_reviewed_at THEN
    RAISE EXCEPTION 'Not allowed to modify admin_reviewed_at';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Not allowed to modify created_at';
  END IF;

  -- Status transitions: only the recipient can change status, and only to
  -- approved/denied from a pending state. Requesters cannot change status at all.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.recipient_user_id IS NULL OR OLD.recipient_user_id <> auth.uid() THEN
      RAISE EXCEPTION 'Only the recipient or an admin can change status';
    END IF;
    IF OLD.status::text NOT IN ('pending_recipient', 'pending_admin') THEN
      RAISE EXCEPTION 'Cannot change status from %', OLD.status;
    END IF;
    IF NEW.status::text NOT IN ('approved_by_recipient', 'denied_by_recipient', 'approved', 'denied') THEN
      RAISE EXCEPTION 'Invalid recipient status transition to %', NEW.status;
    END IF;
  END IF;

  -- recipient_user_id can only be set by the recipient claiming the invite
  IF NEW.recipient_user_id IS DISTINCT FROM OLD.recipient_user_id THEN
    IF OLD.recipient_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'recipient_user_id already set';
    END IF;
    IF NEW.recipient_user_id <> auth.uid() THEN
      RAISE EXCEPTION 'Can only claim invite for yourself';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_family_link_request_update_scope ON public.family_link_requests;
CREATE TRIGGER trg_enforce_family_link_request_update_scope
BEFORE UPDATE ON public.family_link_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_family_link_request_update_scope();

-- 2. user_roles: explicit restrictive policy blocking all UPDATEs from clients.
-- Role changes must go through admin server functions using the service role.
CREATE POLICY "Block all updates to user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- 3. realtime.messages: restrict subscriptions so only admins can subscribe
-- to channels used for service_requests change events.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'realtime'
      AND tablename = 'messages'
      AND policyname = 'Admins can subscribe to admin service request channels'
  ) THEN
    DROP POLICY "Admins can subscribe to admin service request channels" ON realtime.messages;
  END IF;
END $$;

CREATE POLICY "Admins can subscribe to admin service request channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() IN ('admin-service-requests', 'admin-request-badge')
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
