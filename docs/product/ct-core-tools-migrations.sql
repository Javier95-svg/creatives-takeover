-- CT core tools: revised resumable installer (11 separate transactions).
-- Replaces the original single-transaction bundle that encountered a deadlock.
-- Baseline database: d6abedbe929630a080d3a54aac4e0f632fe4618e.
-- Prefer the numbered files in ct-core-tools-sql: run 01 through 11 separately.
-- This combined alternative is also resumable: completed steps are skipped.
-- Do not add an outer BEGIN/COMMIT around this file.
-- Run as postgres. It does not deploy functions or set provider secrets.
-- A ROLLBACK warning about no active transaction is harmless.

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

-- CT core tools: step 2 of 11, 20260930161000_core_tools_data_foundation.sql
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
  SELECT source_checksum INTO recorded_checksum FROM private.ct_core_tools_sql_runs WHERE version='20260930161000';
  IF FOUND THEN
    IF recorded_checksum <> '060e30f8a258b0edaf5710f47a4f7629f14a874c30ed968dfa9e9af246919185' THEN
      RAISE EXCEPTION 'Step 2 was applied from different SQL. Review the difference before changing an applied migration.';
    END IF;
    RAISE NOTICE 'Step 2/11 already completed; skipped.';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.ct_core_tools_sql_runs WHERE version='20260930160000') THEN
    RAISE EXCEPTION 'Run step 1 successfully before step 2.';
  END IF;

  -- Each failed attempt is a subtransaction: its DDL and locks are rolled back
  -- before retrying. Never disable RLS, event triggers or other sessions.
  FOR attempt IN 1..3 LOOP
    BEGIN

      EXECUTE $ct_source$
