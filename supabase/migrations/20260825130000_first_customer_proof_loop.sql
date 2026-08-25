-- First Customer Proof: the paid Stage V execution loop.
-- The historical first_customer_sprints table remains the canonical execution
-- record. This migration removes the former concierge/pilot completion rules
-- and attributes the finished cycle to the GTM Strategist outcome contract.

ALTER TABLE public.first_customer_sprints
  ADD COLUMN IF NOT EXISTS gtm_plan_id uuid REFERENCES public.gtm_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gtm_play_id text;

CREATE INDEX IF NOT EXISTS first_customer_sprints_gtm_plan_idx
  ON public.first_customer_sprints(gtm_plan_id, created_at DESC)
  WHERE gtm_plan_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.first_customer_proof_has_access_v1(p_founder_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_founder_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles profile
      WHERE profile.id = p_founder_id
        AND public.normalize_subscription_tier(profile.subscription_tier) IN ('rising', 'pro')
    );
$$;

-- `enrolled` only controls the legacy snapshot UI. Plan access is still
-- enforced by the start RPC below, so a preview never becomes executable.
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
  IF NOT public.first_customer_proof_has_access_v1(v_founder) THEN
    RAISE EXCEPTION 'First Customer Proof is available on Rising and Pro' USING ERRCODE = '42501';
  END IF;
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
    RAISE EXCEPTION 'Complete the required First Customer Proof intake fields';
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

