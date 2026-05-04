-- Revoke EXECUTE from anon/authenticated on SECURITY DEFINER functions that
-- should only be callable by the service role from server-side code.
-- Functions like has_role, is_admin, has_active_subscription, get_my_plaid_items,
-- and update_updated_at_column intentionally remain callable.

REVOKE EXECUTE ON FUNCTION public.admin_purge_user_by_email(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_expired_account_deletions() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_transaction_rules(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_user_id_default() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated;