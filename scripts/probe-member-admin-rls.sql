-- Read-only checks under an ordinary authenticated account. The transaction
-- rolls back, and no account identifiers are returned.
BEGIN;

CREATE TEMP TABLE ct_member_probe ON COMMIT DROP AS
SELECT uc.user_id
FROM public.user_credits uc
WHERE NOT public.has_role(uc.user_id, 'admin'::public.app_role)
ORDER BY uc.user_id
LIMIT 1;

GRANT SELECT ON ct_member_probe TO authenticated;

DO $$
BEGIN
  IF (SELECT count(*) FROM ct_member_probe) <> 1 THEN
    RAISE EXCEPTION 'An ordinary account with a credit record is required';
  END IF;
  PERFORM set_config('request.jwt.claim.sub',
    (SELECT user_id::text FROM ct_member_probe), true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
END;
$$;

SET LOCAL ROLE authenticated;

SELECT
  current_user = 'authenticated' AS role_applied,
  auth.uid() = (SELECT user_id FROM ct_member_probe) AS identity_applied,
  public.is_admin_user() AS member_is_admin,
  has_function_privilege(current_user, 'public.is_admin_user_id(uuid)', 'EXECUTE') AS can_call_admin_id_helper,
  has_table_privilege(current_user, 'public.user_roles', 'INSERT') AS can_insert_role,
  has_table_privilege(current_user, 'public.user_roles', 'UPDATE') AS can_update_role,
  has_table_privilege(current_user, 'public.user_roles', 'DELETE') AS can_delete_role;

ROLLBACK;
