-- Read-only production review. Run as a database administrator in Supabase SQL
-- Editor; never paste the output into a public issue because policy definitions
-- and account details may be sensitive. This does not apply any migration.

-- Confirm the three ordered lockdown migrations in the production ledger.
WITH required(version) AS (
  VALUES ('20261102100000'), ('20261102102000'), ('20261102101000')
)
SELECT required.version,
       EXISTS (
         SELECT 1 FROM supabase_migrations.schema_migrations AS applied
         WHERE applied.version = required.version
       ) AS applied
FROM required;

-- Confirm the owner-update billing guard exists and is enabled.
SELECT t.tgname, t.tgenabled,
       pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger AS t
WHERE t.tgrelid = 'public.profiles'::regclass
  AND t.tgname = 'guard_profile_billing_fields'
  AND NOT t.tgisinternal;

-- Examine every effective policy on the high-impact tables and file objects.
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE (schemaname = 'public' AND tablename IN
       ('user_credits', 'user_monthly_quotas', 'credit_transactions',
        'profiles', 'mentors', 'user_roles'))
   OR (schemaname = 'storage' AND tablename = 'objects')
ORDER BY schemaname, tablename, cmd, policyname;

-- A private bucket flag is necessary but policies must also be reviewed above.
SELECT id, name, public
FROM storage.buckets
WHERE id IN ('cv-uploads', 'message-attachments', 'chatbot-attachments',
             'dashboard-files', 'collaboration-files')
ORDER BY id;

-- All rows below should show false for anon and authenticated after the
-- legacy RPC closure; review every overload, not only the function name.
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS arguments,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS member_can_execute
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'increment_credit_balance', 'purchase_mvp_credits',
    'refund_mvp_credits', 'grant_mvp_credits',
    'check_and_award_badges', 'check_and_increment_usage',
    'complete_daily_challenge', 'deduct_mvp_credits_atomic',
    'ensure_mvp_credit_balance', 'generate_referral_code',
    'notify_task_deadline_expired'
  )
ORDER BY p.proname, arguments;

-- Review the complete callable SECURITY DEFINER surface against the approved
-- migration allowlist. The focused query above is not a complete inventory.
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS arguments,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS member_can_execute
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef
  AND (has_function_privilege('anon', p.oid, 'EXECUTE')
       OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
ORDER BY p.proname, arguments;
