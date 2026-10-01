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