-- Product-scoped, attributed evidence shared by PMF, GTM and Traction.
CREATE TABLE public.ct_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 160),
  timezone text NOT NULL DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id, user_id)
);
CREATE TABLE public.ct_product_artifacts (
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  product_id uuid NOT NULL,
  tool text NOT NULL CHECK (tool IN ('pmf_lab','gtm_strategist','traction_engine')),
  artifact_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, tool, artifact_id),
  FOREIGN KEY(product_id,user_id) REFERENCES public.ct_products(id,user_id) ON DELETE CASCADE
);
CREATE TABLE public.ct_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  product_id uuid NOT NULL,
  provider text NOT NULL CHECK(provider IN ('sheets','tally','stripe','posthog','ga4','hubspot','typeform','shopify','mailchimp')),
  label text NOT NULL,
  status text NOT NULL DEFAULT 'connected' CHECK(status IN ('connected','syncing','expired','error','disconnected')),
  config jsonb NOT NULL DEFAULT '{}',
  mapping jsonb NOT NULL DEFAULT '{}',
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id,user_id,product_id),
  FOREIGN KEY(product_id,user_id) REFERENCES public.ct_products(id,user_id) ON DELETE CASCADE
);
CREATE TABLE public.ct_connection_secrets (
  connection_id uuid PRIMARY KEY REFERENCES public.ct_connections ON DELETE CASCADE,
  encrypted_secret text NOT NULL
);
CREATE TABLE public.ct_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.ct_connections ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running' CHECK(status IN ('running','preview','succeeded','failed')),
  rows_imported integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  error text
);
CREATE UNIQUE INDEX ct_one_running_sync ON public.ct_sync_runs(connection_id) WHERE status='running';
CREATE TABLE public.ct_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  product_id uuid NOT NULL,
  connection_id uuid,
  source_namespace text NOT NULL DEFAULT 'csv',
  rows jsonb NOT NULL CHECK(jsonb_typeof(rows)='array' AND jsonb_array_length(rows)<=1000),
  mapping jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'preview' CHECK(status IN ('preview','accepted','discarded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  FOREIGN KEY(product_id,user_id) REFERENCES public.ct_products(id,user_id) ON DELETE CASCADE,
  FOREIGN KEY(connection_id,user_id,product_id) REFERENCES public.ct_connections(id,user_id,product_id)
);
CREATE TABLE public.ct_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  product_id uuid NOT NULL,
  connection_id uuid,
  source_key text NOT NULL,
  source_url text,
  kind text NOT NULL CHECK(kind IN ('interview','survey','payment','subscription','deal','contact','campaign','session','release')),
  participant_key text,
  segment text,
  incentivized boolean NOT NULL DEFAULT false,
  product_usage text NOT NULL DEFAULT 'unknown' CHECK(product_usage IN ('used','concept_only','unknown')),
  provenance text NOT NULL CHECK(provenance IN ('user_supplied','provider','platform')),
  captured_at timestamptz NOT NULL,
  original jsonb NOT NULL,
  summary jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id,source_key),
  FOREIGN KEY(product_id,user_id) REFERENCES public.ct_products(id,user_id) ON DELETE CASCADE,
  FOREIGN KEY(connection_id,user_id,product_id) REFERENCES public.ct_connections(id,user_id,product_id)
);
CREATE TABLE public.ct_metric_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  product_id uuid NOT NULL,
  connection_id uuid,
  source_key text NOT NULL,
  metric text NOT NULL,
  definition jsonb NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL CHECK(period_end>period_start),
  value numeric,
  denominator numeric CHECK(denominator>=0),
  currency text,
  status text NOT NULL CHECK(status IN ('complete','pending','unknown')),
  provenance text NOT NULL CHECK(provenance IN ('user_supplied','provider','platform')),
  captured_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id,source_key,metric),
  FOREIGN KEY(product_id,user_id) REFERENCES public.ct_products(id,user_id) ON DELETE CASCADE,
  FOREIGN KEY(connection_id,user_id,product_id) REFERENCES public.ct_connections(id,user_id,product_id),
  CHECK(status<>'complete' OR value IS NOT NULL)
);
CREATE INDEX ct_evidence_product_time ON public.ct_evidence(product_id,captured_at DESC);
CREATE INDEX ct_metrics_product_period ON public.ct_metric_observations(product_id,metric,period_start DESC);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['ct_products','ct_product_artifacts','ct_connections','ct_sync_runs','ct_import_batches','ct_evidence','ct_metric_observations'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('CREATE POLICY owner_read ON public.%I FOR SELECT TO authenticated USING (user_id=auth.uid())',t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
    EXECUTE format('REVOKE INSERT,UPDATE,DELETE ON public.%I FROM anon,authenticated',t);
  END LOOP;
END $$;
ALTER TABLE public.ct_connection_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ct_connection_secrets FROM anon,authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ct_products TO authenticated;
CREATE POLICY product_owner_write ON public.ct_products FOR ALL TO authenticated
  USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE FUNCTION public.ct_link_product_artifact(p_product_id uuid,p_tool text,p_artifact_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_owner uuid; BEGIN
  IF NOT EXISTS(SELECT 1 FROM ct_products WHERE id=p_product_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF p_tool='pmf_lab' THEN SELECT user_id INTO v_owner FROM prebuild_validation_contexts WHERE id=p_artifact_id;
  ELSIF p_tool='gtm_strategist' THEN SELECT user_id INTO v_owner FROM gtm_plans WHERE id=p_artifact_id;
  ELSIF p_tool='traction_engine' THEN SELECT user_id INTO v_owner FROM traction_engine_weekly_logs WHERE id=p_artifact_id;
  ELSE RAISE EXCEPTION 'Unsupported tool'; END IF;
  IF v_owner IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Artifact not found'; END IF;
  IF EXISTS(SELECT 1 FROM ct_product_artifacts WHERE user_id=auth.uid() AND tool=p_tool AND artifact_id=p_artifact_id AND product_id<>p_product_id) THEN
    RAISE EXCEPTION 'This work already belongs to another product. Start a separate context or plan to keep evidence distinct';
  END IF;
  IF p_tool='traction_engine' THEN
    UPDATE traction_engine_weekly_logs SET product_id=p_product_id WHERE id=p_artifact_id AND user_id=auth.uid();
  END IF;
  INSERT INTO ct_product_artifacts(user_id,product_id,tool,artifact_id) VALUES(auth.uid(),p_product_id,p_tool,p_artifact_id)
    ON CONFLICT(user_id,tool,artifact_id) DO UPDATE SET product_id=excluded.product_id;
END $$;
REVOKE ALL ON FUNCTION public.ct_link_product_artifact(uuid,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ct_link_product_artifact(uuid,text,uuid) TO authenticated;

-- A connection's complete batch is published atomically. Only server workers may
-- write provider provenance. Partial API reads must never reach this function.
CREATE FUNCTION public.ct_publish_import(p_batch_id uuid,p_evidence jsonb,p_metrics jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b ct_import_batches; r jsonb; n integer:=0; BEGIN
  SELECT * INTO b FROM ct_import_batches WHERE id=p_batch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Batch not found'; END IF;
  IF b.status='accepted' THEN RETURN 0; END IF;
  IF b.status<>'preview' THEN RAISE EXCEPTION 'Batch not available'; END IF;
  IF b.connection_id IS NOT NULL THEN
    PERFORM id FROM ct_connections WHERE id=b.connection_id AND status<>'disconnected' FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'This source has been disconnected'; END IF;
  END IF;
  FOR r IN SELECT value FROM jsonb_array_elements(p_evidence) LOOP
    INSERT INTO ct_evidence(user_id,product_id,connection_id,source_key,source_url,kind,participant_key,segment,incentivized,product_usage,provenance,captured_at,original,summary)
      VALUES(b.user_id,b.product_id,b.connection_id,r->>'source_key',r->>'source_url',r->>'kind',r->>'participant_key',r->>'segment',coalesce((r->>'incentivized')::boolean,false),coalesce(r->>'product_usage','unknown'),r->>'provenance',(r->>'captured_at')::timestamptz,r->'original',coalesce(r->'summary','{}'))
      ON CONFLICT(product_id,source_key) DO UPDATE SET original=excluded.original,summary=excluded.summary,captured_at=excluded.captured_at,segment=excluded.segment,incentivized=excluded.incentivized,product_usage=excluded.product_usage,participant_key=excluded.participant_key;
    n:=n+1;
  END LOOP;
  FOR r IN SELECT value FROM jsonb_array_elements(p_metrics) LOOP
    INSERT INTO ct_metric_observations(user_id,product_id,connection_id,source_key,metric,definition,period_start,period_end,value,denominator,currency,status,provenance)
      VALUES(b.user_id,b.product_id,b.connection_id,r->>'source_key',r->>'metric',r->'definition',(r->>'period_start')::timestamptz,(r->>'period_end')::timestamptz,(r->>'value')::numeric,(r->>'denominator')::numeric,r->>'currency',r->>'status',r->>'provenance')
      ON CONFLICT(product_id,source_key,metric) DO UPDATE SET value=excluded.value,denominator=excluded.denominator,status=excluded.status,captured_at=now(),definition=excluded.definition,period_start=excluded.period_start,period_end=excluded.period_end,currency=excluded.currency;
    n:=n+1;
  END LOOP;
  UPDATE ct_import_batches SET status='accepted',accepted_at=now() WHERE id=b.id;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.ct_publish_import(uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ct_publish_import(uuid,jsonb,jsonb) TO service_role;

GRANT ALL ON public.ct_connection_secrets TO service_role;
$ct_source$;
      EXIT;
    EXCEPTION WHEN deadlock_detected OR lock_not_available THEN
      GET STACKED DIAGNOSTICS failed_context = PG_EXCEPTION_CONTEXT,
                              failed_detail = PG_EXCEPTION_DETAIL;
      IF attempt = 3 THEN
        RAISE EXCEPTION USING ERRCODE=SQLSTATE,
          MESSAGE='Step 2/11 could not obtain database locks: ' || SQLERRM,
          DETAIL=coalesce(failed_detail, '') || E'\nFailing SQL context:\n' || coalesce(failed_context, ''),
          HINT='Earlier completed steps are saved. Run docs/product/ct-core-tools-lock-diagnostics.sql and share the results before retrying. Do not proceed to the next step.';
      END IF;
      PERFORM pg_sleep(0.25 * attempt);
    END;
  END LOOP;
  INSERT INTO private.ct_core_tools_sql_runs(version,source_checksum) VALUES('20260930161000','060e30f8a258b0edaf5710f47a4f7629f14a874c30ed968dfa9e9af246919185');
END;
$ct_install$;

COMMIT;
SELECT '2/11' AS step, '20260930161000_core_tools_data_foundation' AS migration, 'Completed' AS status
FROM private.ct_core_tools_sql_runs WHERE version='20260930161000' AND source_checksum='060e30f8a258b0edaf5710f47a4f7629f14a874c30ed968dfa9e9af246919185';

-- CT core tools: step 3 of 11, 20260930161100_core_connection_oauth.sql
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
  SELECT source_checksum INTO recorded_checksum FROM private.ct_core_tools_sql_runs WHERE version='20260930161100';
  IF FOUND THEN
    IF recorded_checksum <> '19d3781f973add2f5de5d75ce7f778d71c820de4ea7d469f708e2263291536ad' THEN
      RAISE EXCEPTION 'Step 3 was applied from different SQL. Review the difference before changing an applied migration.';
    END IF;
    RAISE NOTICE 'Step 3/11 already completed; skipped.';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.ct_core_tools_sql_runs WHERE version='20260930161000') THEN
    RAISE EXCEPTION 'Run step 2 successfully before step 3.';
  END IF;

  -- Each failed attempt is a subtransaction: its DDL and locks are rolled back
  -- before retrying. Never disable RLS, event triggers or other sessions.
  FOR attempt IN 1..3 LOOP
    BEGIN

      EXECUTE $ct_source$
CREATE TABLE public.ct_connection_oauth_states (
  state uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  product_id uuid NOT NULL,
  provider text NOT NULL CHECK(provider IN ('sheets','ga4')),
  config jsonb NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes',
  FOREIGN KEY(product_id,user_id) REFERENCES public.ct_products(id,user_id) ON DELETE CASCADE
);
ALTER TABLE public.ct_connection_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ct_connection_oauth_states FROM anon,authenticated;

CREATE TABLE public.ct_evidence_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id uuid NOT NULL REFERENCES public.ct_evidence ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  previous_record jsonb NOT NULL,
  revised_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ct_evidence_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_read ON public.ct_evidence_revisions FOR SELECT TO authenticated USING(user_id=auth.uid());
GRANT SELECT ON public.ct_evidence_revisions TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.ct_evidence_revisions FROM anon,authenticated;
CREATE FUNCTION public.ct_record_evidence_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF OLD.original IS DISTINCT FROM NEW.original OR OLD.summary IS DISTINCT FROM NEW.summary THEN
    INSERT INTO ct_evidence_revisions(evidence_id,user_id,previous_record) VALUES(OLD.id,OLD.user_id,to_jsonb(OLD));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ct_evidence_revision BEFORE UPDATE ON public.ct_evidence FOR EACH ROW EXECUTE FUNCTION public.ct_record_evidence_revision();

GRANT ALL ON public.ct_connection_oauth_states,public.ct_evidence_revisions TO service_role;
$ct_source$;
      EXIT;
    EXCEPTION WHEN deadlock_detected OR lock_not_available THEN
      GET STACKED DIAGNOSTICS failed_context = PG_EXCEPTION_CONTEXT,
                              failed_detail = PG_EXCEPTION_DETAIL;
      IF attempt = 3 THEN
        RAISE EXCEPTION USING ERRCODE=SQLSTATE,
          MESSAGE='Step 3/11 could not obtain database locks: ' || SQLERRM,
          DETAIL=coalesce(failed_detail, '') || E'\nFailing SQL context:\n' || coalesce(failed_context, ''),
          HINT='Earlier completed steps are saved. Run docs/product/ct-core-tools-lock-diagnostics.sql and share the results before retrying. Do not proceed to the next step.';
      END IF;
      PERFORM pg_sleep(0.25 * attempt);
    END;
  END LOOP;
  INSERT INTO private.ct_core_tools_sql_runs(version,source_checksum) VALUES('20260930161100','19d3781f973add2f5de5d75ce7f778d71c820de4ea7d469f708e2263291536ad');
END;
$ct_install$;

COMMIT;
SELECT '3/11' AS step, '20260930161100_core_connection_oauth' AS migration, 'Completed' AS status
FROM private.ct_core_tools_sql_runs WHERE version='20260930161100' AND source_checksum='19d3781f973add2f5de5d75ce7f778d71c820de4ea7d469f708e2263291536ad';

-- CT core tools: step 4 of 11, 20260930161200_core_connection_events.sql
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
  SELECT source_checksum INTO recorded_checksum FROM private.ct_core_tools_sql_runs WHERE version='20260930161200';
  IF FOUND THEN
    IF recorded_checksum <> '4fa17e4de6adf7d96892bfb7b76bdca8f7c9d4ee19834579c9eb28383896f3b2' THEN
      RAISE EXCEPTION 'Step 4 was applied from different SQL. Review the difference before changing an applied migration.';
    END IF;
    RAISE NOTICE 'Step 4/11 already completed; skipped.';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.ct_core_tools_sql_runs WHERE version='20260930161100') THEN
    RAISE EXCEPTION 'Run step 3 successfully before step 4.';
  END IF;

  -- Each failed attempt is a subtransaction: its DDL and locks are rolled back
  -- before retrying. Never disable RLS, event triggers or other sessions.
  FOR attempt IN 1..3 LOOP
    BEGIN

      EXECUTE $ct_source$
ALTER TABLE public.ct_connections ADD COLUMN refresh_requested_at timestamptz;
CREATE TABLE public.ct_connection_events (
 connection_id uuid NOT NULL REFERENCES public.ct_connections ON DELETE CASCADE,
 event_id text NOT NULL,event_type text NOT NULL,received_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(connection_id,event_id)
);
ALTER TABLE public.ct_connection_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ct_connection_events FROM anon,authenticated;
GRANT ALL ON public.ct_connection_events TO service_role;
CREATE FUNCTION public.ct_queue_connection_event(p_connection uuid,p_event text,p_type text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO ct_connection_events(connection_id,event_id,event_type) VALUES(p_connection,p_event,p_type) ON CONFLICT DO NOTHING;
 IF FOUND THEN UPDATE ct_connections SET refresh_requested_at=now() WHERE id=p_connection AND status<>'disconnected'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.ct_queue_connection_event(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ct_queue_connection_event(uuid,text,text) TO service_role;
$ct_source$;
      EXIT;
    EXCEPTION WHEN deadlock_detected OR lock_not_available THEN
      GET STACKED DIAGNOSTICS failed_context = PG_EXCEPTION_CONTEXT,
                              failed_detail = PG_EXCEPTION_DETAIL;
      IF attempt = 3 THEN
        RAISE EXCEPTION USING ERRCODE=SQLSTATE,
          MESSAGE='Step 4/11 could not obtain database locks: ' || SQLERRM,
          DETAIL=coalesce(failed_detail, '') || E'\nFailing SQL context:\n' || coalesce(failed_context, ''),
          HINT='Earlier completed steps are saved. Run docs/product/ct-core-tools-lock-diagnostics.sql and share the results before retrying. Do not proceed to the next step.';
      END IF;
      PERFORM pg_sleep(0.25 * attempt);
    END;
  END LOOP;
  INSERT INTO private.ct_core_tools_sql_runs(version,source_checksum) VALUES('20260930161200','4fa17e4de6adf7d96892bfb7b76bdca8f7c9d4ee19834579c9eb28383896f3b2');
END;
$ct_install$;

COMMIT;
SELECT '4/11' AS step, '20260930161200_core_connection_events' AS migration, 'Completed' AS status
FROM private.ct_core_tools_sql_runs WHERE version='20260930161200' AND source_checksum='4fa17e4de6adf7d96892bfb7b76bdca8f7c9d4ee19834579c9eb28383896f3b2';

-- CT core tools: step 5 of 11, 20260930162000_traction_measurement_v2.sql
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
  SELECT source_checksum INTO recorded_checksum FROM private.ct_core_tools_sql_runs WHERE version='20260930162000';
  IF FOUND THEN
    IF recorded_checksum <> '390489800fc8b655650eee0519000d62261650011131e92cff045c30b07a1af3' THEN
      RAISE EXCEPTION 'Step 5 was applied from different SQL. Review the difference before changing an applied migration.';
    END IF;
    RAISE NOTICE 'Step 5/11 already completed; skipped.';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.ct_core_tools_sql_runs WHERE version='20260930161200') THEN
    RAISE EXCEPTION 'Run step 4 successfully before step 5.';
  END IF;

  -- Each failed attempt is a subtransaction: its DDL and locks are rolled back
  -- before retrying. Never disable RLS, event triggers or other sessions.
  FOR attempt IN 1..3 LOOP
    BEGIN

      LOCK TABLE public.ct_products IN SHARE ROW EXCLUSIVE MODE NOWAIT;
      LOCK TABLE public.traction_engine_experiments,
                 public.traction_engine_sprints,
                 public.traction_engine_weekly_logs
        IN ACCESS EXCLUSIVE MODE NOWAIT;

      EXECUTE $ct_source$
ALTER TABLE public.traction_engine_weekly_logs ADD COLUMN product_id uuid REFERENCES public.ct_products ON DELETE RESTRICT;
ALTER TABLE public.traction_engine_weekly_logs ADD COLUMN calculation_version integer NOT NULL DEFAULT 1;
ALTER TABLE public.traction_engine_sprints ADD COLUMN product_id uuid REFERENCES public.ct_products ON DELETE RESTRICT;
ALTER TABLE public.traction_engine_experiments ADD COLUMN sample_size numeric CHECK(sample_size>=0);
ALTER TABLE public.traction_engine_weekly_logs DROP CONSTRAINT traction_engine_weekly_logs_user_id_week_start_date_key;
CREATE UNIQUE INDEX traction_product_week ON public.traction_engine_weekly_logs(user_id,product_id,week_start_date) WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX traction_unassigned_week ON public.traction_engine_weekly_logs(user_id,week_start_date) WHERE product_id IS NULL;
DROP INDEX public.traction_engine_sprints_active_channel_idx;
CREATE UNIQUE INDEX traction_product_channel ON public.traction_engine_sprints(user_id,product_id,lower(channel)) WHERE status='active' AND product_id IS NOT NULL;
CREATE UNIQUE INDEX traction_unassigned_channel ON public.traction_engine_sprints(user_id,lower(channel)) WHERE status='active' AND product_id IS NULL;

CREATE TABLE public.ct_traction_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  weekly_log_id uuid NOT NULL REFERENCES public.traction_engine_weekly_logs ON DELETE CASCADE,
  revision integer NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(weekly_log_id,revision)
);
ALTER TABLE public.ct_traction_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_read ON public.ct_traction_revisions FOR SELECT TO authenticated USING(user_id=auth.uid());
GRANT SELECT ON public.ct_traction_revisions TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.ct_traction_revisions FROM anon,authenticated;

CREATE FUNCTION public.save_traction_week_v2(p_product_id uuid,p_week date,p_experiments jsonb,p_retention jsonb,p_cohort jsonb DEFAULT NULL,p_source jsonb DEFAULT NULL,p_observation_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  uid uuid:=auth.uid(); log_id uuid; exp_id uuid; v_sprint_id uuid; r jsonb; saved public.traction_engine_weekly_logs;
  streak integer:=1; cursor_week date:=p_week-7; consistency integer; quality integer; progress integer;
  mean_quality integer; mean_progress integer; discipline integer; retained integer:=0; cohort_status text:='unknown';
  origin text:='manual'; obs public.ct_metric_observations; cohort jsonb:=p_cohort; revision_number integer;
  returned numeric; denominator numeric; total_quality integer:=0; total_progress integer:=0; active_count integer;
  sprints jsonb:='[]'; ids uuid[]:='{}'; sid uuid; target numeric; actual numeric; hours numeric; own_play uuid; own_plan uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to save your week'; END IF;
  IF p_week IS NULL OR extract(isodow FROM p_week)<>1 OR p_week>current_date OR p_week<current_date-3650 THEN RAISE EXCEPTION 'Choose a valid Monday week start'; END IF;
  IF p_product_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ct_products WHERE id=p_product_id AND user_id=uid) THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF p_experiments IS NULL OR jsonb_typeof(p_experiments)<>'array' OR jsonb_array_length(p_experiments) NOT BETWEEN 1 AND 2 THEN RAISE EXCEPTION 'Record one or two experiments'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||coalesce(p_product_id::text,'unassigned'),0));
  SELECT * INTO saved FROM traction_engine_weekly_logs WHERE user_id=uid AND product_id IS NOT DISTINCT FROM p_product_id AND week_start_date=p_week FOR UPDATE;
  log_id:=coalesce(saved.id,gen_random_uuid());
  IF saved.id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ct_traction_revisions WHERE weekly_log_id=log_id) THEN
    INSERT INTO ct_traction_revisions(user_id,weekly_log_id,revision,snapshot)
    SELECT uid,log_id,1,jsonb_build_object('log',to_jsonb(saved),'experiments',(SELECT jsonb_agg(to_jsonb(e)) FROM traction_engine_experiments e WHERE e.weekly_log_id=log_id));
  END IF;
  WHILE EXISTS(SELECT 1 FROM traction_engine_weekly_logs WHERE user_id=uid AND product_id IS NOT DISTINCT FROM p_product_id AND week_start_date=cursor_week AND calculation_version=2) LOOP
    streak:=streak+1; cursor_week:=cursor_week-7;
  END LOOP;
  consistency:=least(100,round(streak::numeric/8*100));
  IF p_observation_id IS NOT NULL THEN
    SELECT * INTO obs FROM ct_metric_observations WHERE id=p_observation_id AND user_id=uid AND product_id=p_product_id;
    IF NOT FOUND OR obs.metric NOT IN ('retention_day_7','retention_day_30') THEN RAISE EXCEPTION 'Cohort observation not found'; END IF;
    cohort:=jsonb_build_object('cohortSize',obs.denominator,'returned',obs.value,'periodStart',obs.period_start,'periodEnd',obs.period_end,'startEvent',obs.definition->>'startEvent','returnEvent',obs.definition->>'returnEvent','windowDays',obs.definition->'windowDays');
    origin:=CASE WHEN obs.provenance IN ('provider','platform') THEN obs.provenance ELSE 'manual' END;
  END IF;
  IF p_observation_id IS NOT NULL AND obs.status<>'complete' THEN cohort_status:=obs.status;
  ELSIF cohort IS NOT NULL AND cohort<>'null'::jsonb THEN
    IF nullif(cohort->>'periodStart','') IS NOT NULL AND nullif(cohort->>'periodEnd','') IS NOT NULL THEN
      IF (cohort->>'periodEnd')::timestamptz<=(cohort->>'periodStart')::timestamptz THEN RAISE EXCEPTION 'Observation end must follow cohort start'; END IF;
      IF (cohort->>'periodEnd')::timestamptz>now() THEN cohort_status:='pending';
      ELSE
        returned:=(cohort->>'returned')::numeric; denominator:=(cohort->>'cohortSize')::numeric;
        IF denominator>0 AND returned>=0 AND returned<=denominator AND denominator=trunc(denominator) AND returned=trunc(returned)
          AND length(trim(cohort->>'startEvent'))>0 AND length(trim(cohort->>'returnEvent'))>0 AND (cohort->>'windowDays')::integer BETWEEN 1 AND 365
          AND (cohort->>'periodEnd')::timestamptz-(cohort->>'periodStart')::timestamptz >= make_interval(days => (cohort->>'windowDays')::integer) THEN
          cohort_status:='complete'; retained:=round(returned/denominator*100);
        END IF;
      END IF;
    END IF;
  END IF;

  FOR r IN SELECT value FROM jsonb_array_elements(p_experiments) LOOP
    IF length(trim(coalesce(r->>'channel','')))=0 OR length(trim(coalesce(r->>'hypothesis','')))=0 OR length(trim(coalesce(r->>'actionTaken','')))=0 OR length(trim(coalesce(r->>'targetMetric','')))=0
      OR coalesce(r->>'decision','') NOT IN ('double_down','iterate','narrow','pivot','kill') THEN RAISE EXCEPTION 'Complete the experiment and decision'; END IF;
    target:=(r->>'targetValue')::numeric; actual:=(r->>'resultValue')::numeric; hours:=(r->>'timeInvestedHours')::numeric;
    IF target IS NULL OR actual IS NULL OR hours IS NULL OR target<0 OR actual<0 OR hours<0 THEN RAISE EXCEPTION 'Use non-negative numeric inputs'; END IF;
    quality:=80+CASE WHEN target>0 AND hours>0 THEN 20 ELSE 0 END;
    progress:=CASE WHEN target>0 THEN least(100,round(actual/target*100)) ELSE 0 END;
    total_quality:=total_quality+quality; total_progress:=total_progress+progress;
  END LOOP;
  IF (SELECT count(DISTINCT lower(trim(value->>'channel'))) FROM jsonb_array_elements(p_experiments))<>jsonb_array_length(p_experiments) THEN RAISE EXCEPTION 'Use different channels for each experiment'; END IF;
  mean_quality:=round(total_quality::numeric/jsonb_array_length(p_experiments));
  mean_progress:=round(total_progress::numeric/jsonb_array_length(p_experiments));
  discipline:=round((consistency+mean_quality)::numeric/2);
  IF saved.id IS NULL THEN
    INSERT INTO traction_engine_weekly_logs(id,user_id,product_id,week_start_date,combined_score,consistency_score,channel_efficiency_score,experiment_quality_score,retention_health_score,channel_quality_signal,prioritized_recommendation)
      VALUES(log_id,uid,p_product_id,p_week,discipline,consistency,mean_progress,mean_quality,retained,'Retention '||cohort_status,'Review the result, evidence and observation window before changing the next experiment.');
  END IF;
  UPDATE traction_engine_weekly_logs SET calculation_version=2,
    new_users=coalesce((p_retention->>'newUsers')::integer,0),seven_day_active_users=coalesce((p_retention->>'sevenDayActiveUsers')::integer,0),thirty_day_active_users=coalesce((p_retention->>'thirtyDayActiveUsers')::integer,0),
    primary_acquisition_channel=coalesce(p_retention->>'primaryAcquisitionChannel',''), product_category=coalesce(p_retention->>'productCategory','other'),revenue=(p_retention->>'revenue')::numeric,
    combined_score=discipline,consistency_score=consistency,channel_efficiency_score=mean_progress,experiment_quality_score=mean_quality,retention_health_score=retained,consistency_streak_weeks=streak,
    phase_seven_ready=false,channel_quality_signal='Retention '||cohort_status,prioritized_recommendation='Review the result, evidence and observation window before changing the next experiment.',
    score_breakdown=jsonb_build_object('calculationVersion',2,'retentionSource',origin,'retentionStatus',cohort_status,'cohort',cohort,'observationId',p_observation_id,'executionDiscipline',discipline),
    verification_mode='founder_reported',updated_at=now()
    WHERE id=log_id;
  FOR r IN SELECT value FROM jsonb_array_elements(p_experiments) LOOP
    SELECT id INTO v_sprint_id FROM traction_engine_sprints WHERE user_id=uid AND product_id IS NOT DISTINCT FROM p_product_id AND lower(channel)=lower(trim(r->>'channel')) AND status='active' FOR UPDATE;
    IF v_sprint_id IS NULL THEN
      SELECT count(*) INTO active_count FROM traction_engine_sprints WHERE user_id=uid AND product_id IS NOT DISTINCT FROM p_product_id AND status='active';
      IF active_count>=2 THEN RAISE EXCEPTION 'Close an active sprint before adding a third channel'; END IF;
      INSERT INTO traction_engine_sprints(user_id,product_id,channel,cycle_start_date) VALUES(uid,p_product_id,trim(r->>'channel'),p_week) RETURNING id INTO v_sprint_id;
    END IF;
    IF p_source IS NOT NULL AND lower(p_source->>'channel')=lower(trim(r->>'channel')) THEN
      SELECT id,plan_id INTO own_play,own_plan FROM gtm_plays WHERE id=(p_source->>'playId')::uuid AND plan_id=(p_source->>'planId')::uuid AND user_id=uid;
      IF own_play IS NULL THEN RAISE EXCEPTION 'GTM play not found'; END IF;
      IF p_product_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ct_product_artifacts WHERE user_id=uid AND tool='gtm_strategist' AND artifact_id=own_plan AND product_id=p_product_id) THEN RAISE EXCEPTION 'Assign the GTM plan to the same product before saving this handoff'; END IF;
      UPDATE traction_engine_sprints SET source_gtm_play_id=own_play,source_gtm_plan_id=own_plan WHERE id=v_sprint_id;
    END IF;
    SELECT e.id INTO exp_id FROM traction_engine_experiments e WHERE e.weekly_log_id=log_id AND e.user_id=uid AND e.sprint_id=v_sprint_id;
    exp_id:=coalesce(exp_id,gen_random_uuid()); ids:=array_append(ids,exp_id);
    target:=(r->>'targetValue')::numeric; actual:=(r->>'resultValue')::numeric; hours:=(r->>'timeInvestedHours')::numeric;
    INSERT INTO traction_engine_experiments(id,user_id,weekly_log_id,sprint_id,channel,hypothesis,action_taken,target_metric,target_value,result_value,time_invested_hours,decision,recommended_decision,override_rationale,pass,efficiency_score,quality_score,sample_size)
      VALUES(exp_id,uid,log_id,v_sprint_id,trim(r->>'channel'),r->>'hypothesis',r->>'actionTaken',r->>'targetMetric',target,actual,hours,r->>'decision','iterate',nullif(r->>'decisionRationale',''),target>0 AND actual>=target,CASE WHEN target>0 THEN least(100,round(actual/target*100)) ELSE 0 END,80+CASE WHEN target>0 AND hours>0 THEN 20 ELSE 0 END,coalesce((r->>'sampleSize')::numeric,0))
      ON CONFLICT(id) DO UPDATE SET hypothesis=excluded.hypothesis,action_taken=excluded.action_taken,target_metric=excluded.target_metric,target_value=excluded.target_value,result_value=excluded.result_value,time_invested_hours=excluded.time_invested_hours,decision=excluded.decision,override_rationale=excluded.override_rationale,pass=excluded.pass,efficiency_score=excluded.efficiency_score,quality_score=excluded.quality_score,sample_size=excluded.sample_size;
    sprints:=sprints||(SELECT jsonb_build_array(to_jsonb(s)) FROM traction_engine_sprints s WHERE id=v_sprint_id);
  END LOOP;
  DELETE FROM traction_engine_experiments WHERE weekly_log_id=log_id AND user_id=uid AND NOT(id=ANY(ids));
  SELECT coalesce(max(revision),0)+1 INTO revision_number FROM ct_traction_revisions WHERE weekly_log_id=log_id;
  INSERT INTO ct_traction_revisions(user_id,weekly_log_id,revision,snapshot)
    SELECT uid,log_id,revision_number,jsonb_build_object('log',to_jsonb(l),'experiments',(SELECT jsonb_agg(to_jsonb(e)) FROM traction_engine_experiments e WHERE weekly_log_id=log_id)) FROM traction_engine_weekly_logs l WHERE id=log_id;
  IF p_product_id IS NOT NULL THEN INSERT INTO ct_product_artifacts(user_id,product_id,tool,artifact_id) VALUES(uid,p_product_id,'traction_engine',log_id) ON CONFLICT DO NOTHING; END IF;
  RETURN jsonb_build_object('logId',log_id,'sprints',sprints,'revision',revision_number);
END $$;
REVOKE ALL ON FUNCTION public.save_traction_week_v2(uuid,date,jsonb,jsonb,jsonb,jsonb,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_traction_week_v2(uuid,date,jsonb,jsonb,jsonb,jsonb,uuid) TO authenticated;

-- Historical benchmarks are retained for legacy reports. New comparisons must
-- select an explicit calculation version instead of mixing scoring methods.
CREATE FUNCTION public.get_traction_category_benchmarks_v2(p_category text)
RETURNS TABLE(cohort_users integer,p25 numeric,p50 numeric,p75 numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH founders AS (SELECT user_id,avg(combined_score) score FROM traction_engine_weekly_logs
    WHERE product_category=p_category AND calculation_version=2 AND product_id IS NOT NULL
      AND week_start_date>=current_date-180 GROUP BY user_id)
  SELECT count(*)::integer,percentile_cont(.25) WITHIN GROUP(ORDER BY score)::numeric,
    percentile_cont(.5) WITHIN GROUP(ORDER BY score)::numeric,percentile_cont(.75) WITHIN GROUP(ORDER BY score)::numeric
  FROM founders HAVING count(*)>=20;
$$;
REVOKE ALL ON FUNCTION public.get_traction_category_benchmarks_v2(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_traction_category_benchmarks_v2(text) TO authenticated;

-- Weekly corrections must pass through the versioned transaction. Direct client
-- writes could otherwise forge scores, source labels, or destroy revision history.
REVOKE INSERT,UPDATE,DELETE ON public.traction_engine_weekly_logs,public.traction_engine_experiments FROM anon,authenticated;
$ct_source$;
      EXIT;
    EXCEPTION WHEN deadlock_detected OR lock_not_available THEN
      GET STACKED DIAGNOSTICS failed_context = PG_EXCEPTION_CONTEXT,
                              failed_detail = PG_EXCEPTION_DETAIL;
      IF attempt = 3 THEN
        RAISE EXCEPTION USING ERRCODE=SQLSTATE,
          MESSAGE='Step 5/11 could not obtain database locks: ' || SQLERRM,
          DETAIL=coalesce(failed_detail, '') || E'\nFailing SQL context:\n' || coalesce(failed_context, ''),
          HINT='Earlier completed steps are saved. Run docs/product/ct-core-tools-lock-diagnostics.sql and share the results before retrying. Do not proceed to the next step.';
      END IF;
      PERFORM pg_sleep(0.25 * attempt);
    END;
  END LOOP;
  INSERT INTO private.ct_core_tools_sql_runs(version,source_checksum) VALUES('20260930162000','390489800fc8b655650eee0519000d62261650011131e92cff045c30b07a1af3');
END;
$ct_install$;

COMMIT;
SELECT '5/11' AS step, '20260930162000_traction_measurement_v2' AS migration, 'Completed' AS status
FROM private.ct_core_tools_sql_runs WHERE version='20260930162000' AND source_checksum='390489800fc8b655650eee0519000d62261650011131e92cff045c30b07a1af3';

-- CT core tools: step 6 of 11, 20260930162500_gtm_product_activation.sql
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
  SELECT source_checksum INTO recorded_checksum FROM private.ct_core_tools_sql_runs WHERE version='20260930162500';
  IF FOUND THEN
    IF recorded_checksum <> 'a1d57e7ab73a8a194d857b471d78d49096ecf02419f6424cb80f950bc27eb7af' THEN
      RAISE EXCEPTION 'Step 6 was applied from different SQL. Review the difference before changing an applied migration.';
    END IF;
    RAISE NOTICE 'Step 6/11 already completed; skipped.';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.ct_core_tools_sql_runs WHERE version='20260930162000') THEN
    RAISE EXCEPTION 'Run step 5 successfully before step 6.';
  END IF;

  -- Each failed attempt is a subtransaction: its DDL and locks are rolled back
  -- before retrying. Never disable RLS, event triggers or other sessions.
  FOR attempt IN 1..3 LOOP
    BEGIN

      EXECUTE $ct_source$
CREATE OR REPLACE FUNCTION public.activate_gtm_play_v2(
  p_plan_id uuid,
  p_play_id uuid,
  p_channel text,
  p_activation_payload jsonb,
  p_idempotency_key text
)
RETURNS TABLE(sprint_id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  resolved_sprint_id uuid;
  selected_product uuid;
  active_count integer;
  rewritten_plays jsonb;
BEGIN
  IF caller_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.gtm_plans WHERE id = p_plan_id AND user_id = caller_id) THEN
    RAISE EXCEPTION 'GTM plan not found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.gtm_plays WHERE id = p_play_id AND plan_id = p_plan_id AND user_id = caller_id) THEN
    RAISE EXCEPTION 'GTM play not found';
  END IF;

  SELECT product_id INTO selected_product FROM public.ct_product_artifacts WHERE user_id=caller_id AND tool='gtm_strategist' AND artifact_id=p_plan_id;
  PERFORM pg_advisory_xact_lock(hashtextextended(caller_id::text||coalesce(selected_product::text,'unassigned'),0));

  SELECT id INTO resolved_sprint_id
    FROM public.traction_engine_sprints
    WHERE user_id = caller_id
      AND product_id IS NOT DISTINCT FROM selected_product
      AND (activation_idempotency_key = p_idempotency_key OR (status = 'active' AND lower(channel) = lower(trim(p_channel))))
    ORDER BY created_at DESC LIMIT 1;

  IF resolved_sprint_id IS NULL THEN
    SELECT count(*) INTO active_count FROM public.traction_engine_sprints WHERE user_id = caller_id AND product_id IS NOT DISTINCT FROM selected_product AND status = 'active';
    IF active_count >= 2 THEN RAISE EXCEPTION 'Traction Engine supports two active channels at a time'; END IF;
    INSERT INTO public.traction_engine_sprints (
      user_id, product_id, channel, cycle_start_date, status, source_gtm_plan_id, source_gtm_play_id,
      activation_payload, activation_idempotency_key, review_due_at
    ) VALUES (
      caller_id, selected_product, trim(p_channel), date_trunc('week',now() AT TIME ZONE 'UTC')::date, 'active', p_plan_id, p_play_id,
      COALESCE(p_activation_payload, '{}'::jsonb), p_idempotency_key, now() + interval '7 days'
    ) RETURNING id INTO resolved_sprint_id;
  ELSE
    UPDATE public.traction_engine_sprints SET
      source_gtm_plan_id = p_plan_id,
      source_gtm_play_id = p_play_id,
      activation_payload = COALESCE(p_activation_payload, activation_payload),
      activation_idempotency_key = COALESCE(activation_idempotency_key, p_idempotency_key),
      review_due_at = COALESCE(review_due_at, now() + interval '7 days')
    WHERE id = resolved_sprint_id AND user_id = caller_id;
  END IF;

  UPDATE public.gtm_plays SET
    status = 'active',
    play_content = play_content || jsonb_build_object('status', 'active', 'tractionSprintId', resolved_sprint_id::text)
  WHERE id = p_play_id AND user_id = caller_id;

  SELECT jsonb_agg(
    CASE WHEN item->>'id' = p_play_id::text
      THEN item || jsonb_build_object('status', 'active', 'tractionSprintId', resolved_sprint_id::text)
      ELSE item END
  ) INTO rewritten_plays
  FROM jsonb_array_elements((SELECT plan_content->'plays' FROM public.gtm_plans WHERE id = p_plan_id)) AS item;

  UPDATE public.gtm_plans SET
    plan_content = jsonb_set(plan_content, '{plays}', COALESCE(rewritten_plays, '[]'::jsonb), true),
    updated_at = now()
  WHERE id = p_plan_id AND user_id = caller_id;

  RETURN QUERY SELECT resolved_sprint_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_gtm_play_v2(uuid, uuid, text, jsonb, text) TO authenticated;
$ct_source$;
      EXIT;
    EXCEPTION WHEN deadlock_detected OR lock_not_available THEN
      GET STACKED DIAGNOSTICS failed_context = PG_EXCEPTION_CONTEXT,
                              failed_detail = PG_EXCEPTION_DETAIL;
      IF attempt = 3 THEN
        RAISE EXCEPTION USING ERRCODE=SQLSTATE,
          MESSAGE='Step 6/11 could not obtain database locks: ' || SQLERRM,
          DETAIL=coalesce(failed_detail, '') || E'\nFailing SQL context:\n' || coalesce(failed_context, ''),
          HINT='Earlier completed steps are saved. Run docs/product/ct-core-tools-lock-diagnostics.sql and share the results before retrying. Do not proceed to the next step.';
      END IF;
      PERFORM pg_sleep(0.25 * attempt);
    END;
  END LOOP;
  INSERT INTO private.ct_core_tools_sql_runs(version,source_checksum) VALUES('20260930162500','a1d57e7ab73a8a194d857b471d78d49096ecf02419f6424cb80f950bc27eb7af');
END;
$ct_install$;

COMMIT;
SELECT '6/11' AS step, '20260930162500_gtm_product_activation' AS migration, 'Completed' AS status
FROM private.ct_core_tools_sql_runs WHERE version='20260930162500' AND source_checksum='a1d57e7ab73a8a194d857b471d78d49096ecf02419f6424cb80f950bc27eb7af';

-- CT core tools: step 7 of 11, 20260930163000_gtm_review_proposals.sql
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
  SELECT source_checksum INTO recorded_checksum FROM private.ct_core_tools_sql_runs WHERE version='20260930163000';
  IF FOUND THEN
    IF recorded_checksum <> '9409c3e030330d002c18ff98b7ba69296cf4ac22bb0b29521dd46be3f2e1d14c' THEN
      RAISE EXCEPTION 'Step 7 was applied from different SQL. Review the difference before changing an applied migration.';
    END IF;
    RAISE NOTICE 'Step 7/11 already completed; skipped.';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.ct_core_tools_sql_runs WHERE version='20260930162500') THEN
    RAISE EXCEPTION 'Run step 6 successfully before step 7.';
  END IF;

  -- Each failed attempt is a subtransaction: its DDL and locks are rolled back
  -- before retrying. Never disable RLS, event triggers or other sessions.
  FOR attempt IN 1..3 LOOP
    BEGIN

      EXECUTE $ct_source$
CREATE TABLE public.ct_gtm_review_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.gtm_plans ON DELETE CASCADE,
  play_id uuid NOT NULL REFERENCES public.gtm_plays ON DELETE CASCADE,
  base_plan jsonb NOT NULL,
  proposed_plan jsonb NOT NULL,
  review jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','applied')),
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);
ALTER TABLE public.ct_gtm_review_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_read ON public.ct_gtm_review_proposals FOR SELECT TO authenticated USING(user_id=auth.uid());
GRANT SELECT ON public.ct_gtm_review_proposals TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.ct_gtm_review_proposals FROM anon,authenticated;

CREATE FUNCTION public.apply_gtm_review_proposal(p_proposal_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p ct_gtm_review_proposals; current_plan jsonb; r jsonb; saved_review jsonb; next_version integer; version_id uuid; BEGIN
  SELECT * INTO p FROM ct_gtm_review_proposals WHERE id=p_proposal_id AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Review proposal not found'; END IF;
  SELECT plan_content INTO current_plan FROM gtm_plans WHERE id=p.plan_id AND user_id=auth.uid() FOR UPDATE;
  IF p.status='applied' THEN RETURN jsonb_build_object('success',true,'analysis',current_plan,'review',p.review,'applied',true); END IF;
  IF current_plan IS DISTINCT FROM p.base_plan THEN RAISE EXCEPTION 'Your plan changed after this preview. Generate a fresh review before applying it.'; END IF;
  FOR r IN SELECT value FROM jsonb_array_elements(coalesce(p.proposed_plan->'plays','[]')) LOOP
    UPDATE gtm_plays SET play_content=r,status=r->>'status' WHERE id=(r->>'id')::uuid AND plan_id=p.plan_id AND user_id=p.user_id;
  END LOOP;
  DELETE FROM gtm_tasks WHERE plan_id=p.plan_id AND user_id=p.user_id AND status<>'done'
    AND NOT(id IN (SELECT value->>'id' FROM jsonb_array_elements(coalesce(p.proposed_plan->'tasks','[]'))));
  FOR r IN SELECT value FROM jsonb_array_elements(coalesce(p.proposed_plan->'tasks','[]')) LOOP
    INSERT INTO gtm_tasks(id,user_id,plan_id,play_id,week_number,title,detail,owner_label,time_estimate_minutes,expected_output,metric,status)
      VALUES(r->>'id',p.user_id,p.plan_id,nullif(r->>'playId',''),(r->>'week')::integer,r->>'title',coalesce(r->>'detail',''),coalesce(r->>'owner','Founder'),coalesce((r->>'timeEstimateMinutes')::integer,30),coalesce(r->>'output',''),coalesce(r->>'metric',''),r->>'status')
      ON CONFLICT(id) DO UPDATE SET title=excluded.title,detail=excluded.detail,time_estimate_minutes=excluded.time_estimate_minutes,expected_output=excluded.expected_output,metric=excluded.metric,status=excluded.status
      WHERE gtm_tasks.user_id=p.user_id AND gtm_tasks.plan_id=p.plan_id AND gtm_tasks.status<>'done';
  END LOOP;
  FOR r IN SELECT value FROM jsonb_array_elements(coalesce(p.proposed_plan->'assets','[]')) LOOP
    UPDATE gtm_play_assets SET content=r->>'content',status=r->>'status' WHERE id=r->>'id' AND plan_id=p.plan_id AND user_id=p.user_id AND status<>'approved';
  END LOOP;
  -- Rebuild task snapshots from the rows we actually saved, including completed
  -- work that was finished after the preview or omitted by a proposed revision.
  SELECT jsonb_set(p.proposed_plan,'{tasks}',coalesce(jsonb_agg(jsonb_build_object('id',t.id,'playId',t.play_id,'week',t.week_number,'title',t.title,'detail',t.detail,'owner',t.owner_label,'timeEstimateMinutes',t.time_estimate_minutes,'output',t.expected_output,'metric',t.metric,'status',t.status)),'[]')) INTO p.proposed_plan FROM gtm_tasks t WHERE t.plan_id=p.plan_id AND t.user_id=p.user_id;
  SELECT greatest(coalesce(max(version),0),coalesce((current_plan->>'version')::integer,1))+1 INTO next_version FROM gtm_plan_versions WHERE plan_id=p.plan_id;
  p.proposed_plan:=jsonb_set(p.proposed_plan,'{version}',to_jsonb(next_version));
  INSERT INTO gtm_plan_versions(plan_id,user_id,version,plan_content,research_sources,research_status)
    VALUES(p.plan_id,p.user_id,next_version,p.proposed_plan,coalesce(p.proposed_plan->'researchSources','[]'),coalesce(p.proposed_plan->>'researchStatus','unavailable')) RETURNING id INTO version_id;
  UPDATE gtm_plays SET plan_version_id=version_id WHERE plan_id=p.plan_id AND user_id=p.user_id;
  UPDATE gtm_plans SET plan_content=p.proposed_plan,current_version=next_version,updated_at=now() WHERE id=p.plan_id AND user_id=p.user_id;
  INSERT INTO gtm_weekly_reviews(plan_id,play_id,traction_experiment_id,user_id,week_start,decision,next_best_action,evidence_summary,adaptation,health_snapshot,review_input,signals,change_log)
    VALUES(p.plan_id,p.play_id,nullif(p.review->>'traction_experiment_id','')::uuid,p.user_id,(p.review->>'week_start')::date,p.review->>'decision',p.review->>'next_best_action',p.review->>'evidence_summary',p.review->'adaptation',p.review->'health_snapshot',p.review->'review_input',p.review->'signals',p.review->'change_log')
    ON CONFLICT(plan_id,week_start) DO UPDATE SET play_id=excluded.play_id,traction_experiment_id=excluded.traction_experiment_id,decision=excluded.decision,next_best_action=excluded.next_best_action,evidence_summary=excluded.evidence_summary,adaptation=excluded.adaptation,health_snapshot=excluded.health_snapshot,review_input=excluded.review_input,signals=excluded.signals,change_log=excluded.change_log
    RETURNING to_jsonb(gtm_weekly_reviews.*) INTO saved_review;
  UPDATE ct_gtm_review_proposals SET status='applied',applied_at=now(),proposed_plan=p.proposed_plan WHERE id=p.id;
  RETURN jsonb_build_object('success',true,'analysis',p.proposed_plan,'review',saved_review,'applied',true);
END $$;
REVOKE ALL ON FUNCTION public.apply_gtm_review_proposal(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_gtm_review_proposal(uuid) TO authenticated;

GRANT ALL ON public.ct_gtm_review_proposals TO service_role;
$ct_source$;
      EXIT;
    EXCEPTION WHEN deadlock_detected OR lock_not_available THEN
      GET STACKED DIAGNOSTICS failed_context = PG_EXCEPTION_CONTEXT,
                              failed_detail = PG_EXCEPTION_DETAIL;
      IF attempt = 3 THEN
        RAISE EXCEPTION USING ERRCODE=SQLSTATE,
          MESSAGE='Step 7/11 could not obtain database locks: ' || SQLERRM,
          DETAIL=coalesce(failed_detail, '') || E'\nFailing SQL context:\n' || coalesce(failed_context, ''),
          HINT='Earlier completed steps are saved. Run docs/product/ct-core-tools-lock-diagnostics.sql and share the results before retrying. Do not proceed to the next step.';
      END IF;
      PERFORM pg_sleep(0.25 * attempt);
    END;
  END LOOP;
  INSERT INTO private.ct_core_tools_sql_runs(version,source_checksum) VALUES('20260930163000','9409c3e030330d002c18ff98b7ba69296cf4ac22bb0b29521dd46be3f2e1d14c');
END;
$ct_install$;

COMMIT;
SELECT '7/11' AS step, '20260930163000_gtm_review_proposals' AS migration, 'Completed' AS status
FROM private.ct_core_tools_sql_runs WHERE version='20260930163000' AND source_checksum='9409c3e030330d002c18ff98b7ba69296cf4ac22bb0b29521dd46be3f2e1d14c';

-- CT core tools: step 8 of 11, 20260930164000_pmf_connected_evidence.sql
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
  SELECT source_checksum INTO recorded_checksum FROM private.ct_core_tools_sql_runs WHERE version='20260930164000';
  IF FOUND THEN
    IF recorded_checksum <> 'd3bb7becaf86ae54c967f646a64f15e6b5e152923047c24c68ab352bdad87575' THEN
      RAISE EXCEPTION 'Step 8 was applied from different SQL. Review the difference before changing an applied migration.';
    END IF;
    RAISE NOTICE 'Step 8/11 already completed; skipped.';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.ct_core_tools_sql_runs WHERE version='20260930163000') THEN
    RAISE EXCEPTION 'Run step 7 successfully before step 8.';
  END IF;

  -- Each failed attempt is a subtransaction: its DDL and locks are rolled back
  -- before retrying. Never disable RLS, event triggers or other sessions.
  FOR attempt IN 1..3 LOOP
    BEGIN

      EXECUTE $ct_source$
ALTER TABLE public.pmf_interviews ADD COLUMN source_evidence_id uuid REFERENCES public.ct_evidence ON DELETE SET NULL,
  ADD COLUMN participant_key text, ADD COLUMN incentivized boolean NOT NULL DEFAULT false,
  ADD COLUMN target_customer boolean NOT NULL DEFAULT true;
CREATE UNIQUE INDEX pmf_import_evidence_unique ON public.pmf_interviews(validation_context_id,source_evidence_id);
CREATE UNIQUE INDEX pmf_import_participant_unique ON public.pmf_interviews(validation_context_id,participant_key) WHERE participant_key IS NOT NULL;

CREATE FUNCTION public.ct_accept_pmf_evidence(p_context uuid,p_evidence uuid,p_target_customer boolean,p_screening text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e ct_evidence; interview_id uuid; BEGIN
  SELECT e0.* INTO e FROM ct_evidence e0 JOIN ct_product_artifacts a ON a.product_id=e0.product_id AND a.user_id=e0.user_id
    WHERE e0.id=p_evidence AND e0.user_id=auth.uid() AND a.tool='pmf_lab' AND a.artifact_id=p_context;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM prebuild_validation_contexts WHERE id=p_context AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Evidence is not assigned to this validation context'; END IF;
  IF e.kind NOT IN ('interview','survey','session') OR length(trim(coalesce(e.summary->>'feedback','')))<10 THEN RAISE EXCEPTION 'Map substantive customer feedback before adding evidence'; END IF;
  IF p_target_customer AND length(trim(coalesce(p_screening,'')))<20 THEN RAISE EXCEPTION 'Explain how this person matches your target customer'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_context::text,0));
  SELECT id INTO interview_id FROM pmf_interviews WHERE validation_context_id=p_context AND user_id=auth.uid()
    AND (source_evidence_id=e.id OR (e.participant_key IS NOT NULL AND participant_key=e.participant_key));
  IF interview_id IS NOT NULL THEN
    UPDATE pmf_interviews SET target_customer=coalesce(p_target_customer,false),basic_profile=coalesce(p_screening,'')
      WHERE id=interview_id AND source_evidence_id=e.id;
    RETURN interview_id;
  END IF;
  interview_id:=gen_random_uuid();
  INSERT INTO pmf_interviews(id,user_id,validation_context_id,source_evidence_id,participant_key,incentivized,target_customer,
    interviewee_name,basic_profile,segment,main_feedback,objections,interest_level,buying_intent,created_at)
  VALUES(interview_id,auth.uid(),p_context,e.id,e.participant_key,e.incentivized,coalesce(p_target_customer,false),
    coalesce(nullif(e.summary->>'respondent',''),'Imported reviewer'),coalesce(p_screening,''),e.segment,
    e.summary->>'feedback',coalesce(e.summary->>'objections',''),3,'low',e.captured_at);
  RETURN interview_id;
END $$;
REVOKE ALL ON FUNCTION public.ct_accept_pmf_evidence(uuid,uuid,boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ct_accept_pmf_evidence(uuid,uuid,boolean,text) TO authenticated;

-- A direct edit cannot retain an external source badge or alter its original evidence.
CREATE FUNCTION public.ct_pmf_manual_edit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    NEW.evidence_origin:='founder_reported';
    IF TG_OP='INSERT' THEN NEW.source_evidence_id:=NULL; NEW.participant_key:=NULL; NEW.incentivized:=false;
    ELSE NEW.source_evidence_id:=OLD.source_evidence_id; NEW.participant_key:=OLD.participant_key; NEW.incentivized:=OLD.incentivized; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ct_pmf_manual_edit BEFORE INSERT OR UPDATE ON public.pmf_interviews FOR EACH ROW EXECUTE FUNCTION public.ct_pmf_manual_edit();
$ct_source$;
      EXIT;
    EXCEPTION WHEN deadlock_detected OR lock_not_available THEN
      GET STACKED DIAGNOSTICS failed_context = PG_EXCEPTION_CONTEXT,
                              failed_detail = PG_EXCEPTION_DETAIL;
      IF attempt = 3 THEN
        RAISE EXCEPTION USING ERRCODE=SQLSTATE,
          MESSAGE='Step 8/11 could not obtain database locks: ' || SQLERRM,
          DETAIL=coalesce(failed_detail, '') || E'\nFailing SQL context:\n' || coalesce(failed_context, ''),
          HINT='Earlier completed steps are saved. Run docs/product/ct-core-tools-lock-diagnostics.sql and share the results before retrying. Do not proceed to the next step.';
      END IF;
      PERFORM pg_sleep(0.25 * attempt);
    END;
  END LOOP;
  INSERT INTO private.ct_core_tools_sql_runs(version,source_checksum) VALUES('20260930164000','d3bb7becaf86ae54c967f646a64f15e6b5e152923047c24c68ab352bdad87575');
END;
$ct_install$;

COMMIT;
SELECT '8/11' AS step, '20260930164000_pmf_connected_evidence' AS migration, 'Completed' AS status
FROM private.ct_core_tools_sql_runs WHERE version='20260930164000' AND source_checksum='d3bb7becaf86ae54c967f646a64f15e6b5e152923047c24c68ab352bdad87575';

-- CT core tools: step 9 of 11, 20260930165000_validation_sessions.sql
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
  SELECT source_checksum INTO recorded_checksum FROM private.ct_core_tools_sql_runs WHERE version='20260930165000';
  IF FOUND THEN
    IF recorded_checksum <> '9ecf3842fb97d2b778cf3fe0a40d80c2fc727af84bc09db34cd1216930717193' THEN
      RAISE EXCEPTION 'Step 9 was applied from different SQL. Review the difference before changing an applied migration.';
    END IF;
    RAISE NOTICE 'Step 9/11 already completed; skipped.';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.ct_core_tools_sql_runs WHERE version='20260930164000') THEN
    RAISE EXCEPTION 'Run step 8 successfully before step 9.';
  END IF;

  -- Each failed attempt is a subtransaction: its DDL and locks are rolled back
  -- before retrying. Never disable RLS, event triggers or other sessions.
  FOR attempt IN 1..3 LOOP
    BEGIN

      EXECUTE $ct_source$
CREATE TABLE public.ct_reviewer_profiles (
 user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE, display_name text NOT NULL,
 role text NOT NULL, industry text NOT NULL, problems text[] NOT NULL DEFAULT '{}', languages text[] NOT NULL DEFAULT '{en}',
 timezone text NOT NULL DEFAULT 'UTC', opted_in boolean NOT NULL DEFAULT false
);
CREATE TABLE public.ct_reviewer_exclusions (
 user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE, other_user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 reason text NOT NULL CHECK(reason IN ('blocked','collaborator')), PRIMARY KEY(user_id,other_user_id),CHECK(user_id<>other_user_id)
);
CREATE TABLE public.ct_reviewer_slots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 starts_at timestamptz NOT NULL, booked boolean NOT NULL DEFAULT false, UNIQUE(user_id,starts_at)
);
CREATE TABLE public.ct_validation_google_accounts (
 user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE, google_subject text NOT NULL UNIQUE,
 email text NOT NULL, encrypted_secret text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ct_validation_oauth_states (
 state uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes'
);
CREATE TABLE public.ct_validation_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), founder_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 reviewer_id uuid REFERENCES auth.users ON DELETE SET NULL, product_id uuid NOT NULL REFERENCES ct_products ON DELETE RESTRICT,
 context_id uuid NOT NULL REFERENCES prebuild_validation_contexts ON DELETE CASCADE, slot_id uuid REFERENCES ct_reviewer_slots,
 starts_at timestamptz NOT NULL, status text NOT NULL DEFAULT 'booked' CHECK(status IN ('invited','booked','cancelled','completed','review')),
 guest_name text, guest_email text, guest_token_hash text UNIQUE, guest_expires_at timestamptz,
 calendar_id text, meet_url text, calendar_state text NOT NULL DEFAULT 'pending', calendar_error text,
 attendance_status text NOT NULL DEFAULT 'pending' CHECK(attendance_status IN ('pending','verified','review')),
 overlap_seconds integer NOT NULL DEFAULT 0, attendance_evidence jsonb NOT NULL DEFAULT '{}',
 pre_feedback jsonb, feedback jsonb, feedback_at timestamptz, target_customer boolean NOT NULL DEFAULT false,
 screening text, reward_status text NOT NULL DEFAULT 'pending' CHECK(reward_status IN ('pending','held','review','granted','ineligible')),
 reward_eligible_at timestamptz, review_reason text, evidence_id uuid REFERENCES ct_evidence,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(founder_id IS DISTINCT FROM reviewer_id)
);
CREATE INDEX validation_session_due ON ct_validation_sessions(starts_at) WHERE status IN ('booked','review');
CREATE TABLE public.ct_validation_rewards (
 session_id uuid PRIMARY KEY REFERENCES ct_validation_sessions ON DELETE RESTRICT,
 reviewer_id uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT, founder_id uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
 amount integer NOT NULL DEFAULT 20 CHECK(amount=20), granted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ct_validation_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),session_id uuid NOT NULL REFERENCES ct_validation_sessions ON DELETE CASCADE,
 event text NOT NULL,detail jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['ct_reviewer_profiles','ct_reviewer_exclusions','ct_reviewer_slots','ct_validation_google_accounts','ct_validation_oauth_states','ct_validation_sessions','ct_validation_rewards','ct_validation_events'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 END LOOP;
END $$;
CREATE POLICY owner_profile ON ct_reviewer_profiles FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE POLICY owner_exclusion ON ct_reviewer_exclusions FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE POLICY owner_slots ON ct_reviewer_slots FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY participant_sessions ON ct_validation_sessions FOR SELECT TO authenticated USING(founder_id=auth.uid() OR reviewer_id=auth.uid());
CREATE POLICY reviewer_rewards ON ct_validation_rewards FOR SELECT TO authenticated USING(reviewer_id=auth.uid());
CREATE POLICY participant_events ON ct_validation_events FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM ct_validation_sessions WHERE id=session_id AND (founder_id=auth.uid() OR reviewer_id=auth.uid())));
GRANT SELECT,INSERT,UPDATE,DELETE ON ct_reviewer_profiles,ct_reviewer_exclusions TO authenticated;
GRANT SELECT ON ct_reviewer_slots,ct_validation_sessions,ct_validation_rewards,ct_validation_events TO authenticated;
-- Invitation bearer credentials stay service-only, even to authenticated participants.
REVOKE SELECT ON ct_validation_sessions FROM authenticated;
GRANT SELECT(id,founder_id,reviewer_id,product_id,context_id,slot_id,starts_at,status,guest_name,calendar_state,calendar_error,meet_url,attendance_status,overlap_seconds,pre_feedback,feedback,feedback_at,target_customer,screening,reward_status,reward_eligible_at,review_reason,evidence_id,created_at) ON ct_validation_sessions TO authenticated;

