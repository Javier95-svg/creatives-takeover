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
