-- Transaction-only production probe. All attempted balance changes roll back.
-- Returns booleans/counts, never account IDs or balances.
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

CREATE TEMP TABLE ct_write_probe (
  target text,
  changed_rows integer,
  rejected_by_database boolean
) ON COMMIT DROP;

GRANT SELECT ON ct_account_probe TO authenticated;
GRANT SELECT, INSERT ON ct_write_probe TO authenticated;

DO $$
BEGIN
  IF (SELECT count(*) FROM ct_account_probe) <> 2 THEN
    RAISE EXCEPTION 'Two ordinary accounts with credit records are required';
  END IF;
  PERFORM set_config('request.jwt.claim.sub',
    (SELECT user_id::text FROM ct_account_probe WHERE ordinal = 1), true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
END;
$$;

SET LOCAL ROLE authenticated;

DO $$
DECLARE affected integer;
BEGIN
  BEGIN
    UPDATE public.user_credits SET balance = balance + 1
    WHERE user_id = (SELECT user_id FROM ct_account_probe WHERE ordinal = 1);
    GET DIAGNOSTICS affected = ROW_COUNT;
    INSERT INTO ct_write_probe VALUES ('own', affected, false);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO ct_write_probe VALUES ('own', 0, true);
  END;

  BEGIN
    UPDATE public.user_credits SET balance = balance + 1
    WHERE user_id = (SELECT user_id FROM ct_account_probe WHERE ordinal = 2);
    GET DIAGNOSTICS affected = ROW_COUNT;
    INSERT INTO ct_write_probe VALUES ('other', affected, false);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO ct_write_probe VALUES ('other', 0, true);
  END;
END;
$$;

SELECT target, changed_rows, rejected_by_database
FROM ct_write_probe ORDER BY target;

ROLLBACK;