CREATE FUNCTION public.ct_find_reviewers(p_language text,p_role text,p_industry text,p_problems text[],p_from timestamptz,p_to timestamptz)
RETURNS TABLE(slot_id uuid,user_id uuid,display_name text,role text,industry text,timezone text,starts_at timestamptz,match_reasons text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT s.id,p.user_id,p.display_name,p.role,p.industry,p.timezone,s.starts_at,
   array_remove(ARRAY[CASE WHEN p.problems&&p_problems THEN 'Has experienced a matching problem' END,CASE WHEN lower(p.role)=lower(p_role) THEN 'Matches the buyer or user role' END,CASE WHEN lower(p.industry)=lower(p_industry) THEN 'Works in the target industry' END],NULL)
 FROM ct_reviewer_profiles p JOIN ct_reviewer_slots s ON s.user_id=p.user_id
 WHERE auth.uid() IS NOT NULL AND p.opted_in AND p.user_id<>auth.uid() AND p_language=ANY(p.languages)
   AND NOT s.booked AND s.starts_at>now() AND s.starts_at BETWEEN p_from AND p_to
   AND NOT EXISTS(SELECT 1 FROM ct_reviewer_exclusions e WHERE (e.user_id=auth.uid() AND e.other_user_id=p.user_id) OR (e.user_id=p.user_id AND e.other_user_id=auth.uid()))
 ORDER BY (p.problems&&p_problems) DESC,(lower(p.role)=lower(p_role)) DESC,(lower(p.industry)=lower(p_industry)) DESC,s.starts_at LIMIT 30;
$$;
CREATE FUNCTION public.ct_offer_reviewer_slot(p_start timestamptz) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result uuid; BEGIN
 IF auth.uid() IS NULL OR p_start<now()+interval '1 hour' OR p_start>now()+interval '90 days' THEN RAISE EXCEPTION 'Choose a time between one hour and 90 days from now'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 IF EXISTS(SELECT 1 FROM ct_reviewer_slots WHERE user_id=auth.uid() AND starts_at<p_start+interval '25 minutes' AND starts_at+interval '25 minutes'>p_start) THEN RAISE EXCEPTION 'This availability overlaps another slot'; END IF;
 INSERT INTO ct_reviewer_slots(user_id,starts_at) VALUES(auth.uid(),p_start) RETURNING id INTO result; RETURN result;
END $$;
CREATE FUNCTION public.ct_book_validation(p_slot uuid,p_context uuid,p_product uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s ct_reviewer_slots; result uuid; BEGIN
 -- One lock serializes booking, rescheduling and reward eligibility checks during the small pilot.
 PERFORM pg_advisory_xact_lock(hashtextextended('ct-validation-pilot',0));
 SELECT * INTO s FROM ct_reviewer_slots WHERE id=p_slot AND NOT booked AND starts_at>now() FOR UPDATE;
 IF NOT FOUND OR s.user_id=auth.uid() OR auth.uid() IS NULL THEN RAISE EXCEPTION 'Slot is no longer available'; END IF;
 IF NOT EXISTS(SELECT 1 FROM ct_product_artifacts WHERE user_id=auth.uid() AND product_id=p_product AND artifact_id=p_context AND tool='pmf_lab') THEN RAISE EXCEPTION 'Assign this validation context to your product first'; END IF;
 IF NOT EXISTS(SELECT 1 FROM ct_reviewer_profiles WHERE user_id=s.user_id AND opted_in) OR EXISTS(SELECT 1 FROM ct_reviewer_exclusions WHERE (user_id=auth.uid() AND other_user_id=s.user_id) OR (user_id=s.user_id AND other_user_id=auth.uid())) THEN RAISE EXCEPTION 'This reviewer is unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM ct_validation_sessions WHERE status IN ('booked','invited') AND (founder_id IN (auth.uid(),s.user_id) OR reviewer_id IN (auth.uid(),s.user_id)) AND starts_at<s.starts_at+interval '25 minutes' AND starts_at+interval '25 minutes'>s.starts_at) THEN RAISE EXCEPTION 'A participant already has a session at this time'; END IF;
 IF NOT EXISTS(SELECT 1 FROM ct_validation_google_accounts WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Connect Google Calendar before booking'; END IF;
 INSERT INTO ct_validation_sessions(founder_id,reviewer_id,product_id,context_id,slot_id,starts_at) VALUES(auth.uid(),s.user_id,p_product,p_context,s.id,s.starts_at) RETURNING id INTO result;
 UPDATE ct_reviewer_slots SET booked=true WHERE id=s.id;
 INSERT INTO ct_validation_events(session_id,event) VALUES(result,'booked'); RETURN result;
END $$;

CREATE FUNCTION public.ct_grant_validation_reward(p_session uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s ct_validation_sessions; eligible boolean; reason text; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('ct-validation-pilot',0));
 SELECT * INTO s FROM ct_validation_sessions WHERE id=p_session FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
 IF EXISTS(SELECT 1 FROM ct_validation_rewards WHERE session_id=s.id) THEN RETURN 'granted'; END IF;
 IF s.reviewer_id IS NULL THEN UPDATE ct_validation_sessions SET reward_status='ineligible' WHERE id=s.id; RETURN 'ineligible'; END IF;
 IF s.status='cancelled' OR s.attendance_status<>'verified' OR s.overlap_seconds<900 OR s.feedback IS NULL OR s.pre_feedback IS NULL OR s.feedback_at IS NULL OR s.feedback_at+interval '24 hours'>now() THEN RETURN 'pending'; END IF;
 IF s.reward_status='review' OR s.review_reason IS NOT NULL THEN RETURN 'review'; END IF;
 SELECT email_confirmed_at IS NOT NULL AND created_at<=s.starts_at-interval '7 days' INTO eligible FROM auth.users WHERE id=s.reviewer_id;
 IF NOT coalesce(eligible,false) THEN reason:='Reviewer account must have verified email and be seven days old at the session';
 ELSIF (SELECT count(*) FROM ct_validation_rewards)>=100 THEN reason:='The 100-session pilot credit limit has been reached';
 ELSIF (SELECT count(*) FROM ct_validation_rewards r JOIN ct_validation_sessions v ON v.id=r.session_id WHERE r.reviewer_id=s.reviewer_id AND date_trunc('week',v.starts_at AT TIME ZONE 'UTC')=date_trunc('week',s.starts_at AT TIME ZONE 'UTC'))>=2 THEN reason:='Weekly reward limit reached';
 ELSIF (SELECT count(*) FROM ct_validation_rewards r JOIN ct_validation_sessions v ON v.id=r.session_id WHERE r.reviewer_id=s.reviewer_id AND date_trunc('month',v.starts_at AT TIME ZONE 'UTC')=date_trunc('month',s.starts_at AT TIME ZONE 'UTC'))>=4 THEN reason:='Monthly reward limit reached';
 ELSIF EXISTS(SELECT 1 FROM ct_validation_rewards r JOIN ct_validation_sessions v ON v.id=r.session_id WHERE ((r.reviewer_id=s.reviewer_id AND r.founder_id=s.founder_id) OR (r.reviewer_id=s.founder_id AND r.founder_id=s.reviewer_id)) AND abs(extract(epoch FROM v.starts_at-s.starts_at))<30*86400) THEN reason:='This pairing already received a reward in the last 30 days';
 ELSIF EXISTS(SELECT 1 FROM ct_validation_rewards r JOIN ct_validation_sessions v ON v.id=r.session_id WHERE (r.reviewer_id=s.reviewer_id OR r.founder_id=s.reviewer_id) AND v.starts_at<s.starts_at+interval '25 minutes' AND v.starts_at+interval '25 minutes'>s.starts_at) THEN reason:='Overlapping rewarded session';
 END IF;
 IF reason IS NOT NULL THEN UPDATE ct_validation_sessions SET reward_status='ineligible',review_reason=reason WHERE id=s.id; RETURN 'ineligible'; END IF;
 IF s.attendance_evidence->>'reviewedBy' IS NULL AND (EXISTS(SELECT 1 FROM ct_validation_sessions v WHERE v.id<>s.id AND v.reviewer_id=s.reviewer_id AND v.feedback=s.feedback)
 OR EXISTS(SELECT 1 FROM ct_validation_sessions v WHERE v.id<>s.id AND v.reviewer_id=s.founder_id AND v.founder_id=s.reviewer_id AND v.starts_at>now()-interval '60 days')
 OR EXISTS(SELECT 1 FROM ct_reviewer_exclusions WHERE (user_id=s.founder_id AND other_user_id=s.reviewer_id) OR (user_id=s.reviewer_id AND other_user_id=s.founder_id))) THEN
  UPDATE ct_validation_sessions SET reward_status='review',review_reason='Duplicate feedback, reciprocal sessions or declared relationship requires review' WHERE id=s.id; RETURN 'review';
 END IF;
 INSERT INTO ct_validation_rewards(session_id,reviewer_id,founder_id) VALUES(s.id,s.reviewer_id,s.founder_id);
 UPDATE user_credits SET balance=balance+20,updated_at=now() WHERE user_id=s.reviewer_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reviewer wallet not found'; END IF;
 INSERT INTO credit_transactions(user_id,amount,tx_type,reason,feature,metadata) VALUES(s.reviewer_id,20,'grant','Completed validation feedback','PMF validation',jsonb_build_object('sessionId',s.id,'idempotencyKey','validation:'||s.id));
 UPDATE ct_validation_sessions SET reward_status='granted' WHERE id=s.id;
 INSERT INTO ct_validation_events(session_id,event,detail) VALUES(s.id,'reward_granted','{"credits":20}'); RETURN 'granted';
END $$;
REVOKE ALL ON FUNCTION public.ct_find_reviewers(text,text,text,text[],timestamptz,timestamptz),public.ct_offer_reviewer_slot(timestamptz),public.ct_book_validation(uuid,uuid,uuid),public.ct_grant_validation_reward(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ct_find_reviewers(text,text,text,text[],timestamptz,timestamptz),public.ct_offer_reviewer_slot(timestamptz),public.ct_book_validation(uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ct_grant_validation_reward(uuid) TO service_role;
$ct_source$;
      EXIT;
    EXCEPTION WHEN deadlock_detected OR lock_not_available THEN
      GET STACKED DIAGNOSTICS failed_context = PG_EXCEPTION_CONTEXT,
                              failed_detail = PG_EXCEPTION_DETAIL;
      IF attempt = 3 THEN
        RAISE EXCEPTION USING ERRCODE=SQLSTATE,
          MESSAGE='Step 9/11 could not obtain database locks: ' || SQLERRM,
          DETAIL=coalesce(failed_detail, '') || E'\nFailing SQL context:\n' || coalesce(failed_context, ''),
          HINT='Earlier completed steps are saved. Run docs/product/ct-core-tools-lock-diagnostics.sql and share the results before retrying. Do not proceed to the next step.';
      END IF;
      PERFORM pg_sleep(0.25 * attempt);
    END;
  END LOOP;
  INSERT INTO private.ct_core_tools_sql_runs(version,source_checksum) VALUES('20260930165000','9ecf3842fb97d2b778cf3fe0a40d80c2fc727af84bc09db34cd1216930717193');
END;
$ct_install$;

COMMIT;
SELECT '9/11' AS step, '20260930165000_validation_sessions' AS migration, 'Completed' AS status
FROM private.ct_core_tools_sql_runs WHERE version='20260930165000' AND source_checksum='9ecf3842fb97d2b778cf3fe0a40d80c2fc727af84bc09db34cd1216930717193';

-- CT core tools: step 10 of 11, 20260930165100_validation_session_actions.sql
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
  SELECT source_checksum INTO recorded_checksum FROM private.ct_core_tools_sql_runs WHERE version='20260930165100';
  IF FOUND THEN
    IF recorded_checksum <> '60456ee8f4fe4cd820fdea6abdc1900224e8706ba8bc95b78eb370295f85a0c2' THEN
      RAISE EXCEPTION 'Step 10 was applied from different SQL. Review the difference before changing an applied migration.';
    END IF;
    RAISE NOTICE 'Step 10/11 already completed; skipped.';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.ct_core_tools_sql_runs WHERE version='20260930165000') THEN
    RAISE EXCEPTION 'Run step 9 successfully before step 10.';
  END IF;

  -- Each failed attempt is a subtransaction: its DDL and locks are rolled back
  -- before retrying. Never disable RLS, event triggers or other sessions.
  FOR attempt IN 1..3 LOOP
    BEGIN

      EXECUTE $ct_source$
ALTER TABLE ct_validation_sessions ADD COLUMN offered_slots jsonb NOT NULL DEFAULT '[]';
CREATE FUNCTION public.ct_change_validation_session(p_session uuid,p_actor uuid,p_action text,p_start timestamptz DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s ct_validation_sessions; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('ct-validation-pilot',0));
 SELECT * INTO s FROM ct_validation_sessions WHERE id=p_session AND (founder_id=p_actor OR reviewer_id=p_actor) FOR UPDATE;
 IF NOT FOUND OR s.status NOT IN ('invited','booked') OR s.starts_at<now() THEN RAISE EXCEPTION 'Only an upcoming booking can be changed'; END IF;
 IF p_action='cancel' THEN
  UPDATE ct_validation_sessions SET status='cancelled',calendar_state='pending',reward_status='ineligible',guest_token_hash=NULL WHERE id=s.id;
  UPDATE ct_reviewer_slots SET booked=false WHERE id=s.slot_id;
 ELSIF p_action='reschedule' THEN
  IF p_start<now()+interval '1 hour' OR p_start>now()+interval '90 days' THEN RAISE EXCEPTION 'Choose a future time within 90 days'; END IF;
  IF s.reviewer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ct_reviewer_slots WHERE user_id=s.reviewer_id AND starts_at=p_start AND NOT booked) THEN RAISE EXCEPTION 'Choose an available reviewer slot'; END IF;
  IF EXISTS(SELECT 1 FROM ct_validation_sessions v WHERE v.id<>s.id AND v.status IN ('booked','invited') AND (v.founder_id IN (s.founder_id,s.reviewer_id) OR v.reviewer_id IN (s.founder_id,s.reviewer_id)) AND v.starts_at<p_start+interval '25 minutes' AND v.starts_at+interval '25 minutes'>p_start) THEN RAISE EXCEPTION 'This time overlaps another booking'; END IF;
  UPDATE ct_reviewer_slots SET booked=false WHERE id=s.slot_id;
  UPDATE ct_validation_sessions SET starts_at=p_start,slot_id=(SELECT id FROM ct_reviewer_slots WHERE user_id=s.reviewer_id AND starts_at=p_start),calendar_state='pending' WHERE id=s.id;
  UPDATE ct_reviewer_slots SET booked=true WHERE user_id=s.reviewer_id AND starts_at=p_start;
 ELSE RAISE EXCEPTION 'Unknown booking action'; END IF;
 INSERT INTO ct_validation_events(session_id,event,detail) VALUES(s.id,p_action,jsonb_build_object('previousTime',s.starts_at,'newTime',p_start));
END $$;

CREATE FUNCTION public.ct_submit_validation_feedback(p_session uuid,p_feedback jsonb,p_before boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s ct_validation_sessions; e_id uuid; participant text; BEGIN
 SELECT * INTO s FROM ct_validation_sessions WHERE id=p_session FOR UPDATE;
 IF NOT FOUND OR s.status NOT IN ('booked','completed','review') THEN RAISE EXCEPTION 'Session is not accepting feedback'; END IF;
 IF p_before THEN
  IF now()>s.starts_at+interval '5 minutes' THEN RAISE EXCEPTION 'Pre-pitch questions close five minutes after the session starts'; END IF;
  IF s.pre_feedback IS NOT NULL THEN RAISE EXCEPTION 'Pre-pitch answers have already been recorded'; END IF;
  UPDATE ct_validation_sessions SET pre_feedback=p_feedback WHERE id=s.id;
 ELSE
  IF now()<s.starts_at+interval '15 minutes' OR s.pre_feedback IS NULL THEN RAISE EXCEPTION 'Record the pre-pitch answers first and finish the session before feedback'; END IF;
  IF s.feedback IS NOT NULL THEN RAISE EXCEPTION 'Feedback has already been submitted'; END IF;
  participant:=encode(sha256(convert_to(lower(trim(coalesce(s.guest_email,(SELECT email FROM auth.users WHERE id=s.reviewer_id)))),'UTF8')),'hex');
  INSERT INTO ct_evidence(user_id,product_id,source_key,kind,participant_key,segment,incentivized,product_usage,provenance,captured_at,original,summary)
   VALUES(s.founder_id,s.product_id,'validation:'||s.id,'session',participant,'',s.reviewer_id IS NOT NULL,'concept_only','platform',now(),jsonb_build_object('beforePitch',s.pre_feedback,'afterPitch',p_feedback),jsonb_build_object('source','validation_session','respondent',coalesce(s.guest_name,(SELECT display_name FROM ct_reviewer_profiles WHERE user_id=s.reviewer_id),'Reviewer'),'feedback',concat_ws(E'\n',s.pre_feedback->>'recentBehavior',s.pre_feedback->>'currentWorkaround',p_feedback->>'clarity',p_feedback->>'willingnessToTry',p_feedback->>'willingnessToPay',p_feedback->>'suggestedChange'),'objections',p_feedback->>'objections')) RETURNING id INTO e_id;
  UPDATE ct_validation_sessions SET feedback=p_feedback,feedback_at=now(),reward_status=CASE WHEN reviewer_id IS NULL THEN 'ineligible' ELSE 'held' END,reward_eligible_at=now()+interval '24 hours',evidence_id=e_id WHERE id=s.id;
 END IF;
 INSERT INTO ct_validation_events(session_id,event) VALUES(s.id,CASE WHEN p_before THEN 'pre_feedback_recorded' ELSE 'feedback_recorded' END);
END $$;
REVOKE ALL ON FUNCTION public.ct_change_validation_session(uuid,uuid,text,timestamptz),public.ct_submit_validation_feedback(uuid,jsonb,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ct_change_validation_session(uuid,uuid,text,timestamptz),public.ct_submit_validation_feedback(uuid,jsonb,boolean) TO service_role;

CREATE FUNCTION public.ct_book_validation_guest(p_session uuid,p_start timestamptz,p_name text,p_email text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s ct_validation_sessions; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('ct-validation-pilot',0));
 SELECT * INTO s FROM ct_validation_sessions WHERE id=p_session AND status='invited' FOR UPDATE;
 IF NOT FOUND OR p_start<now() OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(s.offered_slots) t WHERE t::timestamptz=p_start) THEN RAISE EXCEPTION 'Choose an available invitation time'; END IF;
 IF EXISTS(SELECT 1 FROM ct_validation_sessions v WHERE v.id<>s.id AND v.status='booked' AND (v.founder_id=s.founder_id OR v.reviewer_id=s.founder_id OR lower(v.guest_email)=lower(p_email)) AND v.starts_at<p_start+interval '25 minutes' AND v.starts_at+interval '25 minutes'>p_start) THEN RAISE EXCEPTION 'This time is no longer available'; END IF;
 UPDATE ct_validation_sessions SET starts_at=p_start,guest_name=p_name,guest_email=p_email,status='booked',reward_status='ineligible' WHERE id=s.id;
 INSERT INTO ct_validation_events(session_id,event) VALUES(s.id,'guest_booked');
END $$;
REVOKE ALL ON FUNCTION public.ct_book_validation_guest(uuid,timestamptz,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ct_book_validation_guest(uuid,timestamptz,text,text) TO service_role;
$ct_source$;
      EXIT;
    EXCEPTION WHEN deadlock_detected OR lock_not_available THEN
      GET STACKED DIAGNOSTICS failed_context = PG_EXCEPTION_CONTEXT,
                              failed_detail = PG_EXCEPTION_DETAIL;
      IF attempt = 3 THEN
        RAISE EXCEPTION USING ERRCODE=SQLSTATE,
          MESSAGE='Step 10/11 could not obtain database locks: ' || SQLERRM,
          DETAIL=coalesce(failed_detail, '') || E'\nFailing SQL context:\n' || coalesce(failed_context, ''),
          HINT='Earlier completed steps are saved. Run docs/product/ct-core-tools-lock-diagnostics.sql and share the results before retrying. Do not proceed to the next step.';
      END IF;
      PERFORM pg_sleep(0.25 * attempt);
    END;
  END LOOP;
  INSERT INTO private.ct_core_tools_sql_runs(version,source_checksum) VALUES('20260930165100','60456ee8f4fe4cd820fdea6abdc1900224e8706ba8bc95b78eb370295f85a0c2');
END;
$ct_install$;

COMMIT;
SELECT '10/11' AS step, '20260930165100_validation_session_actions' AS migration, 'Completed' AS status
FROM private.ct_core_tools_sql_runs WHERE version='20260930165100' AND source_checksum='60456ee8f4fe4cd820fdea6abdc1900224e8706ba8bc95b78eb370295f85a0c2';

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

SELECT count(*) AS completed_steps, 11 AS expected_steps
FROM private.ct_core_tools_sql_runs WHERE version IN ('20260930160000','20260930161000','20260930161100','20260930161200','20260930162000','20260930162500','20260930163000','20260930164000','20260930165000','20260930165100','20260930170000');
