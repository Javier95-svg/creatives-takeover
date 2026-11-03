-- Transaction-only Storage RLS probe. Creates temporary object metadata rows
-- without file bytes, tests owner visibility, and rolls all rows back.
BEGIN;

CREATE TEMP TABLE ct_account_probe ON COMMIT DROP AS
SELECT row_number() OVER (ORDER BY user_id) AS ordinal, user_id
FROM (
  SELECT uc.user_id
  FROM public.user_credits uc
  JOIN auth.users u ON u.id = uc.user_id
  WHERE lower(coalesce(u.email, '')) <> 'admin@creatives-takeover.com'
  ORDER BY uc.user_id
  LIMIT 2
) ordinary_accounts;

DO $$
BEGIN
  IF (SELECT count(*) FROM ct_account_probe) <> 2 THEN
    RAISE EXCEPTION 'Two ordinary accounts are required';
  END IF;
END;
$$;

CREATE TEMP TABLE ct_object_probe ON COMMIT DROP AS
SELECT account.ordinal, 'cv-uploads'::text AS bucket_id,
       account.user_id::text || '/ct-security-probe-' || gen_random_uuid()::text || '.pdf' AS path
FROM ct_account_probe account
UNION ALL
SELECT account.ordinal, 'collaboration-files'::text AS bucket_id,
       'ct-security-probe/' || account.user_id::text || '/' || gen_random_uuid()::text || '.pdf' AS path
FROM ct_account_probe account;

INSERT INTO storage.objects (bucket_id, name)
SELECT bucket_id, path FROM ct_object_probe;

GRANT SELECT ON ct_account_probe, ct_object_probe TO authenticated;

DO $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub',
    (SELECT user_id::text FROM ct_account_probe WHERE ordinal = 1), true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
END;
$$;

SET LOCAL ROLE authenticated;

SELECT probe.bucket_id,
  current_user = 'authenticated' AS role_applied,
  auth.uid() = (SELECT user_id FROM ct_account_probe WHERE ordinal = 1) AS identity_applied,
  count(object.id) FILTER (WHERE probe.ordinal = 1) AS own_visible,
  count(object.id) FILTER (WHERE probe.ordinal = 2) AS other_visible
FROM ct_object_probe probe
LEFT JOIN storage.objects object
  ON object.bucket_id = probe.bucket_id AND object.name = probe.path
GROUP BY probe.bucket_id
ORDER BY probe.bucket_id;

ROLLBACK;
