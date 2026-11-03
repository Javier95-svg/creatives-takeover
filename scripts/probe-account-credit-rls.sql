-- Run only with a privileged, trusted SQL connection to the intended project.
-- The transaction is rolled back. No account IDs or balances are returned.
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

GRANT SELECT ON ct_account_probe TO authenticated;

DO $$
BEGIN
  IF (SELECT count(*) FROM ct_account_probe) <> 2 THEN
    RAISE EXCEPTION 'Two ordinary accounts with credit records are required';
  END IF;
  PERFORM set_config(
    'request.jwt.claim.sub',
    (SELECT user_id::text FROM ct_account_probe WHERE ordinal = 1),
    true
  );
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
END;
$$;

SET LOCAL ROLE authenticated;

SELECT
  current_user = 'authenticated' AS role_applied,
  auth.uid() = (SELECT user_id FROM ct_account_probe WHERE ordinal = 1) AS identity_applied,
  (SELECT count(*) FROM public.user_credits
   WHERE user_id = (SELECT user_id FROM ct_account_probe WHERE ordinal = 1)) AS own_balance_rows,
  (SELECT count(*) FROM public.user_credits
   WHERE user_id = (SELECT user_id FROM ct_account_probe WHERE ordinal = 2)) AS other_balance_rows,
  (SELECT count(*) FROM public.credit_transactions
   WHERE user_id = (SELECT user_id FROM ct_account_probe WHERE ordinal = 2)) AS other_transaction_rows;

ROLLBACK;
