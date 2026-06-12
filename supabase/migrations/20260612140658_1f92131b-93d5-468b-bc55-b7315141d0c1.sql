
-- Tighten family_link_requests UPDATE: split admin and party policies
DROP POLICY IF EXISTS "Recipients/requesters/admins update link requests" ON public.family_link_requests;

CREATE POLICY "Admins update link requests"
ON public.family_link_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Parties update own link requests (limited)"
ON public.family_link_requests
FOR UPDATE
TO authenticated
USING (
  (requester_user_id = auth.uid() OR recipient_user_id = auth.uid())
  AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  (requester_user_id = auth.uid() OR recipient_user_id = auth.uid())
  AND status::text IN ('pending_recipient','pending_admin','declined_recipient','cancelled','approved_by_recipient','denied_by_recipient')
  AND admin_reviewed_by IS NULL
  AND admin_reviewed_at IS NULL
  AND admin_notes IS NULL
);

-- Realtime: explicitly scope non-admin channel subscriptions to the user's own topic.
-- Topic convention: 'user:<auth.uid()>' or 'user:<auth.uid()>:*'
CREATE POLICY "Users subscribe to own user-scoped channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = ('user:' || auth.uid()::text)
  OR realtime.topic() LIKE ('user:' || auth.uid()::text || ':%')
);