CREATE OR REPLACE FUNCTION public.link_first_customer_proof_to_gtm_v1(
  p_sprint_id uuid,
  p_gtm_plan_id uuid,
  p_gtm_play_id text DEFAULT NULL
)
RETURNS public.first_customer_sprints
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_sprint public.first_customer_sprints%ROWTYPE;
BEGIN
  SELECT * INTO v_sprint FROM public.first_customer_sprints
  WHERE id = p_sprint_id AND founder_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'First Customer Proof cycle not found' USING ERRCODE = '42501'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.gtm_plans WHERE id = p_gtm_plan_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'GTM plan not found' USING ERRCODE = '42501';
  END IF;

  UPDATE public.first_customer_sprints
  SET gtm_plan_id = p_gtm_plan_id,
      gtm_play_id = NULLIF(trim(COALESCE(p_gtm_play_id, '')), ''),
      updated_at = now()
  WHERE id = p_sprint_id
  RETURNING * INTO v_sprint;
  RETURN v_sprint;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_first_customer_sprint_snapshot_v1(p_sprint_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_founder uuid := auth.uid();
  v_sprint public.first_customer_sprints%ROWTYPE;
  v_attached integer := 0; v_sent integer := 0; v_replies integer := 0;
  v_conversations integer := 0; v_commitments integer := 0; v_payments integer := 0;
  v_can_complete boolean := false; v_step text := 'intake';
BEGIN
  IF v_founder IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_sprint FROM public.first_customer_sprints
    WHERE founder_id=v_founder AND (p_sprint_id IS NULL OR id=p_sprint_id)
    ORDER BY CASE WHEN status IN ('draft','active','paused') THEN 0 ELSE 1 END, created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'version',1,'enrolled',true,'sprint',NULL,'contacts','[]'::jsonb,'availableContacts','[]'::jsonb,
      'cycleDefaults',COALESCE((SELECT jsonb_build_object(
        'businessModel',business_model,'customerCount',customer_count,'weeklyCapacityHours',weekly_capacity_hours,'primaryGoal',primary_goal
      ) FROM public.founder_cycle_state WHERE user_id=v_founder),'{}'::jsonb)
    );
  END IF;

  SELECT count(*) INTO v_attached FROM public.first_customer_sprint_contacts WHERE sprint_id=v_sprint.id;
  SELECT
    count(*) FILTER (WHERE event_type='outreach_sent'),
    count(*) FILTER (WHERE event_type='reply_received'),
    count(*) FILTER (WHERE event_type='interview_completed'),
    count(*) FILTER (WHERE event_type='commitment_received'),
    count(*) FILTER (WHERE event_type='payment_received')
  INTO v_sent,v_replies,v_conversations,v_commitments,v_payments
  FROM public.customer_evidence_events evidence
  WHERE evidence.user_id=v_founder AND evidence.metadata->>'sprintId'=v_sprint.id::text
    AND EXISTS (
      SELECT 1 FROM public.first_customer_sprint_contacts scoped
      WHERE scoped.sprint_id=v_sprint.id AND scoped.contact_id=evidence.contact_id
    );

  v_can_complete := v_attached >= 10 AND v_sent >= 10 AND (
    v_replies > 0 OR v_conversations > 0 OR v_commitments > 0 OR v_payments > 0
    OR (v_sprint.final_decision IS NOT NULL AND length(trim(COALESCE(v_sprint.final_notes,''))) >= 3)
  );
  v_step := CASE
    WHEN v_sprint.status='completed' THEN 'completed'
    WHEN now()>v_sprint.ends_at THEN 'awaiting_final_review'
    WHEN v_attached<10 THEN 'target_list'
    WHEN v_sprint.selected_message_variant IS NULL THEN 'message_preparation'
    WHEN v_sent<10 THEN 'execution'
    WHEN NOT v_can_complete THEN 'review'
    ELSE 'complete'
  END;

  RETURN jsonb_build_object(
    'version',1,'enrolled',true,'generatedAt',now(),'sprint',to_jsonb(v_sprint),
    'contacts',COALESCE((SELECT jsonb_agg(to_jsonb(c) || jsonb_build_object('message_variant_key',sc.selected_message_variant) ORDER BY sc.created_at)
      FROM public.first_customer_sprint_contacts sc JOIN public.founder_customer_contacts c ON c.id=sc.contact_id WHERE sc.sprint_id=v_sprint.id),'[]'::jsonb),
    'availableContacts',COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.last_activity_at DESC)
      FROM public.founder_customer_contacts c WHERE c.user_id=v_founder
      AND NOT EXISTS (SELECT 1 FROM public.first_customer_sprint_contacts sc WHERE sc.sprint_id=v_sprint.id AND sc.contact_id=c.id)),'[]'::jsonb),
    'evidence',jsonb_build_object('attachedProspects',v_attached,'contactedProspects',v_sent,'replies',v_replies,'conversations',v_conversations,'commitments',v_commitments,'payments',v_payments),
    'targets',jsonb_build_object('prospects',10,'outreach',10,'conversations',1,'mentorCheckpoints',0),
    'linkedCall',NULL,'derivedStep',v_step,'awaitingFinalReview',(now()>v_sprint.ends_at AND v_sprint.status<>'completed'),'canComplete',v_can_complete,
    'cycleDefaults',COALESCE((SELECT jsonb_build_object(
      'businessModel',business_model,'customerCount',customer_count,'weeklyCapacityHours',weekly_capacity_hours,'primaryGoal',primary_goal
    ) FROM public.founder_cycle_state WHERE user_id=v_founder),'{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_first_customer_proof_outcome_v1(p_sprint_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sprint public.first_customer_sprints%ROWTYPE;
  v_attached integer := 0; v_sent integer := 0; v_replies integer := 0;
  v_conversations integer := 0; v_commitments integer := 0; v_payments integer := 0;
  v_has_signal boolean := false;
BEGIN
  SELECT * INTO v_sprint FROM public.first_customer_sprints WHERE id=p_sprint_id;
  IF NOT FOUND OR v_sprint.status <> 'completed' THEN RETURN; END IF;
  SELECT count(*) INTO v_attached FROM public.first_customer_sprint_contacts WHERE sprint_id=v_sprint.id;
  SELECT
    count(*) FILTER (WHERE event_type='outreach_sent'), count(*) FILTER (WHERE event_type='reply_received'),
    count(*) FILTER (WHERE event_type='interview_completed'), count(*) FILTER (WHERE event_type='commitment_received'),
    count(*) FILTER (WHERE event_type='payment_received')
  INTO v_sent,v_replies,v_conversations,v_commitments,v_payments
  FROM public.customer_evidence_events evidence
  WHERE evidence.user_id=v_sprint.founder_id AND evidence.metadata->>'sprintId'=v_sprint.id::text
    AND EXISTS (SELECT 1 FROM public.first_customer_sprint_contacts scoped WHERE scoped.sprint_id=v_sprint.id AND scoped.contact_id=evidence.contact_id);
  IF v_attached < 10 OR v_sent < 10 THEN RETURN; END IF;
  v_has_signal := v_replies > 0 OR v_conversations > 0 OR v_commitments > 0 OR v_payments > 0;

  INSERT INTO public.journey_outcomes (
    user_id, tool, stage, artifact_type, artifact_id, status, completed_at,
    quality_checks, evidence_manifest, verification_mode, evaluation_version
  ) VALUES (
    v_sprint.founder_id, 'gtm_strategist', 'launch', 'first_customer_proof', v_sprint.id::text,
    CASE WHEN v_has_signal THEN 'verified' ELSE 'ready' END,
    COALESCE(v_sprint.completed_at, v_sprint.updated_at, now()),
    jsonb_build_object('prospectsReached',v_attached >= 10,'messagesReached',v_sent >= 10,'buyerProofEarned',v_has_signal,'cycleDecision',v_sprint.final_decision),
    jsonb_build_object('version',1,'sources',jsonb_build_array(jsonb_build_object('type','first_customer_proof','id',v_sprint.id)),'counts',jsonb_build_object('prospects',v_attached,'messages',v_sent,'replies',v_replies,'conversations',v_conversations,'commitments',v_commitments,'payments',v_payments)),
    'founder_reported','2'
  ) ON CONFLICT (user_id, tool, artifact_type, artifact_id) DO UPDATE SET
    status=EXCLUDED.status, completed_at=EXCLUDED.completed_at, quality_checks=EXCLUDED.quality_checks,
    evidence_manifest=EXCLUDED.evidence_manifest, verification_mode=EXCLUDED.verification_mode,
    evaluation_version=EXCLUDED.evaluation_version, updated_at=now();
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_first_customer_proof_outcome_trigger_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_first_customer_proof_outcome_v1(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_first_customer_sprint_outcome ON public.first_customer_sprints;
CREATE TRIGGER sync_first_customer_sprint_outcome
AFTER INSERT OR UPDATE OF status, final_decision, final_notes ON public.first_customer_sprints
FOR EACH ROW EXECUTE FUNCTION public.sync_first_customer_proof_outcome_trigger_v1();

CREATE OR REPLACE FUNCTION public.complete_first_customer_sprint_v1(
  p_sprint_id uuid,
  p_final_decision text,
  p_final_notes text DEFAULT NULL
)
RETURNS public.first_customer_sprints
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sprint public.first_customer_sprints%ROWTYPE;
  v_attached integer; v_sent integer; v_replies integer; v_conversations integer; v_commitments integer; v_payments integer;
  v_has_signal boolean;
BEGIN
  SELECT * INTO v_sprint FROM public.first_customer_sprints WHERE id=p_sprint_id AND founder_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'First Customer Proof cycle not found' USING ERRCODE='42501'; END IF;
  IF p_final_decision NOT IN ('continue','narrow_segment','change_offer','change_message','change_channel','pivot','pause') THEN
    RAISE EXCEPTION 'Select a valid founder decision';
  END IF;
  SELECT count(*) INTO v_attached FROM public.first_customer_sprint_contacts WHERE sprint_id=p_sprint_id;
  SELECT
    count(*) FILTER (WHERE event_type='outreach_sent'), count(*) FILTER (WHERE event_type='reply_received'),
    count(*) FILTER (WHERE event_type='interview_completed'), count(*) FILTER (WHERE event_type='commitment_received'), count(*) FILTER (WHERE event_type='payment_received')
  INTO v_sent,v_replies,v_conversations,v_commitments,v_payments
  FROM public.customer_evidence_events evidence
  WHERE evidence.user_id=auth.uid() AND evidence.metadata->>'sprintId'=p_sprint_id::text
    AND EXISTS (SELECT 1 FROM public.first_customer_sprint_contacts scoped WHERE scoped.sprint_id=p_sprint_id AND scoped.contact_id=evidence.contact_id);
  IF v_attached < 10 OR v_sent < 10 THEN RAISE EXCEPTION 'Attach 10 qualified prospects and record 10 founder-sent messages first'; END IF;
  v_has_signal := v_replies > 0 OR v_conversations > 0 OR v_commitments > 0 OR v_payments > 0;
  IF NOT v_has_signal AND length(trim(COALESCE(p_final_notes,''))) < 3 THEN
    RAISE EXCEPTION 'Record the evidence-backed decision before completing a no-signal cycle';
  END IF;
  UPDATE public.first_customer_sprints SET status='completed', final_decision=p_final_decision,
    final_notes=NULLIF(trim(COALESCE(p_final_notes,'')),''), completed_at=now(), updated_at=now()
  WHERE id=p_sprint_id RETURNING * INTO v_sprint;
  RETURN v_sprint;
END;
$$;

-- Backfill only cycles that already meet the paid evidence threshold. Drafts and
-- incomplete historical attempts remain untouched.
SELECT public.sync_first_customer_proof_outcome_v1(id)
FROM public.first_customer_sprints
WHERE status='completed';

REVOKE ALL ON FUNCTION public.first_customer_proof_has_access_v1(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.link_first_customer_proof_to_gtm_v1(uuid,uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sync_first_customer_proof_outcome_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.first_customer_proof_has_access_v1(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_first_customer_proof_to_gtm_v1(uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_first_customer_sprint_v1(uuid,text,text) TO authenticated;
