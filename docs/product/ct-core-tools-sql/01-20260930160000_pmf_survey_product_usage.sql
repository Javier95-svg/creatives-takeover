-- CT core tools: step 1 of 11, 20260930160000_pmf_survey_product_usage.sql
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
  SELECT source_checksum INTO recorded_checksum FROM private.ct_core_tools_sql_runs WHERE version='20260930160000';
  IF FOUND THEN
    IF recorded_checksum <> 'ae8e4c95da052bdd0da805650ab9a976284f5e287991afd8c89c60ba4eb8ce47' THEN
      RAISE EXCEPTION 'Step 1 was applied from different SQL. Review the difference before changing an applied migration.';
    END IF;
    RAISE NOTICE 'Step 1/11 already completed; skipped.';
    RETURN;
  END IF;

  FOREACH required_relation IN ARRAY ARRAY[
    'auth.users','public.pmf_survey_responses','public.pmf_context_evidence',
    'public.prebuild_validation_contexts','public.pmf_interviews',
    'public.gtm_plans','public.gtm_plan_versions','public.gtm_plays',
    'public.gtm_tasks','public.gtm_play_assets','public.gtm_weekly_reviews',
    'public.traction_engine_weekly_logs','public.traction_engine_sprints',
    'public.traction_engine_experiments','public.user_credits',
    'public.credit_transactions','private.service_config'
  ] LOOP
    IF to_regclass(required_relation) IS NULL THEN
      RAISE EXCEPTION 'Missing baseline table: %. Apply the baseline migrations first.', required_relation;
    END IF;
  END LOOP;
  IF to_regprocedure('cron.schedule(text,text,text)') IS NULL OR to_regnamespace('net') IS NULL THEN
    RAISE EXCEPTION 'The baseline pg_cron scheduler and pg_net schema are required.';
  END IF;
  IF to_regclass('public.ct_products') IS NOT NULL OR EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pmf_survey_responses' AND column_name='product_usage'
  ) THEN
    RAISE EXCEPTION 'An upgrade was applied outside this installer. Reconcile its migration history before continuing; no changes were made by this step.';
  END IF;

  -- Each failed attempt is a subtransaction: its DDL and locks are rolled back
  -- before retrying. Never disable RLS, event triggers or other sessions.
  FOR attempt IN 1..3 LOOP
    BEGIN

      EXECUTE $ct_source$
-- Preserve existing responses as usage unknown; only explicit product use enters
-- the Sean Ellis percentage. Concept feedback remains available to the owner.
ALTER TABLE public.pmf_survey_responses
  ADD COLUMN IF NOT EXISTS product_usage text NOT NULL DEFAULT 'unknown'
    CHECK (product_usage IN ('unknown', 'used', 'concept_only'));
ALTER TABLE public.pmf_survey_responses ALTER COLUMN sean_ellis_answer DROP NOT NULL;
ALTER TABLE public.pmf_survey_responses ADD CONSTRAINT pmf_usage_answer_consistency
  CHECK ((product_usage = 'concept_only' AND sean_ellis_answer IS NULL)
    OR (product_usage IN ('used', 'unknown') AND sean_ellis_answer IS NOT NULL));

-- Rebuild the cached eligible counts so historical, unscreened responses do not
-- continue contributing through a fallback aggregate.
UPDATE public.pmf_context_evidence SET survey_results_count = 0,
  sean_ellis_very_disappointed = 0, sean_ellis_somewhat_disappointed = 0,
  sean_ellis_not_disappointed = 0;
$ct_source$;
      EXIT;
    EXCEPTION WHEN deadlock_detected OR lock_not_available THEN
      GET STACKED DIAGNOSTICS failed_context = PG_EXCEPTION_CONTEXT,
                              failed_detail = PG_EXCEPTION_DETAIL;
      IF attempt = 3 THEN
        RAISE EXCEPTION USING ERRCODE=SQLSTATE,
          MESSAGE='Step 1/11 could not obtain database locks: ' || SQLERRM,
          DETAIL=coalesce(failed_detail, '') || E'\nFailing SQL context:\n' || coalesce(failed_context, ''),
          HINT='Earlier completed steps are saved. Run docs/product/ct-core-tools-lock-diagnostics.sql and share the results before retrying. Do not proceed to the next step.';
      END IF;
      PERFORM pg_sleep(0.25 * attempt);
    END;
  END LOOP;
  INSERT INTO private.ct_core_tools_sql_runs(version,source_checksum) VALUES('20260930160000','ae8e4c95da052bdd0da805650ab9a976284f5e287991afd8c89c60ba4eb8ce47');
END;
$ct_install$;

COMMIT;
SELECT '1/11' AS step, '20260930160000_pmf_survey_product_usage' AS migration, 'Completed' AS status
FROM private.ct_core_tools_sql_runs WHERE version='20260930160000' AND source_checksum='ae8e4c95da052bdd0da805650ab9a976284f5e287991afd8c89c60ba4eb8ce47';
