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
