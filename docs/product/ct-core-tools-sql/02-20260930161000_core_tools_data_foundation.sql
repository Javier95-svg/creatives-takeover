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
