-- Row level security: evaluate auth.uid() once per query, not once per row.
--
-- 600 policies across 295 public tables call auth.uid() / auth.jwt() /
-- auth.role() / auth.email() directly (Supabase advisor "auth_rls_initplan").
-- Postgres then re-evaluates the call for every row it checks. Wrapping it as
-- (SELECT auth.uid()) makes it an init plan that runs once per statement.
-- The value is the same for the whole statement, so every policy allows and
-- denies exactly the same rows as before. This is the fix Supabase documents:
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- The live expressions are rewritten in place (pg_policies holds their exact
-- text), so policies changed since their migrations keep those changes.
-- Already wrapped calls are left as they are. It runs in one transaction and
-- refuses to finish if any per-row call remains. Safe to re-run.

DO $$
DECLARE
  r record;
  v_using text;
  v_check text;
  v_sql text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ 'auth\.(uid|jwt|role|email)\(\)'
  LOOP
    v_using := r.qual;
    v_check := r.with_check;

    IF v_using IS NOT NULL THEN
      -- Protect calls that are already wrapped, wrap the rest, restore.
      v_using := regexp_replace(v_using, '\( SELECT auth\.(uid|jwt|role|email)\(\) AS [a-z_]+\)', '__ct_wrapped_\1__', 'g');
      v_using := regexp_replace(v_using, 'auth\.(uid|jwt|role|email)\(\)', '(SELECT auth.\1())', 'g');
      v_using := regexp_replace(v_using, '__ct_wrapped_(uid|jwt|role|email)__', '(SELECT auth.\1())', 'g');
    END IF;

    IF v_check IS NOT NULL THEN
      v_check := regexp_replace(v_check, '\( SELECT auth\.(uid|jwt|role|email)\(\) AS [a-z_]+\)', '__ct_wrapped_\1__', 'g');
      v_check := regexp_replace(v_check, 'auth\.(uid|jwt|role|email)\(\)', '(SELECT auth.\1())', 'g');
      v_check := regexp_replace(v_check, '__ct_wrapped_(uid|jwt|role|email)__', '(SELECT auth.\1())', 'g');
    END IF;

    IF v_using IS NOT DISTINCT FROM r.qual AND v_check IS NOT DISTINCT FROM r.with_check THEN
      CONTINUE;
    END IF;

    v_sql := format('ALTER POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    IF v_using IS NOT NULL THEN
      v_sql := v_sql || format(' USING (%s)', v_using);
    END IF;
    IF v_check IS NOT NULL THEN
      v_sql := v_sql || format(' WITH CHECK (%s)', v_check);
    END IF;
    EXECUTE v_sql;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND regexp_replace(
            coalesce(qual, '') || ' ' || coalesce(with_check, ''),
            '\( SELECT auth\.(uid|jwt|role|email)\(\) AS [a-z_]+\)', '', 'g'
          ) ~ 'auth\.(uid|jwt|role|email)\(\)'
  ) THEN
    RAISE EXCEPTION 'A policy still calls an auth function once per row';
  END IF;
END
$$;
