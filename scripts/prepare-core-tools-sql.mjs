import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export const migrationNames = [
  '20260930160000_pmf_survey_product_usage',
  '20260930161000_core_tools_data_foundation',
  '20260930161100_core_connection_oauth',
  '20260930161200_core_connection_events',
  '20260930162000_traction_measurement_v2',
  '20260930162500_gtm_product_activation',
  '20260930163000_gtm_review_proposals',
  '20260930164000_pmf_connected_evidence',
  '20260930165000_validation_sessions',
  '20260930165100_validation_session_actions',
  '20260930170000_core_tools_workers',
];

const outputDirectory = new URL('../docs/product/ct-core-tools-sql/', import.meta.url);
mkdirSync(outputDirectory, { recursive: true });
const baselineChecks = `
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
`;

const parts = migrationNames.map((name, index) => {
  const version = name.split('_')[0];
  const source = readFileSync(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (source.includes('$ct_source$') || source.includes('$ct_install$')) throw new Error('Reserved SQL delimiter in ' + name);
  const checksum = createHash('sha256').update(source).digest('hex');
  const previous = index ? migrationNames[index - 1].split('_')[0] : null;
  // Step 5 alters several existing tables. Acquire its known DDL locks before
  // the first change, without queuing behind one table while holding another.
  // Keep this operational guard outside source SQL so installed checksums stay
  // stable and steps 1-4 do not need to be run again.
  const lockGate = index === 4 ? `
      LOCK TABLE public.ct_products IN SHARE ROW EXCLUSIVE MODE NOWAIT;
      LOCK TABLE public.traction_engine_experiments,
                 public.traction_engine_sprints,
                 public.traction_engine_weekly_logs
        IN ACCESS EXCLUSIVE MODE NOWAIT;
` : '';
  const part = `-- CT core tools: step ${index + 1} of 11, ${name}.sql
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
  SELECT source_checksum INTO recorded_checksum FROM private.ct_core_tools_sql_runs WHERE version='${version}';
  IF FOUND THEN
    IF recorded_checksum <> '${checksum}' THEN
      RAISE EXCEPTION 'Step ${index + 1} was applied from different SQL. Review the difference before changing an applied migration.';
    END IF;
    RAISE NOTICE 'Step ${index + 1}/11 already completed; skipped.';
    RETURN;
  END IF;
${previous ? `  IF NOT EXISTS (SELECT 1 FROM private.ct_core_tools_sql_runs WHERE version='${previous}') THEN
    RAISE EXCEPTION 'Run step ${index} successfully before step ${index + 1}.';
  END IF;
` : baselineChecks}
  -- Each failed attempt is a subtransaction: its DDL and locks are rolled back
  -- before retrying. Never disable RLS, event triggers or other sessions.
  FOR attempt IN 1..3 LOOP
    BEGIN
${lockGate}
      EXECUTE $ct_source$
${source}
$ct_source$;
      EXIT;
    EXCEPTION WHEN deadlock_detected OR lock_not_available THEN
      GET STACKED DIAGNOSTICS failed_context = PG_EXCEPTION_CONTEXT,
                              failed_detail = PG_EXCEPTION_DETAIL;
      IF attempt = 3 THEN
        RAISE EXCEPTION USING ERRCODE=SQLSTATE,
          MESSAGE='Step ${index + 1}/11 could not obtain database locks: ' || SQLERRM,
          DETAIL=coalesce(failed_detail, '') || E'\\nFailing SQL context:\\n' || coalesce(failed_context, ''),
          HINT='Earlier completed steps are saved. Run docs/product/ct-core-tools-lock-diagnostics.sql and share the results before retrying. Do not proceed to the next step.';
      END IF;
      PERFORM pg_sleep(0.25 * attempt);
    END;
  END LOOP;
  INSERT INTO private.ct_core_tools_sql_runs(version,source_checksum) VALUES('${version}','${checksum}');
END;
$ct_install$;

COMMIT;
SELECT '${index + 1}/11' AS step, '${name}' AS migration, 'Completed' AS status
FROM private.ct_core_tools_sql_runs WHERE version='${version}' AND source_checksum='${checksum}';
`;
  writeFileSync(new URL(`${String(index + 1).padStart(2, '0')}-${name}.sql`, outputDirectory), part);
  return part;
});

writeFileSync(new URL('../docs/product/ct-core-tools-migrations.sql', import.meta.url), `-- CT core tools: revised resumable installer (11 separate transactions).
-- Replaces the original single-transaction bundle that encountered a deadlock.
-- Baseline database: d6abedbe929630a080d3a54aac4e0f632fe4618e.
-- Prefer the numbered files in ct-core-tools-sql: run 01 through 11 separately.
-- This combined alternative is also resumable: completed steps are skipped.
-- Do not add an outer BEGIN/COMMIT around this file.
-- Run as postgres. It does not deploy functions or set provider secrets.
-- A ROLLBACK warning about no active transaction is harmless.

` + parts.join('\n') + `
SELECT count(*) AS completed_steps, 11 AS expected_steps
FROM private.ct_core_tools_sql_runs WHERE version IN (${migrationNames.map(name => `'${name.split('_')[0]}'`).join(',')});
`);
console.log('Prepared 11 resumable SQL files and the revised combined installer.');
