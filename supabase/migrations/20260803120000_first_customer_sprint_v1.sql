-- First Customer Sprint V1: invite-only, founder-operated 30-day execution sprint.

CREATE TABLE IF NOT EXISTS public.first_customer_sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  business_model_snapshot text,
  customer_count_snapshot integer NOT NULL DEFAULT 0 CHECK (customer_count_snapshot >= 0),
  primary_goal_snapshot text,
  offer text,
  target_segment text,
  problem_hypothesis text,
  proof_url text,
  proof_description text,
  estimated_customer_value_usd numeric(12,2),
  weekly_capacity_hours numeric(5,1),
  mentor_decision_question text,
  message_variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_message_variant text CHECK (selected_message_variant IS NULL OR selected_message_variant IN ('discovery', 'problem', 'offer')),
  message_generation_count integer NOT NULL DEFAULT 0 CHECK (message_generation_count BETWEEN 0 AND 2),
  mentor_id uuid REFERENCES public.mentors(id) ON DELETE SET NULL,
  discovery_call_id uuid REFERENCES public.discovery_calls(id) ON DELETE SET NULL,
  mentor_brief_version integer NOT NULL DEFAULT 1,
  mentor_brief_snapshot jsonb,
  mentor_checkpoint_completed_at timestamptz,
  mentor_recommendation_summary text,
  final_decision text CHECK (final_decision IS NULL OR final_decision IN ('continue', 'narrow_segment', 'change_offer', 'change_message', 'change_channel', 'pivot', 'pause')),
  final_notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT first_customer_sprint_dates CHECK (ends_at = starts_at + interval '30 days'),
  CONSTRAINT first_customer_sprint_text_limits CHECK (
    char_length(COALESCE(offer,'')) <= 1000
    AND char_length(COALESCE(target_segment,'')) <= 1000
    AND char_length(COALESCE(problem_hypothesis,'')) <= 2000
    AND char_length(COALESCE(proof_url,'')) <= 2000
    AND char_length(COALESCE(proof_description,'')) <= 3000
    AND char_length(COALESCE(mentor_decision_question,'')) <= 2000
    AND char_length(COALESCE(mentor_recommendation_summary,'')) <= 4000
    AND char_length(COALESCE(final_notes,'')) <= 4000
    AND octet_length(message_variants::text) <= 12000
    AND octet_length(COALESCE(mentor_brief_snapshot,'{}'::jsonb)::text) <= 60000
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS first_customer_sprints_one_open_per_founder
  ON public.first_customer_sprints(founder_id)
  WHERE status IN ('draft', 'active', 'paused');

CREATE INDEX IF NOT EXISTS first_customer_sprints_founder_created
  ON public.first_customer_sprints(founder_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.first_customer_sprint_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid NOT NULL REFERENCES public.first_customer_sprints(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.founder_customer_contacts(id) ON DELETE CASCADE,
  selected_message_variant text CHECK (selected_message_variant IS NULL OR selected_message_variant IN ('discovery', 'problem', 'offer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sprint_id, contact_id)
);

ALTER TABLE public.first_customer_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.first_customer_sprint_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS first_customer_sprints_owner_all ON public.first_customer_sprints;
CREATE POLICY first_customer_sprints_owner_all ON public.first_customer_sprints
  FOR ALL TO authenticated
  USING (founder_id = auth.uid())
  WITH CHECK (founder_id = auth.uid());

DROP POLICY IF EXISTS first_customer_sprints_admin_read ON public.first_customer_sprints;
CREATE POLICY first_customer_sprints_admin_read ON public.first_customer_sprints
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS first_customer_sprint_contacts_owner_all ON public.first_customer_sprint_contacts;
CREATE POLICY first_customer_sprint_contacts_owner_all ON public.first_customer_sprint_contacts
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.first_customer_sprints sprint
    WHERE sprint.id = sprint_id AND sprint.founder_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.first_customer_sprints sprint
    WHERE sprint.id = sprint_id AND sprint.founder_id = auth.uid()
  ));

DROP POLICY IF EXISTS first_customer_sprint_contacts_admin_read ON public.first_customer_sprint_contacts;
CREATE POLICY first_customer_sprint_contacts_admin_read ON public.first_customer_sprint_contacts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.first_customer_sprint_is_enrolled_v1(p_founder_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT state.beta_cohort
    FROM public.founder_cycle_state state
    WHERE state.user_id = p_founder_id
  ), false);
$$;

CREATE OR REPLACE FUNCTION public.start_first_customer_sprint_v1(
  p_offer text,
  p_target_segment text,
  p_problem_hypothesis text,
  p_proof_url text DEFAULT NULL,
  p_proof_description text DEFAULT NULL,
  p_estimated_customer_value_usd numeric DEFAULT NULL,
  p_weekly_capacity_hours numeric DEFAULT NULL,
  p_mentor_decision_question text DEFAULT NULL
)
RETURNS public.first_customer_sprints
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_founder uuid := auth.uid();
  v_state public.founder_cycle_state%ROWTYPE;
  v_sprint public.first_customer_sprints%ROWTYPE;
  v_variants jsonb;
BEGIN
  IF v_founder IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_state FROM public.founder_cycle_state WHERE user_id = v_founder;
  IF NOT FOUND OR NOT COALESCE(v_state.beta_cohort, false) THEN
    RAISE EXCEPTION 'First Customer Sprint is invite-only' USING ERRCODE = '42501';
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
    RAISE EXCEPTION 'Complete the required sprint intake fields';
  END IF;

  v_variants := jsonb_build_array(
    jsonb_build_object('key','discovery','label','Discovery-led','body',
      'Hi {{first_name}}, I am researching how ' || trim(p_target_segment) || ' handle ' || trim(p_problem_hypothesis) || '. Would you be open to a 20-minute conversation? I am looking to learn, not pitch.'),
    jsonb_build_object('key','problem','label','Problem-led','body',
      'Hi {{first_name}}, I help ' || trim(p_target_segment) || ' address ' || trim(p_problem_hypothesis) || '. Is this a priority for you right now? I would value 20 minutes to compare notes.'),
    jsonb_build_object('key','offer','label','Offer-led','body',
      'Hi {{first_name}}, I am testing ' || trim(p_offer) || ' for ' || trim(p_target_segment) || '. Would a short conversation be useful to see whether it fits how you work today?')
  );

  BEGIN
    INSERT INTO public.first_customer_sprints (
      founder_id, status, starts_at, ends_at, business_model_snapshot,
      customer_count_snapshot, primary_goal_snapshot, offer, target_segment,
      problem_hypothesis, proof_url, proof_description, estimated_customer_value_usd,
      weekly_capacity_hours, mentor_decision_question, message_variants, message_generation_count
    ) VALUES (
      v_founder, 'active', now(), now() + interval '30 days', v_state.business_model,
      v_state.customer_count, v_state.primary_goal, trim(p_offer), trim(p_target_segment),
      trim(p_problem_hypothesis), NULLIF(trim(COALESCE(p_proof_url,'')),''),
      NULLIF(trim(COALESCE(p_proof_description,'')),''), p_estimated_customer_value_usd,
      p_weekly_capacity_hours, NULLIF(trim(COALESCE(p_mentor_decision_question,'')),''),
      v_variants, 0
    ) RETURNING * INTO v_sprint;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_sprint FROM public.first_customer_sprints
      WHERE founder_id=v_founder AND status IN ('draft','active','paused')
      ORDER BY created_at DESC LIMIT 1;
  END;
  RETURN v_sprint;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_first_customer_sprint_v1(p_sprint_id uuid, p_patch jsonb)
RETURNS public.first_customer_sprints
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_sprint public.first_customer_sprints%ROWTYPE;
BEGIN
  SELECT * INTO v_sprint FROM public.first_customer_sprints
    WHERE id = p_sprint_id AND founder_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sprint not found' USING ERRCODE = '42501'; END IF;
  IF v_sprint.status = 'completed' THEN RAISE EXCEPTION 'Completed sprints are read-only'; END IF;

  IF p_patch ? 'selectedMessageVariant' AND NOT (p_patch->>'selectedMessageVariant' IN ('discovery','problem','offer')) THEN
    RAISE EXCEPTION 'Invalid message variant';
  END IF;
  IF p_patch ? 'messageVariants' AND (
    jsonb_typeof(p_patch->'messageVariants') <> 'array' OR jsonb_array_length(p_patch->'messageVariants') <> 3
  ) THEN RAISE EXCEPTION 'Exactly three message variants are required'; END IF;
  IF p_patch ? 'messageGenerationCount' AND (p_patch->>'messageGenerationCount')::integer NOT BETWEEN 0 AND 2 THEN
    RAISE EXCEPTION 'Only one regeneration is permitted';
  END IF;
  IF p_patch ? 'messageGenerationCount' AND (
    (p_patch->>'messageGenerationCount')::integer <> v_sprint.message_generation_count + 1
  ) THEN RAISE EXCEPTION 'Message generation count must advance one step'; END IF;
  IF p_patch ? 'status' AND NOT (p_patch->>'status' IN ('active','paused')) THEN
    RAISE EXCEPTION 'Invalid status update';
  END IF;
  IF p_patch ? 'finalDecision' AND NOT (p_patch->>'finalDecision' IN ('continue','narrow_segment','change_offer','change_message','change_channel','pivot','pause')) THEN
    RAISE EXCEPTION 'Invalid founder decision';
  END IF;

  UPDATE public.first_customer_sprints SET
    status = CASE WHEN p_patch ? 'status' THEN p_patch->>'status' ELSE status END,
    offer = CASE WHEN p_patch ? 'offer' THEN NULLIF(trim(p_patch->>'offer'),'') ELSE offer END,
    target_segment = CASE WHEN p_patch ? 'targetSegment' THEN NULLIF(trim(p_patch->>'targetSegment'),'') ELSE target_segment END,
    problem_hypothesis = CASE WHEN p_patch ? 'problemHypothesis' THEN NULLIF(trim(p_patch->>'problemHypothesis'),'') ELSE problem_hypothesis END,
    proof_url = CASE WHEN p_patch ? 'proofUrl' THEN NULLIF(trim(p_patch->>'proofUrl'),'') ELSE proof_url END,
    proof_description = CASE WHEN p_patch ? 'proofDescription' THEN NULLIF(trim(p_patch->>'proofDescription'),'') ELSE proof_description END,
    estimated_customer_value_usd = CASE WHEN p_patch ? 'estimatedCustomerValueUsd' THEN (p_patch->>'estimatedCustomerValueUsd')::numeric ELSE estimated_customer_value_usd END,
    weekly_capacity_hours = CASE WHEN p_patch ? 'weeklyCapacityHours' THEN (p_patch->>'weeklyCapacityHours')::numeric ELSE weekly_capacity_hours END,
    mentor_decision_question = CASE WHEN p_patch ? 'mentorDecisionQuestion' THEN NULLIF(trim(p_patch->>'mentorDecisionQuestion'),'') ELSE mentor_decision_question END,
    message_variants = CASE WHEN p_patch ? 'messageVariants' THEN p_patch->'messageVariants' ELSE message_variants END,
    selected_message_variant = CASE WHEN p_patch ? 'selectedMessageVariant' THEN p_patch->>'selectedMessageVariant' ELSE selected_message_variant END,
    message_generation_count = CASE WHEN p_patch ? 'messageGenerationCount' THEN (p_patch->>'messageGenerationCount')::integer ELSE message_generation_count END,
    mentor_brief_snapshot = CASE WHEN p_patch ? 'mentorBriefSnapshot' THEN p_patch->'mentorBriefSnapshot' ELSE mentor_brief_snapshot END,
    mentor_checkpoint_completed_at = CASE WHEN p_patch ? 'mentorCheckpointCompleted' AND (p_patch->>'mentorCheckpointCompleted')::boolean THEN now() ELSE mentor_checkpoint_completed_at END,
    mentor_recommendation_summary = CASE WHEN p_patch ? 'mentorRecommendationSummary' THEN NULLIF(trim(p_patch->>'mentorRecommendationSummary'),'') ELSE mentor_recommendation_summary END,
    final_decision = CASE WHEN p_patch ? 'finalDecision' THEN p_patch->>'finalDecision' ELSE final_decision END,
    final_notes = CASE WHEN p_patch ? 'finalNotes' THEN NULLIF(trim(p_patch->>'finalNotes'),'') ELSE final_notes END,
    updated_at = now()
  WHERE id = p_sprint_id
  RETURNING * INTO v_sprint;
  IF length(trim(COALESCE(v_sprint.offer,''))) < 3
    OR length(trim(COALESCE(v_sprint.target_segment,''))) < 3
    OR length(trim(COALESCE(v_sprint.problem_hypothesis,''))) < 3
    OR (length(trim(COALESCE(v_sprint.proof_url,'')))=0 AND length(trim(COALESCE(v_sprint.proof_description,'')))<3)
    OR COALESCE(v_sprint.estimated_customer_value_usd,0)<=0
    OR COALESCE(v_sprint.weekly_capacity_hours,0)<2 THEN
    RAISE EXCEPTION 'Sprint intake must remain complete';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_sprint.message_variants) item
    WHERE item->>'key' NOT IN ('discovery','problem','offer')
      OR length(trim(COALESCE(item->>'body',''))) < 20
      OR length(item->>'body') > 900
  ) THEN RAISE EXCEPTION 'Message variants must use valid keys and bodies'; END IF;
  IF p_patch ? 'selectedMessageVariant' THEN
    UPDATE public.first_customer_sprint_contacts
    SET selected_message_variant = p_patch->>'selectedMessageVariant'
    WHERE sprint_id = p_sprint_id;
  END IF;
  RETURN v_sprint;
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_first_customer_sprint_contact_v1(
  p_sprint_id uuid,
  p_contact_id uuid,
  p_message_variant_key text DEFAULT NULL
)
RETURNS public.first_customer_sprint_contacts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_link public.first_customer_sprint_contacts%ROWTYPE;
BEGIN
  IF p_message_variant_key IS NOT NULL AND p_message_variant_key NOT IN ('discovery','problem','offer') THEN
    RAISE EXCEPTION 'Invalid message variant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.first_customer_sprints WHERE id=p_sprint_id AND founder_id=auth.uid() AND status IN ('draft','active','paused')) THEN
    RAISE EXCEPTION 'Sprint not found' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.founder_customer_contacts WHERE id=p_contact_id AND user_id=auth.uid()) THEN
    RAISE EXCEPTION 'Contact not found' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.first_customer_sprint_contacts(sprint_id, contact_id, selected_message_variant)
  VALUES (p_sprint_id, p_contact_id, p_message_variant_key)
  ON CONFLICT (sprint_id, contact_id) DO UPDATE SET
    selected_message_variant = COALESCE(EXCLUDED.selected_message_variant, first_customer_sprint_contacts.selected_message_variant)
  RETURNING * INTO v_link;
  RETURN v_link;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_first_customer_sprint_call_v1(
  p_sprint_id uuid,
  p_discovery_call_id uuid,
  p_mentor_id uuid,
  p_mentor_brief_snapshot jsonb DEFAULT NULL
)
RETURNS public.first_customer_sprints
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_sprint public.first_customer_sprints%ROWTYPE;
BEGIN
  SELECT * INTO v_sprint FROM public.first_customer_sprints
    WHERE id=p_sprint_id AND founder_id=auth.uid() AND status IN ('draft','active','paused') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sprint not found' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.discovery_calls
    WHERE id=p_discovery_call_id AND founder_id=auth.uid() AND mentor_id=p_mentor_id
  ) THEN RAISE EXCEPTION 'Discovery call not found' USING ERRCODE='42501'; END IF;
  UPDATE public.first_customer_sprints SET
    discovery_call_id=p_discovery_call_id,
    mentor_id=p_mentor_id,
    mentor_brief_snapshot=COALESCE(p_mentor_brief_snapshot,mentor_brief_snapshot),
    updated_at=now()
  WHERE id=p_sprint_id RETURNING * INTO v_sprint;
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
  v_enrolled boolean;
  v_attached integer := 0; v_sent integer := 0; v_replies integer := 0;
  v_conversations integer := 0; v_commitments integer := 0; v_payments integer := 0;
  v_can_complete boolean := false; v_step text := 'intake';
