-- SQL A's SECURITY DEFINER lockdown revokes EXECUTE on functions outside its
-- original allowlist. Fifteen current RLS policies call is_admin_user(), so
-- authenticated requests need permission to evaluate that role check.
-- The function itself reads the caller's auth.uid() and checks user_roles.
BEGIN;

REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
