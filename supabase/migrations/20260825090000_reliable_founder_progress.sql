-- Reliable seven-stage founder progress.
-- Fundraising remains an optional overlay; this migration only adds the missing
-- Stage V evidence contract and removes the obsolete pilot enrollment gate.

CREATE OR REPLACE FUNCTION public.first_customer_sprint_is_enrolled_v1(p_founder_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT p_founder_id IS NOT NULL; $$;

CREATE OR REPLACE FUNCTION public.start_first_customer_sprint_v1(
  p_offer text,
  p_target_segment text,
  p_problem_hypothesis text,
  p_proof_url text DEFAULT NULL,
  p_proof_description text DEFAULT NULL,
  p_estimated_customer_value_usd numeric DEFAULT NULL,
  p_weekly_capacity_hours numeric DEFAULT NULL,
  p_mentor_decision_question text DEFAULT NULL,
  p_icp_analysis_id uuid DEFAULT NULL
)
RETURNS public.first_customer_sprints
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_founder uuid := auth.uid();
  v_sprint public.first_customer_sprints%ROWTYPE;
  v_variants jsonb;
  v_icp uuid;
BEGIN
  IF v_founder IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_sprint FROM public.first_customer_sprints
    WHERE founder_id = v_founder AND status IN ('draft', 'active', 'paused')
    ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN RETURN v_sprint; END IF;
  IF length(trim(COALESCE(p_offer, ''))) < 3
    OR length(trim(COALESCE(p_target_segment, ''))) < 3
    OR length(trim(COALESCE(p_problem_hypothesis, ''))) < 3
    OR (length(trim(COALESCE(p_proof_url, ''))) = 0 AND length(trim(COALESCE(p_proof_description, ''))) < 3)
    OR COALESCE(p_estimated_customer_value_usd, 0) <= 0
    OR COALESCE(p_weekly_capacity_hours, 0) < 2 THEN
    RAISE EXCEPTION 'Complete the required sprint intake fields';
  END IF;
  SELECT id INTO v_icp FROM public.icp_analysis_results WHERE id = p_icp_analysis_id AND user_id = v_founder;
  v_variants := jsonb_build_array(
    jsonb_build_object('key','discovery','label','Discovery-led','body','Hi {{first_name}}, I am researching how ' || trim(p_target_segment) || ' handle ' || trim(p_problem_hypothesis) || '. Would you be open to a 20-minute conversation? I am looking to learn, not pitch.'),
    jsonb_build_object('key','problem','label','Problem-led','body','Hi {{first_name}}, I help ' || trim(p_target_segment) || ' address ' || trim(p_problem_hypothesis) || '. Is this a priority for you right now? I would value 20 minutes to compare notes.'),
    jsonb_build_object('key','offer','label','Offer-led','body','Hi {{first_name}}, I am testing ' || trim(p_offer) || ' for ' || trim(p_target_segment) || '. Would a short conversation be useful to see whether it fits how you work today?')
  );
  INSERT INTO public.first_customer_sprints (
    founder_id, status, starts_at, ends_at, business_model_snapshot, customer_count_snapshot, primary_goal_snapshot,
    offer, target_segment, problem_hypothesis, proof_url, proof_description, estimated_customer_value_usd,
    weekly_capacity_hours, mentor_decision_question, message_variants, message_generation_count, icp_analysis_id
  ) VALUES (
    v_founder, 'active', now(), now() + interval '30 days',
    (SELECT business_model FROM public.founder_cycle_state WHERE user_id=v_founder),
    COALESCE((SELECT customer_count FROM public.founder_cycle_state WHERE user_id=v_founder), 0),
    (SELECT primary_goal FROM public.founder_cycle_state WHERE user_id=v_founder),
    trim(p_offer), trim(p_target_segment), trim(p_problem_hypothesis),
    NULLIF(trim(COALESCE(p_proof_url,'')),''), NULLIF(trim(COALESCE(p_proof_description,'')),''),
    p_estimated_customer_value_usd, p_weekly_capacity_hours, NULLIF(trim(COALESCE(p_mentor_decision_question,'')),''),
    v_variants, 0, v_icp
  ) RETURNING * INTO v_sprint;
  RETURN v_sprint;
EXCEPTION WHEN unique_violation THEN
  SELECT * INTO v_sprint FROM public.first_customer_sprints
    WHERE founder_id=v_founder AND status IN ('draft','active','paused') ORDER BY created_at DESC LIMIT 1;
  RETURN v_sprint;
END;
$$;

ALTER TABLE public.journey_outcomes DROP CONSTRAINT IF EXISTS journey_outcomes_tool_check;
ALTER TABLE public.journey_outcomes ADD CONSTRAINT journey_outcomes_tool_check CHECK (tool IN (
  'icp_builder', 'demo_studio', 'pmf_lab', 'mvp_builder', 'gtm_strategist', 'first_customer_sprint', 'traction_engine'
));

ALTER TABLE public.journey_handoffs DROP CONSTRAINT IF EXISTS journey_handoffs_destination_tool_check;
ALTER TABLE public.journey_handoffs ADD CONSTRAINT journey_handoffs_destination_tool_check CHECK (destination_tool IN (
  'icp_builder', 'demo_studio', 'pmf_lab', 'mvp_builder', 'gtm_strategist', 'first_customer_sprint', 'traction_engine'
));

CREATE OR REPLACE FUNCTION public.sync_first_customer_sprint_outcome_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  INSERT INTO public.journey_outcomes (
    user_id, tool, stage, artifact_type, artifact_id, status, completed_at,
    quality_checks, evidence_manifest, verification_mode, evaluation_version
  ) VALUES (
    NEW.founder_id, 'first_customer_sprint', 'launch', 'first_customer_sprint', NEW.id::text, 'ready',
    COALESCE(NEW.completed_at, NEW.updated_at, now()),
    jsonb_build_object('decision', NEW.final_decision, 'completedCycle', true),
    jsonb_build_object('version', 1, 'sources', jsonb_build_array(jsonb_build_object('type','first_customer_sprint','id',NEW.id))),
    'founder_reported', '1'
  ) ON CONFLICT (user_id, tool, artifact_type, artifact_id) DO UPDATE SET
    status='ready', completed_at=COALESCE(EXCLUDED.completed_at, journey_outcomes.completed_at),
    quality_checks=EXCLUDED.quality_checks, evidence_manifest=EXCLUDED.evidence_manifest,
    verification_mode='founder_reported', updated_at=now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_first_customer_sprint_outcome ON public.first_customer_sprints;
CREATE TRIGGER sync_first_customer_sprint_outcome
AFTER INSERT OR UPDATE OF status, final_decision, final_notes ON public.first_customer_sprints
FOR EACH ROW EXECUTE FUNCTION public.sync_first_customer_sprint_outcome_v1();

-- Idempotent legacy backfill: completed cycles become evidence; drafts never do.
INSERT INTO public.journey_outcomes (
  user_id, tool, stage, artifact_type, artifact_id, status, completed_at,
  quality_checks, evidence_manifest, verification_mode, evaluation_version
)
SELECT sprint.founder_id, 'first_customer_sprint', 'launch', 'first_customer_sprint', sprint.id::text, 'ready',
  COALESCE(sprint.completed_at, sprint.updated_at),
  jsonb_build_object('decision', sprint.final_decision, 'completedCycle', true),
  jsonb_build_object('version', 1, 'sources', jsonb_build_array(jsonb_build_object('type','first_customer_sprint','id',sprint.id))),
  'founder_reported', '1'
FROM public.first_customer_sprints sprint
WHERE sprint.status='completed'
ON CONFLICT (user_id, tool, artifact_type, artifact_id) DO NOTHING;

COMMENT ON COLUMN public.user_progress.fundraising_completed_at IS
  'Legacy timestamp retained for compatibility. Fundraising is represented as an optional overlay derived from verified traction.';