BEGIN
  IF v_founder IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  v_enrolled := public.first_customer_sprint_is_enrolled_v1(v_founder);
  SELECT * INTO v_sprint FROM public.first_customer_sprints
    WHERE founder_id=v_founder AND (p_sprint_id IS NULL OR id=p_sprint_id)
    ORDER BY CASE WHEN status IN ('draft','active','paused') THEN 0 ELSE 1 END, created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'version',1,'enrolled',v_enrolled,'sprint',NULL,'contacts','[]'::jsonb,'availableContacts','[]'::jsonb,
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
  FROM public.customer_evidence_events
  WHERE user_id=v_founder AND metadata->>'sprintId'=v_sprint.id::text
    AND EXISTS (
      SELECT 1 FROM public.first_customer_sprint_contacts scoped
      WHERE scoped.sprint_id=v_sprint.id AND scoped.contact_id=customer_evidence_events.contact_id
    );

  v_can_complete := v_conversations >= 3 OR v_commitments > 0 OR v_payments > 0
    OR (v_sent >= 10 AND v_sprint.final_decision IN ('pivot','pause') AND length(trim(COALESCE(v_sprint.final_notes,''))) >= 3);
  v_step := CASE
    WHEN v_sprint.status='completed' THEN 'completed'
    WHEN now()>v_sprint.ends_at THEN 'awaiting_final_review'
    WHEN v_attached<10 THEN 'target_list'
    WHEN v_sprint.selected_message_variant IS NULL THEN 'message_preparation'
    WHEN v_sprint.discovery_call_id IS NULL THEN 'mentor_checkpoint'
    WHEN v_sent<10 THEN 'execution'
    WHEN NOT v_can_complete THEN 'review'
    ELSE 'complete'
  END;

  RETURN jsonb_build_object(
    'version',1,'enrolled',v_enrolled,'generatedAt',now(),'sprint',to_jsonb(v_sprint),
    'contacts',COALESCE((SELECT jsonb_agg(to_jsonb(c) || jsonb_build_object('message_variant_key',sc.selected_message_variant) ORDER BY sc.created_at)
      FROM public.first_customer_sprint_contacts sc JOIN public.founder_customer_contacts c ON c.id=sc.contact_id WHERE sc.sprint_id=v_sprint.id),'[]'::jsonb),
    'availableContacts',COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.last_activity_at DESC)
      FROM public.founder_customer_contacts c WHERE c.user_id=v_founder
      AND NOT EXISTS (SELECT 1 FROM public.first_customer_sprint_contacts sc WHERE sc.sprint_id=v_sprint.id AND sc.contact_id=c.id)),'[]'::jsonb),
    'evidence',jsonb_build_object('attachedProspects',v_attached,'contactedProspects',v_sent,'replies',v_replies,'conversations',v_conversations,'commitments',v_commitments,'payments',v_payments),
    'targets',jsonb_build_object('prospects',20,'outreach',10,'conversations',3,'mentorCheckpoints',1),
    'linkedCall',CASE WHEN v_sprint.discovery_call_id IS NULL THEN NULL ELSE (SELECT to_jsonb(dc) FROM public.discovery_calls dc WHERE dc.id=v_sprint.discovery_call_id) END,
    'derivedStep',v_step,'awaitingFinalReview',(now()>v_sprint.ends_at AND v_sprint.status<>'completed'),'canComplete',v_can_complete,
    'cycleDefaults',COALESCE((SELECT jsonb_build_object(
      'businessModel',business_model,'customerCount',customer_count,'weeklyCapacityHours',weekly_capacity_hours,'primaryGoal',primary_goal
    ) FROM public.founder_cycle_state WHERE user_id=v_founder),'{}'::jsonb)
  );
