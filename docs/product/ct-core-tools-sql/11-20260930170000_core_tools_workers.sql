-- CT core tools: step 11 of 11, 20260930170000_core_tools_workers.sql
-- Run the entire file as postgres in the Supabase SQL Editor.
-- Run files 01 through 11 in order. Re-running a completed step is safe.
-- Only this step is one transaction; earlier completed steps stay committed.
-- The installer records progress privately, separately from Supabase CLI history.

ROLLBACK;
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = public;

DO $ct_install$
DECLARE
  recorded_checksum text;
  required_relation text;
  attempt integer;
  failed_context text;
  failed_detail text;
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtextextended('ct-core-tools-manual-install', 0)) THEN
    RAISE EXCEPTION 'Another CT migration is running. Let it finish before retrying this step.';
  END IF;
  IF to_regnamespace('private') IS NULL THEN
    RAISE EXCEPTION 'The baseline private schema is missing. Apply the baseline migrations first.';
  END IF;
  CREATE TABLE IF NOT EXISTS private.ct_core_tools_sql_runs (
    version text PRIMARY KEY,
    source_checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  );
  REVOKE ALL ON private.ct_core_tools_sql_runs FROM PUBLIC, anon, authenticated;
  SELECT source_checksum INTO recorded_checksum FROM private.ct_core_tools_sql_runs WHERE version='20260930170000';
  IF FOUND THEN
    IF recorded_checksum <> '7db7e315fb335e16eb45401f7d77c9d0a44c019eea8e3bcdd8bed9bbed6ef39e' THEN
      RAISE EXCEPTION 'Step 11 was applied from different SQL. Review the difference before changing an applied migration.';
    END IF;
    RAISE NOTICE 'Step 11/11 already completed; skipped.';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.ct_core_tools_sql_runs WHERE version='20260930165100') THEN
    RAISE EXCEPTION 'Run step 10 successfully before step 11.';
  END IF;

  -- Each failed attempt is a subtransaction: its DDL and locks are rolled back
  -- before retrying. Never disable RLS, event triggers or other sessions.
  FOR attempt IN 1..3 LOOP
    BEGIN

      EXECUTE $ct_source$
-- The deploy operator sets core_tools_cron_secret in private.service_config and
-- CORE_TOOLS_CRON_SECRET in Edge Function secrets to the same random value.
CREATE FUNCTION public.trigger_core_tools_worker(p_worker text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE base text; secret text; BEGIN
 IF p_worker NOT IN ('core-connections','validation-sessions') THEN RAISE EXCEPTION 'Unsupported worker'; END IF;
 SELECT value INTO base FROM private.service_config WHERE key='supabase_url';
 SELECT value INTO secret FROM private.service_config WHERE key='core_tools_cron_secret';
 IF base IS NULL OR secret IS NULL THEN RETURN; END IF;
 PERFORM net.http_post(url:=base||'/functions/v1/'||p_worker,headers:=jsonb_build_object('Content-Type','application/json','x-core-cron-secret',secret),body:=jsonb_build_object('action',CASE WHEN p_worker='core-connections' THEN 'daily_sync' ELSE 'worker' END));
END $$;
REVOKE ALL ON FUNCTION public.trigger_core_tools_worker(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_core_tools_worker(text) TO service_role;
SELECT cron.schedule('ct-connected-data-refresh','*/15 * * * *',$$SELECT public.trigger_core_tools_worker('core-connections');$$);
SELECT cron.schedule('ct-validation-session-worker','*/5 * * * *',$$SELECT public.trigger_core_tools_worker('validation-sessions');$$);
$ct_source$;
      EXIT;
    EXCEPTION WHEN deadlock_detected OR lock_not_available THEN
      GET STACKED DIAGNOSTICS failed_context = PG_EXCEPTION_CONTEXT,
                              failed_detail = PG_EXCEPTION_DETAIL;
      IF attempt = 3 THEN
        RAISE EXCEPTION USING ERRCODE=SQLSTATE,
          MESSAGE='Step 11/11 could not obtain database locks: ' || SQLERRM,
          DETAIL=coalesce(failed_detail, '') || E'\nFailing SQL context:\n' || coalesce(failed_context, ''),
          HINT='Earlier completed steps are saved. Run docs/product/ct-core-tools-lock-diagnostics.sql and share the results before retrying. Do not proceed to the next step.';
      END IF;
      PERFORM pg_sleep(0.25 * attempt);
    END;
  END LOOP;
  INSERT INTO private.ct_core_tools_sql_runs(version,source_checksum) VALUES('20260930170000','7db7e315fb335e16eb45401f7d77c9d0a44c019eea8e3bcdd8bed9bbed6ef39e');
END;
$ct_install$;

COMMIT;
SELECT '11/11' AS step, '20260930170000_core_tools_workers' AS migration, 'Completed' AS status
FROM private.ct_core_tools_sql_runs WHERE version='20260930170000' AND source_checksum='7db7e315fb335e16eb45401f7d77c9d0a44c019eea8e3bcdd8bed9bbed6ef39e';
