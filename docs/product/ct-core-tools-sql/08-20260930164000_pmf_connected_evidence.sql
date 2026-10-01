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