END;
$$;

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
  v_sent integer; v_conversations integer; v_commitments integer; v_payments integer;
BEGIN
  SELECT * INTO v_sprint FROM public.first_customer_sprints
    WHERE id=p_sprint_id AND founder_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sprint not found' USING ERRCODE='42501'; END IF;
  IF p_final_decision NOT IN ('continue','narrow_segment','change_offer','change_message','change_channel','pivot','pause') THEN
    RAISE EXCEPTION 'Select a valid founder decision';
  END IF;
  SELECT
    count(*) FILTER (WHERE event_type='outreach_sent'),
    count(*) FILTER (WHERE event_type='interview_completed'),
    count(*) FILTER (WHERE event_type='commitment_received'),
    count(*) FILTER (WHERE event_type='payment_received')
  INTO v_sent,v_conversations,v_commitments,v_payments
  FROM public.customer_evidence_events
  WHERE user_id=auth.uid() AND metadata->>'sprintId'=p_sprint_id::text
    AND EXISTS (
      SELECT 1 FROM public.first_customer_sprint_contacts scoped
      WHERE scoped.sprint_id=p_sprint_id AND scoped.contact_id=customer_evidence_events.contact_id
    );
  IF NOT (v_conversations>=3 OR v_commitments>0 OR v_payments>0 OR
    (v_sent>=10 AND p_final_decision IN ('pivot','pause') AND length(trim(COALESCE(p_final_notes,'')))>=3)) THEN
    RAISE EXCEPTION 'Sprint completion evidence has not been met';
  END IF;
  UPDATE public.first_customer_sprints SET status='completed', final_decision=p_final_decision,
    final_notes=NULLIF(trim(COALESCE(p_final_notes,'')),''), completed_at=now(), updated_at=now()
  WHERE id=p_sprint_id RETURNING * INTO v_sprint;
  RETURN v_sprint;
END;
$$;

REVOKE ALL ON FUNCTION public.first_customer_sprint_is_enrolled_v1(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.start_first_customer_sprint_v1(text,text,text,text,text,numeric,numeric,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_first_customer_sprint_v1(uuid,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.attach_first_customer_sprint_contact_v1(uuid,uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.link_first_customer_sprint_call_v1(uuid,uuid,uuid,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_first_customer_sprint_snapshot_v1(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_first_customer_sprint_v1(uuid,text,text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.first_customer_sprint_is_enrolled_v1(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_first_customer_sprint_v1(text,text,text,text,text,numeric,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_first_customer_sprint_v1(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attach_first_customer_sprint_contact_v1(uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_first_customer_sprint_call_v1(uuid,uuid,uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_first_customer_sprint_snapshot_v1(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_first_customer_sprint_v1(uuid,text,text) TO authenticated;

COMMENT ON TABLE public.first_customer_sprints IS 'Invite-only, founder-executed 30-day First Customer Sprint V1.';
COMMENT ON COLUMN public.first_customer_sprints.mentor_brief_snapshot IS 'Versioned founder-carried brief; never include contact notes, profile URLs, or private contact fields.';
