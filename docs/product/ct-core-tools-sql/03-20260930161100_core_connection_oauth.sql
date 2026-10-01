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
