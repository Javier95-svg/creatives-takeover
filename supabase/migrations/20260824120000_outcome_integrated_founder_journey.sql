-- Outcome-integrated founder journey V1.
-- This migration adds a founder-level journey spine around the existing
-- artifact outcomes, market experiments, and First Customer Sprint. Existing
-- rows remain valid and the old journey status vocabulary is preserved.

CREATE TABLE IF NOT EXISTS public.founder_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_key text NOT NULL DEFAULT 'organic',
  contract_version text NOT NULL DEFAULT 'outcome_journey_v1',
  entry_stage text NOT NULL CHECK (entry_stage IN ('target','proof','validate','deliver','acquire','repeat','capital')),
  current_stage text NOT NULL CHECK (current_stage IN ('target','proof','validate','deliver','acquire','repeat','capital')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','closed')),
  entry_evidence jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(entry_evidence) = 'object'),
  acquisition_source text,
  capital_eligible_at timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (octet_length(entry_evidence::text) <= 30000)
);

CREATE UNIQUE INDEX IF NOT EXISTS founder_journeys_one_active_per_founder
  ON public.founder_journeys(user_id)
  WHERE status IN ('active','paused');
CREATE INDEX IF NOT EXISTS founder_journeys_cohort_idx
  ON public.founder_journeys(cohort_key, started_at, current_stage);

CREATE TABLE IF NOT EXISTS public.journey_stage_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.founder_journeys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('target','proof','validate','deliver','acquire','repeat','capital')),
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  source_tool text,
  artifact_state text NOT NULL DEFAULT 'missing' CHECK (artifact_state IN ('missing','draft','usable','published')),
  outcome_state text NOT NULL DEFAULT 'not_started' CHECK (outcome_state IN ('not_started','in_progress','achieved','verified')),
  transition_decision text CHECK (transition_decision IS NULL OR transition_decision IN ('advance','repeat','loop_back','pause','close')),
  next_stage text CHECK (next_stage IS NULL OR next_stage IN ('target','proof','validate','deliver','acquire','repeat','capital')),
  branch_reason text,
  evidence_summary jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(evidence_summary) = 'object'),
  entered_at timestamptz NOT NULL DEFAULT now(),
  first_action_at timestamptz,
  transition_offered_at timestamptz,
  transition_started_at timestamptz,
  artifact_usable_at timestamptz,
  outcome_achieved_at timestamptz,
  outcome_verified_at timestamptz,
  exited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (journey_id, stage, attempt_number),
  CHECK (octet_length(COALESCE(branch_reason, '')) <= 2000),
  CHECK (octet_length(evidence_summary::text) <= 40000)
);

CREATE INDEX IF NOT EXISTS journey_stage_runs_active_idx
  ON public.journey_stage_runs(journey_id, stage, entered_at DESC)
  WHERE exited_at IS NULL;
CREATE INDEX IF NOT EXISTS journey_stage_runs_pilot_funnel_idx
  ON public.journey_stage_runs(stage, outcome_state, entered_at);

ALTER TABLE public.journey_outcomes
  ADD COLUMN IF NOT EXISTS stage_run_id uuid REFERENCES public.journey_stage_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS artifact_state text NOT NULL DEFAULT 'draft'
    CHECK (artifact_state IN ('missing','draft','usable','published')),
  ADD COLUMN IF NOT EXISTS business_outcome_state text NOT NULL DEFAULT 'not_started'
    CHECK (business_outcome_state IN ('not_started','in_progress','achieved','verified'));

ALTER TABLE public.journey_handoffs
  ADD COLUMN IF NOT EXISTS source_stage_run_id uuid REFERENCES public.journey_stage_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_stage_run_id uuid REFERENCES public.journey_stage_runs(id) ON DELETE SET NULL;

ALTER TABLE public.first_customer_sprints
  ADD COLUMN IF NOT EXISTS journey_id uuid REFERENCES public.founder_journeys(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stage_run_id uuid REFERENCES public.journey_stage_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS market_experiment_id uuid REFERENCES public.market_experiments(id) ON DELETE SET NULL;

ALTER TABLE public.market_experiments
  ADD COLUMN IF NOT EXISTS journey_id uuid REFERENCES public.founder_journeys(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stage_run_id uuid REFERENCES public.journey_stage_runs(id) ON DELETE SET NULL;

ALTER TABLE public.traction_engine_sprints
  ADD COLUMN IF NOT EXISTS journey_id uuid REFERENCES public.founder_journeys(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stage_run_id uuid REFERENCES public.journey_stage_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_first_customer_sprint_id uuid REFERENCES public.first_customer_sprints(id) ON DELETE SET NULL;

ALTER TABLE public.founder_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_stage_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY founder_journeys_owner_read ON public.founder_journeys
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY founder_journeys_admin_all ON public.founder_journeys
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY journey_stage_runs_owner_read ON public.journey_stage_runs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY journey_stage_runs_admin_all ON public.journey_stage_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER founder_journeys_touch
  BEFORE UPDATE ON public.founder_journeys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER journey_stage_runs_touch
  BEFORE UPDATE ON public.journey_stage_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.ensure_outcome_journey_stage_run_v1(
  p_user_id uuid,
  p_stage text,
  p_cohort_key text DEFAULT 'organic',
  p_entry_evidence jsonb DEFAULT '{}'::jsonb,
  p_acquisition_source text DEFAULT NULL
) RETURNS public.journey_stage_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_journey public.founder_journeys%ROWTYPE;
  v_run public.journey_stage_runs%ROWTYPE;
  v_attempt integer;
BEGIN
  IF p_user_id IS NULL OR p_stage NOT IN ('target','proof','validate','deliver','acquire','repeat','capital') THEN
    RAISE EXCEPTION 'A valid founder and outcome stage are required';
  END IF;
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id
    AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Journey access denied' USING ERRCODE='42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || ':outcome-journey'));
  SELECT * INTO v_journey FROM public.founder_journeys
  WHERE user_id=p_user_id AND status IN ('active','paused')
  ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.founder_journeys(
      user_id, cohort_key, entry_stage, current_stage, entry_evidence, acquisition_source
    ) VALUES (
      p_user_id, COALESCE(NULLIF(trim(p_cohort_key),''),'organic'), p_stage, p_stage,
      COALESCE(p_entry_evidence,'{}'::jsonb), NULLIF(trim(COALESCE(p_acquisition_source,'')),'')
    ) RETURNING * INTO v_journey;
  END IF;

  SELECT * INTO v_run FROM public.journey_stage_runs
  WHERE journey_id=v_journey.id AND stage=p_stage AND exited_at IS NULL
  ORDER BY attempt_number DESC LIMIT 1;
  IF FOUND THEN RETURN v_run; END IF;

  SELECT COALESCE(max(attempt_number),0)+1 INTO v_attempt
  FROM public.journey_stage_runs WHERE journey_id=v_journey.id AND stage=p_stage;
  INSERT INTO public.journey_stage_runs(journey_id,user_id,stage,attempt_number,source_tool)
  VALUES (
    v_journey.id,p_user_id,p_stage,v_attempt,
    CASE p_stage
      WHEN 'target' THEN 'icp_builder' WHEN 'proof' THEN 'demo_studio'
      WHEN 'validate' THEN 'pmf_lab' WHEN 'deliver' THEN 'mvp_builder'
      WHEN 'acquire' THEN 'first_customer_sprint' WHEN 'repeat' THEN 'traction_engine'
      ELSE 'insighta_test' END
  ) RETURNING * INTO v_run;
  RETURN v_run;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_outcome_journey_v1(
  p_entry_stage text,
  p_entry_evidence jsonb DEFAULT '{}'::jsonb,
  p_cohort_key text DEFAULT 'organic',
  p_acquisition_source text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_run public.journey_stage_runs%ROWTYPE; v_capital_run public.journey_stage_runs%ROWTYPE; v_journey public.founder_journeys%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_entry_stage='capital' AND NOT EXISTS (
    SELECT 1 FROM public.journey_stage_runs run
    WHERE run.user_id=auth.uid() AND run.stage='repeat' AND run.outcome_state='verified'
  ) THEN
    p_entry_stage := 'repeat';
    p_entry_evidence := COALESCE(p_entry_evidence,'{}'::jsonb)||jsonb_build_object('capitalRequested',true,'capitalLockedReason','verified_repeatable_demand_required');
  END IF;
  v_run := public.ensure_outcome_journey_stage_run_v1(auth.uid(),p_entry_stage,p_cohort_key,p_entry_evidence,p_acquisition_source);
  SELECT * INTO v_journey FROM public.founder_journeys WHERE id=v_run.journey_id;
  RETURN jsonb_build_object('journey',to_jsonb(v_journey),'stageRun',to_jsonb(v_run));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_outcome_journey_v1()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT jsonb_build_object(
      'version',1,
      'journey',to_jsonb(journey),
      'stageRuns',COALESCE((SELECT jsonb_agg(to_jsonb(run) ORDER BY run.entered_at)
        FROM public.journey_stage_runs run WHERE run.journey_id=journey.id),'[]'::jsonb)
    )
    FROM public.founder_journeys journey
    WHERE journey.user_id=auth.uid() AND journey.status IN ('active','paused')
    ORDER BY journey.created_at DESC LIMIT 1
  ), jsonb_build_object('version',1,'journey',NULL,'stageRuns','[]'::jsonb));
$$;

-- Artifact readiness remains compatible with the existing four outcome labels,
-- while the stage run records whether the business outcome was actually earned.
CREATE OR REPLACE FUNCTION public.sync_artifact_outcome_to_stage_run_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_stage text; v_run public.journey_stage_runs%ROWTYPE; v_next_run public.journey_stage_runs%ROWTYPE;
  v_journey public.founder_journeys%ROWTYPE; v_execution_only boolean;
  v_decision text; v_next_stage text; v_transition text;
BEGIN
  v_stage := CASE NEW.stage
    WHEN 'identity' THEN 'target' WHEN 'prototype' THEN 'proof'
    WHEN 'validation' THEN 'validate' WHEN 'building' THEN 'deliver'
    WHEN 'launch' THEN 'acquire' WHEN 'traction' THEN 'repeat' ELSE NULL END;
  IF v_stage IS NULL THEN RETURN NEW; END IF;
  v_execution_only := NEW.tool IN ('gtm_strategist','traction_engine');
  IF NEW.stage_run_id IS NOT NULL THEN
    SELECT * INTO v_run FROM public.journey_stage_runs WHERE id=NEW.stage_run_id AND user_id=NEW.user_id AND stage=v_stage;
  END IF;
  IF v_run.id IS NULL THEN
    v_run := public.ensure_outcome_journey_stage_run_v1(NEW.user_id,v_stage,'legacy_tool_outcome','{}'::jsonb,NULL);
  END IF;

  UPDATE public.journey_outcomes SET
    stage_run_id=v_run.id,
    artifact_state=CASE WHEN NEW.status IN ('ready','verified','reviewed')
      THEN CASE WHEN NEW.tool IN ('demo_studio','mvp_builder') THEN 'published' ELSE 'usable' END
      ELSE 'draft' END,
    business_outcome_state=CASE WHEN v_execution_only THEN 'in_progress'
      WHEN NEW.status='verified' THEN 'verified'
      WHEN NEW.status IN ('ready','reviewed') THEN 'achieved'
      ELSE 'in_progress' END
  WHERE id=NEW.id AND (stage_run_id IS DISTINCT FROM v_run.id
    OR artifact_state IS DISTINCT FROM CASE WHEN NEW.status IN ('ready','verified','reviewed') THEN CASE WHEN NEW.tool IN ('demo_studio','mvp_builder') THEN 'published' ELSE 'usable' END ELSE 'draft' END
    OR business_outcome_state IS DISTINCT FROM CASE WHEN v_execution_only THEN 'in_progress' WHEN NEW.status='verified' THEN 'verified' WHEN NEW.status IN ('ready','reviewed') THEN 'achieved' ELSE 'in_progress' END);

  UPDATE public.journey_stage_runs SET
    artifact_state=CASE WHEN NEW.status IN ('ready','verified','reviewed')
      THEN CASE WHEN NEW.tool IN ('demo_studio','mvp_builder') THEN 'published' ELSE 'usable' END
      ELSE GREATEST(artifact_state,'draft') END,
    outcome_state=CASE WHEN v_execution_only THEN CASE WHEN outcome_state='not_started' THEN 'in_progress' ELSE outcome_state END
      WHEN NEW.status='verified' THEN 'verified'
      WHEN NEW.status IN ('ready','reviewed') THEN 'achieved'
      ELSE CASE WHEN outcome_state='not_started' THEN 'in_progress' ELSE outcome_state END END,
    first_action_at=COALESCE(first_action_at,NEW.created_at),
    artifact_usable_at=CASE WHEN NEW.status IN ('ready','verified','reviewed') THEN COALESCE(artifact_usable_at,now()) ELSE artifact_usable_at END,
    outcome_achieved_at=CASE WHEN NOT v_execution_only AND NEW.status IN ('ready','verified','reviewed') THEN COALESCE(outcome_achieved_at,now()) ELSE outcome_achieved_at END,
    outcome_verified_at=CASE WHEN NOT v_execution_only AND NEW.status='verified' THEN COALESCE(outcome_verified_at,now()) ELSE outcome_verified_at END,
    evidence_summary=jsonb_build_object('journeyOutcomeId',NEW.id,'artifactId',NEW.artifact_id,'legacyStatus',NEW.status)
  WHERE id=v_run.id;

  -- Artifact-producing stages move only after the server-authoritative outcome
  -- contract is ready. GTM and Traction artifacts never advance execution.
  IF NOT v_execution_only AND NEW.status IN ('ready','verified','reviewed') THEN
    SELECT * INTO v_journey FROM public.founder_journeys WHERE id=v_run.journey_id FOR UPDATE;
    IF v_journey.current_stage=v_stage THEN
      v_decision := lower(trim(COALESCE(NEW.quality_checks->>'decision','')));
      IF v_stage='target' THEN v_transition:='advance'; v_next_stage:='proof';
      ELSIF v_stage='proof' THEN v_transition:='advance'; v_next_stage:='validate';
      ELSIF v_stage='deliver' THEN v_transition:='advance'; v_next_stage:='acquire';
      ELSIF v_stage='validate' AND v_decision IN ('build','continue','proceed') THEN v_transition:='advance'; v_next_stage:='deliver';
      ELSIF v_stage='validate' AND v_decision IN ('narrow','narrow_segment','pivot') THEN v_transition:='loop_back'; v_next_stage:='target';
      ELSIF v_stage='validate' AND v_decision IN ('stop','kill') THEN v_transition:='close'; v_next_stage:=NULL;
      END IF;
      IF v_transition IS NOT NULL THEN
        UPDATE public.journey_stage_runs SET transition_decision=v_transition,next_stage=v_next_stage,
          branch_reason=CASE WHEN v_transition='advance' THEN 'The stage outcome contract was achieved.'
            WHEN v_transition='loop_back' THEN 'Buyer evidence invalidated an upstream assumption.'
            ELSE 'The founder chose to stop after the validation decision.' END,
          transition_offered_at=COALESCE(transition_offered_at,now()),
          transition_started_at=CASE WHEN v_transition<>'close' THEN COALESCE(transition_started_at,now()) ELSE transition_started_at END,
          exited_at=COALESCE(exited_at,now())
        WHERE id=v_run.id;
        IF v_transition='close' THEN
          UPDATE public.founder_journeys SET status='closed',completed_at=COALESCE(completed_at,now()) WHERE id=v_journey.id;
        ELSE
          v_next_run := public.ensure_outcome_journey_stage_run_v1(NEW.user_id,v_next_stage,v_journey.cohort_key,'{}'::jsonb,NEW.tool);
          UPDATE public.founder_journeys SET current_stage=v_next_stage,status='active' WHERE id=v_journey.id;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_artifact_outcome_to_stage_run ON public.journey_outcomes;
CREATE TRIGGER sync_artifact_outcome_to_stage_run
AFTER INSERT OR UPDATE OF status,quality_checks,evidence_manifest ON public.journey_outcomes
FOR EACH ROW EXECUTE FUNCTION public.sync_artifact_outcome_to_stage_run_v1();

CREATE OR REPLACE FUNCTION public.sync_first_customer_sprint_to_outcome_journey_v1(p_sprint_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sprint public.first_customer_sprints%ROWTYPE;
  v_run public.journey_stage_runs%ROWTYPE;
  v_repeat_run public.journey_stage_runs%ROWTYPE;
  v_next_run public.journey_stage_runs%ROWTYPE;
  v_journey public.founder_journeys%ROWTYPE;
  v_experiment public.market_experiments%ROWTYPE;
  v_prospects integer := 0; v_sent integer := 0; v_replies integer := 0;
  v_conversations integer := 0; v_commitments integer := 0; v_payments integer := 0;
  v_has_signal boolean := false; v_next_stage text := 'acquire'; v_decision text := NULL;
  v_reason text := 'Complete the 10-prospect, 10-message acquisition cycle.';
  v_traction_sprint_id uuid;
  v_repeat_experiment_id uuid;
BEGIN
  SELECT * INTO v_sprint FROM public.first_customer_sprints WHERE id=p_sprint_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','sprint_not_found'); END IF;
  IF v_sprint.stage_run_id IS NOT NULL THEN
    SELECT * INTO v_run FROM public.journey_stage_runs WHERE id=v_sprint.stage_run_id AND user_id=v_sprint.founder_id AND stage='acquire';
  END IF;
  IF v_run.id IS NULL THEN
    v_run := public.ensure_outcome_journey_stage_run_v1(v_sprint.founder_id,'acquire','first_customer_pilot','{}'::jsonb,'first_customer_sprint');
  END IF;
  SELECT * INTO v_journey FROM public.founder_journeys WHERE id=v_run.journey_id FOR UPDATE;

  SELECT count(DISTINCT scoped.contact_id)::integer,
    count(event.id) FILTER (WHERE event.event_type='outreach_sent')::integer,
    count(event.id) FILTER (WHERE event.event_type='reply_received')::integer,
    count(event.id) FILTER (WHERE event.event_type='interview_completed')::integer,
    count(event.id) FILTER (WHERE event.event_type='commitment_received')::integer,
    count(event.id) FILTER (WHERE event.event_type='payment_received')::integer
  INTO v_prospects,v_sent,v_replies,v_conversations,v_commitments,v_payments
  FROM public.first_customer_sprint_contacts scoped
  LEFT JOIN public.customer_evidence_events event
    ON event.user_id=v_sprint.founder_id AND event.contact_id=scoped.contact_id
    AND event.metadata->>'sprintId'=p_sprint_id::text
  WHERE scoped.sprint_id=p_sprint_id;
  v_has_signal := v_replies>0 OR v_conversations>0 OR v_commitments>0 OR v_payments>0;

  SELECT * INTO v_experiment FROM public.market_experiments
  WHERE source_first_customer_sprint_id=p_sprint_id AND execution_loop='SELL'
  ORDER BY version ASC LIMIT 1;
  IF v_experiment.id IS NULL AND length(trim(COALESCE(v_sprint.offer,'')))>=3
    AND length(trim(COALESCE(v_sprint.target_segment,'')))>=3 THEN
    INSERT INTO public.market_experiments(
      user_id,execution_loop,status,hypothesis,audience,problem,offer,message,channel,
      asset_type,asset_id,cta,target_metric,target_operator,target_value,minimum_sample_size,
      observation_window_days,kill_rule,action_packet,source_first_customer_sprint_id,
      idempotency_key,preregistered_at,journey_id,stage_run_id
    ) VALUES (
      v_sprint.founder_id,'SELL','preregistered',
      COALESCE(NULLIF(trim(v_sprint.problem_hypothesis),''),'A specific qualified buyer will respond to this offer.'),
      v_sprint.target_segment,v_sprint.problem_hypothesis,v_sprint.offer,
      COALESCE((SELECT item->>'body' FROM jsonb_array_elements(v_sprint.message_variants) item
        WHERE item->>'key'=v_sprint.selected_message_variant LIMIT 1),
        (SELECT item->>'body' FROM jsonb_array_elements(v_sprint.message_variants) item LIMIT 1),
        'Founder will write one manual message before outreach.'),
      'founder_outreach','first_customer_sprint',p_sprint_id::text,'Reply or book a conversation',
      'replies','gte',1,10,30,
      jsonb_build_object('afterAttempts',10,'decision','repeat_loop_back_or_pause'),
      jsonb_build_object('prospectCount',10,'manualSendingRequired',true,'expectedSignal','buyer_response'),
      p_sprint_id,'first-customer-cycle:'||p_sprint_id::text,v_sprint.starts_at,v_journey.id,v_run.id
    ) ON CONFLICT (user_id,idempotency_key) DO NOTHING RETURNING * INTO v_experiment;
    IF v_experiment.id IS NULL THEN
      SELECT * INTO v_experiment FROM public.market_experiments
      WHERE user_id=v_sprint.founder_id AND idempotency_key='first-customer-cycle:'||p_sprint_id::text;
    END IF;
  END IF;

  UPDATE public.first_customer_sprints SET journey_id=v_journey.id,stage_run_id=v_run.id,
    market_experiment_id=COALESCE(market_experiment_id,v_experiment.id)
  WHERE id=p_sprint_id;
  IF v_experiment.id IS NOT NULL THEN
    UPDATE public.market_experiments SET journey_id=v_journey.id,stage_run_id=v_run.id
    WHERE id=v_experiment.id;
  END IF;

  IF v_prospects>=10 AND v_sent>=10 AND v_has_signal THEN
    v_decision := 'advance'; v_next_stage := 'repeat';
    v_reason := 'A qualified buyer signal is ready to repeat through the same acquisition motion.';
  ELSIF v_sprint.status='completed' AND NOT v_has_signal THEN
    CASE v_sprint.final_decision
      WHEN 'narrow_segment' THEN v_decision:='loop_back'; v_next_stage:='target'; v_reason:='The completed sample invalidated the target segment.';
      WHEN 'pivot' THEN v_decision:='loop_back'; v_next_stage:='validate'; v_reason:='The completed sample invalidated the problem or offer.';
      WHEN 'pause' THEN v_decision:='pause'; v_next_stage:=NULL; v_reason:='The founder paused after completing the acquisition sample.';
      ELSE v_decision:='repeat'; v_next_stage:='acquire'; v_reason:='Change one offer, message, or channel variable and run another acquisition cycle.';
    END CASE;
  END IF;

  UPDATE public.journey_stage_runs SET
    artifact_state=CASE WHEN v_sprint.status='draft' THEN 'draft' ELSE 'usable' END,
    outcome_state=CASE WHEN v_decision IS NOT NULL THEN 'achieved' ELSE 'in_progress' END,
    transition_decision=v_decision,next_stage=v_next_stage,branch_reason=v_reason,
    first_action_at=COALESCE(first_action_at,v_sprint.starts_at),
    artifact_usable_at=CASE WHEN v_sprint.status<>'draft' THEN COALESCE(artifact_usable_at,now()) ELSE artifact_usable_at END,
    outcome_achieved_at=CASE WHEN v_decision IS NOT NULL THEN COALESCE(outcome_achieved_at,now()) ELSE outcome_achieved_at END,
    evidence_summary=jsonb_build_object('sprintId',p_sprint_id,'experimentId',v_experiment.id,
      'prospects',v_prospects,'messagesSent',v_sent,'replies',v_replies,'conversations',v_conversations,
      'commitments',v_commitments,'payments',v_payments,'hasBuyerSignal',v_has_signal)
  WHERE id=v_run.id;

  IF v_decision='advance' THEN
    UPDATE public.journey_stage_runs SET exited_at=COALESCE(exited_at,now()) WHERE id=v_run.id;
    SELECT * INTO v_repeat_run FROM public.journey_stage_runs
      WHERE journey_id=v_journey.id AND stage='repeat' ORDER BY attempt_number DESC LIMIT 1;
    IF v_repeat_run.id IS NULL THEN
      v_repeat_run := public.ensure_outcome_journey_stage_run_v1(v_sprint.founder_id,'repeat','first_customer_pilot','{}'::jsonb,'first_customer_sprint');
    END IF;
    UPDATE public.founder_journeys SET current_stage='repeat',status='active'
      WHERE id=v_journey.id AND capital_eligible_at IS NULL;

    -- A repeat cycle is a distinct, pre-registered experiment. Reusing the
    -- Launch experiment would make one acquisition cycle look repeatable.
    SELECT id INTO v_repeat_experiment_id
    FROM public.market_experiments
    WHERE parent_experiment_id=v_experiment.id
    LIMIT 1;
    IF v_repeat_experiment_id IS NULL AND v_experiment.id IS NOT NULL THEN
      INSERT INTO public.market_experiments(
        user_id,parent_experiment_id,version,execution_loop,status,hypothesis,audience,problem,
        buying_trigger,offer,message,channel,asset_type,asset_id,source_demo_id,cta,target_metric,
        target_operator,target_value,minimum_sample_size,observation_window_days,kill_rule,
        source_outcome_versions,source_icp_analysis_id,source_gtm_plan_id,source_gtm_play_id,
        source_traction_sprint_id,source_first_customer_sprint_id,idempotency_key,preregistered_at,
        journey_id,stage_run_id
      ) SELECT
        v_experiment.user_id,v_experiment.id,v_experiment.version+1,'GROW','preregistered',
        v_experiment.hypothesis,v_experiment.audience,v_experiment.problem,v_experiment.buying_trigger,
        v_experiment.offer,v_experiment.message,v_experiment.channel,v_experiment.asset_type,
        v_experiment.asset_id,v_experiment.source_demo_id,v_experiment.cta,v_experiment.target_metric,
        v_experiment.target_operator,v_experiment.target_value,v_experiment.minimum_sample_size,
        v_experiment.observation_window_days,v_experiment.kill_rule,v_experiment.source_outcome_versions,
        v_experiment.source_icp_analysis_id,v_experiment.source_gtm_plan_id,v_experiment.source_gtm_play_id,
        NULL,p_sprint_id,'repeat-cycle:'||p_sprint_id::text,now(),v_journey.id,v_repeat_run.id
      RETURNING id INTO v_repeat_experiment_id;
    END IF;

    SELECT id INTO v_traction_sprint_id FROM public.traction_engine_sprints
    WHERE user_id=v_sprint.founder_id AND source_first_customer_sprint_id=p_sprint_id LIMIT 1;
    IF v_traction_sprint_id IS NULL THEN
      INSERT INTO public.traction_engine_sprints(
        user_id,channel,cycle_start_date,status,activation_payload,activation_idempotency_key,
        review_due_at,journey_id,stage_run_id,source_first_customer_sprint_id
      ) VALUES (
        v_sprint.founder_id,COALESCE(NULLIF(v_experiment.channel,''),'Founder outreach'),current_date,'active',
        jsonb_build_object('marketExperimentId',COALESCE(v_repeat_experiment_id,v_experiment.id),'sourceExperimentId',v_experiment.id,
          'sourceSprintId',p_sprint_id,
          'audience',v_sprint.target_segment,'offer',v_sprint.offer,'firstBuyerSignal',true,
          'hypothesis',COALESCE(v_experiment.hypothesis,v_sprint.problem_hypothesis),
          'targetMetric',COALESCE(v_experiment.target_metric,'replies'),
          'targetValue',COALESCE(v_experiment.target_value,1),
          'minimumSampleSize',COALESCE(v_experiment.minimum_sample_size,10)),
        'first-customer:'||p_sprint_id::text,now()+interval '7 days',v_journey.id,v_repeat_run.id,p_sprint_id
      ) RETURNING id INTO v_traction_sprint_id;
    END IF;
  ELSIF v_decision IS NOT NULL THEN
    IF v_decision='pause' THEN
      UPDATE public.founder_journeys SET status='paused' WHERE id=v_journey.id;
    ELSE
      UPDATE public.journey_stage_runs SET exited_at=COALESCE(exited_at,now()),
        transition_offered_at=COALESCE(transition_offered_at,now()),
        transition_started_at=COALESCE(transition_started_at,now()) WHERE id=v_run.id;
      v_next_run := public.ensure_outcome_journey_stage_run_v1(v_sprint.founder_id,v_next_stage,'first_customer_pilot','{}'::jsonb,'first_customer_sprint');
      UPDATE public.founder_journeys SET current_stage=v_next_stage,status='active' WHERE id=v_journey.id;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok',true,'journeyId',v_journey.id,'stageRunId',v_run.id,
    'nextStage',v_next_stage,'decision',v_decision,'tractionSprintId',v_traction_sprint_id,'hasBuyerSignal',v_has_signal);
END;
$$;

-- The mentor checkpoint remains available as concierge support, but it is not
-- business evidence and therefore cannot block an acquisition-cycle outcome.
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
  v_sent integer; v_replies integer; v_conversations integer; v_commitments integer; v_payments integer;
  v_has_signal boolean;
BEGIN
  SELECT * INTO v_sprint FROM public.first_customer_sprints
  WHERE id=p_sprint_id AND founder_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sprint not found' USING ERRCODE='42501'; END IF;
  IF p_final_decision NOT IN ('continue','narrow_segment','change_offer','change_message','change_channel','pivot','pause') THEN
    RAISE EXCEPTION 'Select a valid founder decision';
  END IF;
  SELECT
    count(*) FILTER (WHERE event_type='outreach_sent'),
    count(*) FILTER (WHERE event_type='reply_received'),
    count(*) FILTER (WHERE event_type='interview_completed'),
    count(*) FILTER (WHERE event_type='commitment_received'),
    count(*) FILTER (WHERE event_type='payment_received')
  INTO v_sent,v_replies,v_conversations,v_commitments,v_payments
  FROM public.customer_evidence_events
  WHERE user_id=auth.uid() AND metadata->>'sprintId'=p_sprint_id::text
    AND EXISTS (
      SELECT 1 FROM public.first_customer_sprint_contacts scoped
      WHERE scoped.sprint_id=p_sprint_id AND scoped.contact_id=customer_evidence_events.contact_id
    );
  v_has_signal := v_replies>0 OR v_conversations>0 OR v_commitments>0 OR v_payments>0;
  IF v_sent<10 OR (NOT v_has_signal AND length(trim(COALESCE(p_final_notes,'')))<3) THEN
    RAISE EXCEPTION 'Complete 10 messages, then record a buyer signal or an evidence-backed cycle decision';
  END IF;
  UPDATE public.first_customer_sprints SET status='completed',final_decision=p_final_decision,
    final_notes=NULLIF(trim(COALESCE(p_final_notes,'')),''),completed_at=now(),updated_at=now()
  WHERE id=p_sprint_id RETURNING * INTO v_sprint;
  RETURN v_sprint;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_first_customer_sprint_row_to_journey_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.sync_first_customer_sprint_to_outcome_journey_v1(NEW.id); RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION public.sync_first_customer_event_to_journey_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_sprint_id uuid;
BEGIN
  IF NEW.active_loop<>'SELL' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.metadata->>'sprintId','') ~ '^[0-9a-fA-F-]{36}$' THEN v_sprint_id := (NEW.metadata->>'sprintId')::uuid; END IF;
  IF v_sprint_id IS NOT NULL THEN PERFORM public.sync_first_customer_sprint_to_outcome_journey_v1(v_sprint_id); END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS sync_first_customer_sprint_row_to_journey ON public.first_customer_sprints;
CREATE TRIGGER sync_first_customer_sprint_row_to_journey
AFTER INSERT OR UPDATE OF status,final_decision,final_notes ON public.first_customer_sprints
FOR EACH ROW EXECUTE FUNCTION public.sync_first_customer_sprint_row_to_journey_v1();
DROP TRIGGER IF EXISTS sync_first_customer_event_to_journey ON public.customer_evidence_events;
DROP TRIGGER IF EXISTS zz_sync_first_customer_event_to_journey ON public.customer_evidence_events;
CREATE TRIGGER zz_sync_first_customer_event_to_journey
AFTER INSERT ON public.customer_evidence_events
FOR EACH ROW EXECUTE FUNCTION public.sync_first_customer_event_to_journey_v1();

CREATE OR REPLACE FUNCTION public.sync_repeatable_demand_to_journey_v1(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE v_run public.journey_stage_runs%ROWTYPE; v_capital_run public.journey_stage_runs%ROWTYPE;
  v_journey public.founder_journeys%ROWTYPE;
  v_cycles integer:=0; v_verified boolean:=false; v_acquire_advanced boolean:=false;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.journey_stage_runs
    WHERE user_id=p_user_id AND stage='acquire' AND outcome_state IN ('achieved','verified')
      AND transition_decision='advance'
  ) INTO v_acquire_advanced;
  IF NOT v_acquire_advanced THEN
    RETURN jsonb_build_object('skipped',true,'reason','acquisition_cycle_not_advanced');
  END IF;
  SELECT * INTO v_run FROM public.journey_stage_runs
    WHERE user_id=p_user_id AND stage='repeat' ORDER BY attempt_number DESC LIMIT 1;
  IF v_run.id IS NULL THEN
    v_run := public.ensure_outcome_journey_stage_run_v1(p_user_id,'repeat','first_customer_pilot','{}'::jsonb,'traction_engine');
  END IF;
  SELECT * INTO v_journey FROM public.founder_journeys WHERE id=v_run.journey_id FOR UPDATE;
  WITH cycle_signal AS (
    SELECT experiment.id,lower(trim(experiment.audience)) AS audience,lower(trim(experiment.offer)) AS offer,
      lower(trim(experiment.channel)) AS channel,
      COALESCE(sum(observation.value) FILTER (WHERE observation.metric IN
        ('replies','positive_replies','meetings','attended','commitments','payments')),0) AS buyer_signals,
      COALESCE(bool_or(observation.verification_mode IN ('platform_verified','reviewer_verified')
        AND observation.metric IN ('replies','positive_replies','meetings','attended','commitments','payments')),false) AS verified
    FROM public.market_experiments experiment
    LEFT JOIN public.market_experiment_observations observation ON observation.experiment_id=experiment.id
    WHERE experiment.user_id=p_user_id AND experiment.execution_loop IN ('SELL','GROW')
    GROUP BY experiment.id,experiment.audience,experiment.offer,experiment.channel
  ), repeated AS (
    SELECT count(*)::integer AS cycles,bool_or(verified) AS verified
    FROM cycle_signal WHERE buyer_signals>0
    GROUP BY audience,offer,channel ORDER BY count(*) DESC LIMIT 1
  ) SELECT COALESCE(cycles,0),COALESCE(verified,false) INTO v_cycles,v_verified FROM repeated;
  v_cycles := COALESCE(v_cycles,0); v_verified := COALESCE(v_verified,false);

  UPDATE public.journey_stage_runs SET artifact_state=CASE WHEN v_cycles>0 THEN 'usable' ELSE 'draft' END,
    outcome_state=CASE WHEN v_cycles>=2 AND v_verified THEN 'verified' ELSE 'in_progress' END,
    transition_decision=CASE WHEN v_cycles>=2 AND v_verified THEN 'advance' ELSE NULL END,
    next_stage=CASE WHEN v_cycles>=2 AND v_verified THEN 'capital' ELSE 'repeat' END,
    branch_reason=CASE WHEN v_cycles>=2 AND v_verified THEN 'First repeatable demand is verified.'
      WHEN v_cycles>=2 THEN 'Repeatable demand needs one platform- or reviewer-verified signal.'
      ELSE 'Repeat the same ICP, offer, and channel in a second acquisition cycle.' END,
    transition_offered_at=CASE WHEN v_cycles>=2 AND v_verified THEN COALESCE(transition_offered_at,now()) ELSE transition_offered_at END,
    transition_started_at=CASE WHEN v_cycles>=2 AND v_verified THEN COALESCE(transition_started_at,now()) ELSE transition_started_at END,
    outcome_achieved_at=CASE WHEN v_cycles>=2 AND v_verified THEN COALESCE(outcome_achieved_at,now()) ELSE outcome_achieved_at END,
    outcome_verified_at=CASE WHEN v_cycles>=2 AND v_verified THEN COALESCE(outcome_verified_at,now()) ELSE outcome_verified_at END,
    evidence_summary=jsonb_build_object('comparableSignalCycles',v_cycles,'hasVerifiedBuyerSignal',v_verified)
  WHERE id=v_run.id;
  IF v_cycles>=2 AND v_verified THEN
    UPDATE public.journey_stage_runs SET exited_at=COALESCE(exited_at,now()) WHERE id=v_run.id;
    v_capital_run := public.ensure_outcome_journey_stage_run_v1(p_user_id,'capital',v_journey.cohort_key,'{}'::jsonb,'traction_engine');
    UPDATE public.founder_journeys SET capital_eligible_at=COALESCE(capital_eligible_at,now()),current_stage='capital' WHERE id=v_journey.id;
  END IF;
  RETURN jsonb_build_object('journeyId',v_journey.id,'stageRunId',v_run.id,'cycles',v_cycles,'verified',v_verified);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_market_observation_to_repeatable_journey_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.sync_repeatable_demand_to_journey_v1(NEW.user_id); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS sync_market_observation_to_repeatable_journey ON public.market_experiment_observations;
CREATE TRIGGER sync_market_observation_to_repeatable_journey
AFTER INSERT ON public.market_experiment_observations
FOR EACH ROW EXECUTE FUNCTION public.sync_market_observation_to_repeatable_journey_v1();

-- Private, redacted evidence review. The file remains founder-owned and is
-- deleted after 90 days; the non-sensitive review record remains auditable.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('journey-evidence-private','journey-evidence-private',false,10485760,
  ARRAY['image/png','image/jpeg','image/webp','application/pdf'])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=EXCLUDED.file_size_limit,
  allowed_mime_types=EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.journey_evidence_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_id uuid NOT NULL REFERENCES public.founder_journeys(id) ON DELETE CASCADE,
  stage_run_id uuid NOT NULL REFERENCES public.journey_stage_runs(id) ON DELETE CASCADE,
  sprint_id uuid REFERENCES public.first_customer_sprints(id) ON DELETE SET NULL,
  experiment_id uuid NOT NULL REFERENCES public.market_experiments(id) ON DELETE CASCADE,
  customer_evidence_event_id uuid REFERENCES public.customer_evidence_events(id) ON DELETE SET NULL,
  evidence_type text NOT NULL CHECK (evidence_type IN ('buyer_response','completed_conversation','commitment','payment')),
  object_path text UNIQUE,
  safe_summary text NOT NULL,
  redaction_attested boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  retention_delete_at timestamptz,
  file_deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(safe_summary) BETWEEN 8 AND 1000),
  CHECK (status<>'rejected' OR char_length(trim(COALESCE(rejection_reason,''))) BETWEEN 5 AND 500),
  CHECK (status='pending' OR reviewed_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS journey_evidence_review_queue_idx
  ON public.journey_evidence_submissions(status,submitted_at);
CREATE UNIQUE INDEX IF NOT EXISTS journey_evidence_one_submission_per_event_idx
  ON public.journey_evidence_submissions(customer_evidence_event_id)
  WHERE customer_evidence_event_id IS NOT NULL;
ALTER TABLE public.journey_evidence_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY journey_evidence_owner_read ON public.journey_evidence_submissions
  FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY journey_evidence_admin_all ON public.journey_evidence_submissions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY journey_evidence_object_owner_insert ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id='journey-evidence-private' AND (storage.foldername(name))[1]=auth.uid()::text
  );
CREATE POLICY journey_evidence_object_owner_read ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id='journey-evidence-private' AND (storage.foldername(name))[1]=auth.uid()::text
  );
CREATE POLICY journey_evidence_object_owner_delete ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id='journey-evidence-private' AND (storage.foldername(name))[1]=auth.uid()::text
  );
CREATE POLICY journey_evidence_object_admin_read ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id='journey-evidence-private' AND public.has_role(auth.uid(),'admin'::app_role)
  );

CREATE OR REPLACE FUNCTION public.submit_journey_evidence_v1(
  p_stage_run_id uuid,p_sprint_id uuid,p_experiment_id uuid,p_customer_evidence_event_id uuid,
  p_evidence_type text,p_object_path text,p_safe_summary text,p_redaction_attested boolean
) RETURNS public.journey_evidence_submissions
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,storage AS $$
DECLARE v_run public.journey_stage_runs%ROWTYPE; v_submission public.journey_evidence_submissions%ROWTYPE;
  v_event public.customer_evidence_events%ROWTYPE; v_expected_event_type text;
BEGIN
  SELECT * INTO v_run FROM public.journey_stage_runs WHERE id=p_stage_run_id AND user_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Stage run not found' USING ERRCODE='42501'; END IF;
  IF p_evidence_type NOT IN ('buyer_response','completed_conversation','commitment','payment') THEN RAISE EXCEPTION 'Invalid evidence type'; END IF;
  IF NOT COALESCE(p_redaction_attested,false) THEN RAISE EXCEPTION 'Confirm that the evidence is redacted'; END IF;
  IF p_object_path IS NULL OR p_object_path NOT LIKE auth.uid()::text||'/%' THEN RAISE EXCEPTION 'Invalid private evidence path'; END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='journey-evidence-private' AND name=p_object_path) THEN RAISE EXCEPTION 'Evidence file was not uploaded'; END IF;
  IF p_safe_summary ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
    OR p_safe_summary ~* '(full transcript|unredacted|crm export)' THEN RAISE EXCEPTION 'Remove contact details, transcripts, and CRM exports'; END IF;
  IF p_sprint_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.first_customer_sprints WHERE id=p_sprint_id AND founder_id=auth.uid() AND stage_run_id=v_run.id) THEN RAISE EXCEPTION 'Sprint is not linked to this stage run'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.market_experiments WHERE id=p_experiment_id AND user_id=auth.uid() AND source_first_customer_sprint_id=p_sprint_id AND stage_run_id=v_run.id) THEN RAISE EXCEPTION 'Experiment is not linked to this sprint outcome'; END IF;
  IF p_customer_evidence_event_id IS NULL THEN RAISE EXCEPTION 'Choose the specific recorded buyer event'; END IF;
  SELECT * INTO v_event FROM public.customer_evidence_events WHERE id=p_customer_evidence_event_id
    AND user_id=auth.uid() AND metadata->>'sprintId'=p_sprint_id::text;
  IF NOT FOUND THEN RAISE EXCEPTION 'Evidence event is not linked to this sprint'; END IF;
  v_expected_event_type := CASE p_evidence_type WHEN 'buyer_response' THEN 'reply_received'
    WHEN 'completed_conversation' THEN 'interview_completed' WHEN 'commitment' THEN 'commitment_received'
    WHEN 'payment' THEN 'payment_received' END;
  IF v_event.event_type<>v_expected_event_type THEN RAISE EXCEPTION 'Evidence type does not match the recorded buyer event'; END IF;
  INSERT INTO public.journey_evidence_submissions(user_id,journey_id,stage_run_id,sprint_id,experiment_id,
    customer_evidence_event_id,evidence_type,object_path,safe_summary,redaction_attested)
  VALUES(auth.uid(),v_run.journey_id,p_stage_run_id,p_sprint_id,p_experiment_id,p_customer_evidence_event_id,
    p_evidence_type,p_object_path,trim(p_safe_summary),true) RETURNING * INTO v_submission;
  RETURN v_submission;
END; $$;

CREATE OR REPLACE FUNCTION public.review_journey_evidence_v1(
  p_submission_id uuid,p_decision text,p_rejection_reason text DEFAULT NULL
) RETURNS public.journey_evidence_submissions
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_submission public.journey_evidence_submissions%ROWTYPE; v_event public.customer_evidence_events%ROWTYPE; v_metric text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
  IF p_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Select approved or rejected'; END IF;
  SELECT * INTO v_submission FROM public.journey_evidence_submissions WHERE id=p_submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Evidence submission not found'; END IF;
  IF v_submission.status<>'pending' THEN RETURN v_submission; END IF;
  IF p_decision='rejected' AND char_length(trim(COALESCE(p_rejection_reason,'')))<5 THEN RAISE EXCEPTION 'A concise rejection reason is required'; END IF;
  UPDATE public.journey_evidence_submissions SET status=p_decision,reviewer_id=auth.uid(),reviewed_at=now(),
    rejection_reason=CASE WHEN p_decision='rejected' THEN trim(p_rejection_reason) ELSE NULL END,
    retention_delete_at=CASE WHEN p_decision='approved' THEN now()+interval '90 days' ELSE now()+interval '30 days' END,
    updated_at=now() WHERE id=p_submission_id RETURNING * INTO v_submission;
  IF p_decision='approved' THEN
    IF v_submission.customer_evidence_event_id IS NOT NULL THEN SELECT * INTO v_event FROM public.customer_evidence_events WHERE id=v_submission.customer_evidence_event_id; END IF;
    v_metric := CASE v_submission.evidence_type WHEN 'buyer_response' THEN 'replies'
      WHEN 'completed_conversation' THEN 'attended' WHEN 'commitment' THEN 'commitments' ELSE 'payments' END;
    INSERT INTO public.market_experiment_observations(experiment_id,user_id,metric,value,source_type,source_id,
      verification_mode,provenance,idempotency_key,captured_at)
    VALUES(v_submission.experiment_id,v_submission.user_id,v_metric,1,'journey_evidence_review',v_submission.id::text,
      'reviewer_verified',jsonb_build_object('submissionId',v_submission.id,'reviewerId',auth.uid(),
        'originalFounderEventId',v_submission.customer_evidence_event_id),
      'reviewer-evidence:'||v_submission.id::text,COALESCE(v_event.occurred_at,v_submission.submitted_at))
    ON CONFLICT (experiment_id,idempotency_key) DO NOTHING;
    PERFORM public.evaluate_market_experiment_v1(v_submission.experiment_id);
  END IF;
  RETURN v_submission;
END; $$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_journey_evidence_v1()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,storage AS $$
DECLARE v_count integer;
BEGIN
  DELETE FROM storage.objects object USING public.journey_evidence_submissions submission
    WHERE object.bucket_id='journey-evidence-private' AND object.name=submission.object_path
      AND submission.retention_delete_at<=now() AND submission.file_deleted_at IS NULL;
  UPDATE public.journey_evidence_submissions SET object_path=NULL,file_deleted_at=now(),updated_at=now()
    WHERE retention_delete_at<=now() AND file_deleted_at IS NULL;
  GET DIAGNOSTICS v_count=ROW_COUNT; RETURN v_count;
END; $$;

-- Eight-person cohort. Source mix remains visible in the scorecard, while
-- capacity is the only hard allocation constraint.
CREATE OR REPLACE FUNCTION public.review_first_customer_sprint_application_v1(
  p_application_id uuid,p_decision text,p_override_reason text DEFAULT NULL
) RETURNS public.first_customer_sprint_applications
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_application public.first_customer_sprint_applications%ROWTYPE; v_invited integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
  IF p_decision NOT IN ('invited','declined') THEN RAISE EXCEPTION 'Select invited or declined'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('first-customer-cohort-v1'));
  SELECT * INTO v_application FROM public.first_customer_sprint_applications WHERE id=p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF v_application.status<>'submitted' THEN RETURN v_application; END IF;
  IF p_decision='invited' AND NOT v_application.qualified AND length(trim(COALESCE(p_override_reason,'')))<5 THEN RAISE EXCEPTION 'A reason is required to override qualification'; END IF;
  IF p_decision='invited' THEN
    SELECT count(*)::integer INTO v_invited FROM public.first_customer_sprint_applications WHERE status='invited';
    IF v_invited>=8 THEN RAISE EXCEPTION 'The eight-founder pilot is at capacity'; END IF;
  END IF;
  UPDATE public.first_customer_sprint_applications SET status=p_decision,
    admin_override_reason=CASE WHEN p_decision='invited' AND NOT qualified THEN trim(p_override_reason) ELSE NULL END,
    reviewed_at=now(),invited_at=CASE WHEN p_decision='invited' THEN now() ELSE NULL END,updated_at=now()
  WHERE id=p_application_id RETURNING * INTO v_application;
  IF p_decision='invited' THEN PERFORM public.set_founder_cycle_beta_cohort_v1(v_application.founder_id,true); END IF;
  RETURN v_application;
END; $$;

CREATE OR REPLACE FUNCTION public.get_outcome_journey_pilot_scorecard_v1()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
  WITH invited AS (
    SELECT application.founder_id,application.invited_at,application.acquisition_source,journey.id AS journey_id,
      journey.current_stage,journey.capital_eligible_at
    FROM public.first_customer_sprint_applications application
    LEFT JOIN public.founder_journeys journey ON journey.user_id=application.founder_id AND journey.status IN ('active','paused')
    WHERE application.status='invited'
  ), stage_rollup AS (
    SELECT invited.*,acquire.entered_at AS acquire_entered_at,acquire.outcome_achieved_at AS acquire_achieved_at,
      repeat.entered_at AS repeat_entered_at,repeat.outcome_state AS repeat_outcome_state,
      repeat.outcome_achieved_at AS repeat_outcome_achieved_at,sprint.id AS sprint_id,
      COALESCE((acquire.evidence_summary->>'prospects')::integer,0) AS prospects,
      COALESCE((acquire.evidence_summary->>'messagesSent')::integer,0) AS messages_sent,
      COALESCE((acquire.evidence_summary->>'hasBuyerSignal')::boolean,false) AS has_buyer_signal,
      (SELECT event.occurred_at FROM public.customer_evidence_events event
        WHERE event.user_id=invited.founder_id AND event.event_type='outreach_sent'
          AND event.metadata->>'sprintId'=sprint.id::text ORDER BY event.occurred_at OFFSET 9 LIMIT 1) AS ten_messages_at,
      (SELECT min(event.occurred_at) FROM public.customer_evidence_events event
        WHERE event.user_id=invited.founder_id AND event.event_type IN ('reply_received','interview_completed','commitment_received','payment_received')
          AND event.metadata->>'sprintId'=sprint.id::text) AS first_buyer_signal_at,
      (SELECT min(evidence.reviewed_at) FROM public.journey_evidence_submissions evidence
        WHERE evidence.user_id=invited.founder_id AND evidence.sprint_id=sprint.id AND evidence.status='approved') AS verified_signal_at,
      EXISTS(SELECT 1 FROM public.credit_transactions tx WHERE tx.user_id=invited.founder_id
        AND tx.tx_type='purchase' AND tx.metadata->>'purchaseSource'='first_customer_sprint') AS paid_continuation,
      round(extract(epoch FROM (now()-COALESCE(CASE invited.current_stage WHEN 'acquire' THEN acquire.entered_at WHEN 'repeat' THEN repeat.entered_at END,invited.invited_at)))/3600,1) AS time_in_current_stage_hours
    FROM invited
    LEFT JOIN LATERAL (SELECT id FROM public.first_customer_sprints scoped WHERE scoped.founder_id=invited.founder_id ORDER BY created_at LIMIT 1) sprint ON true
    LEFT JOIN LATERAL (SELECT * FROM public.journey_stage_runs run WHERE run.journey_id=invited.journey_id AND run.stage='acquire' ORDER BY attempt_number DESC LIMIT 1) acquire ON true
    LEFT JOIN LATERAL (SELECT * FROM public.journey_stage_runs run WHERE run.journey_id=invited.journey_id AND run.stage='repeat' ORDER BY attempt_number DESC LIMIT 1) repeat ON true
  ) SELECT jsonb_build_object('version',1,'generatedAt',now(),'invitedDenominator',count(*)::integer,
    'summary',jsonb_build_object(
      'sentTen',count(*) FILTER (WHERE messages_sent>=10)::integer,
      'sentTenWithin30Days',count(*) FILTER (WHERE ten_messages_at<=invited_at+interval '30 days')::integer,
      'verifiedFirstSignal',count(*) FILTER (WHERE messages_sent>=10 AND verified_signal_at IS NOT NULL)::integer,
      'verifiedFirstSignalWithin30Days',count(*) FILTER (WHERE ten_messages_at<=invited_at+interval '30 days' AND verified_signal_at<=invited_at+interval '30 days')::integer,
      'enteredTraction',count(*) FILTER (WHERE repeat_entered_at IS NOT NULL)::integer,
      'enteredTractionWithin48Hours',count(*) FILTER (WHERE verified_signal_at IS NOT NULL AND repeat_entered_at IS NOT NULL AND acquire_achieved_at IS NOT NULL AND repeat_entered_at<=acquire_achieved_at+interval '48 hours')::integer,
      'repeatableDemand',count(*) FILTER (WHERE repeat_outcome_state='verified')::integer,
      'verifiedRepeatableDemand',count(*) FILTER (WHERE repeat_outcome_state='verified')::integer,
      'repeatableDemandWithin45Days',count(*) FILTER (WHERE repeat_outcome_state='verified' AND repeat_outcome_achieved_at<=invited_at+interval '45 days')::integer,
      'paidContinuations',count(*) FILTER (WHERE paid_continuation)::integer,
      'pendingReviews',(SELECT count(*)::integer FROM public.journey_evidence_submissions WHERE status='pending')
    ),'expansionEligible',
      count(*) FILTER (WHERE ten_messages_at<=invited_at+interval '30 days' AND verified_signal_at<=invited_at+interval '30 days')>=5
      AND count(*) FILTER (WHERE verified_signal_at IS NOT NULL AND repeat_entered_at<=acquire_achieved_at+interval '48 hours')>=4
      AND count(*) FILTER (WHERE repeat_outcome_state='verified' AND repeat_outcome_achieved_at<=invited_at+interval '45 days')>=3,
    'founders',COALESCE(jsonb_agg(to_jsonb(stage_rollup) ORDER BY invited_at),'[]'::jsonb))
  INTO v_result FROM stage_rollup;
  RETURN v_result;
END; $$;

CREATE OR REPLACE FUNCTION public.get_outcome_journey_release_health_v1()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,storage AS $$
DECLARE v_missing_relations text[]; v_missing_functions text[]; v_missing_policies text[]; v_missing_triggers text[];
  v_bucket_private boolean; v_rls_enabled boolean;
BEGIN
  IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Service-role release check required' USING ERRCODE='42501'; END IF;
  SELECT COALESCE(array_agg(name),'{}'::text[]) INTO v_missing_relations FROM unnest(ARRAY[
    'public.founder_journeys','public.journey_stage_runs','public.journey_evidence_submissions',
    'public.first_customer_sprints','public.market_experiments','public.market_experiment_observations',
    'public.traction_engine_sprints','public.demo_studio_events','public.waitlist_signups'
  ]) name WHERE to_regclass(name) IS NULL;
  SELECT COALESCE(array_agg(name),'{}'::text[]) INTO v_missing_functions FROM unnest(ARRAY[
    'start_outcome_journey_v1','get_my_outcome_journey_v1','submit_journey_evidence_v1',
    'review_journey_evidence_v1','sync_first_customer_sprint_to_outcome_journey_v1',
    'sync_repeatable_demand_to_journey_v1','evaluate_market_experiment_v1'
  ]) name WHERE NOT EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=name);
  SELECT COALESCE(array_agg(name),'{}'::text[]) INTO v_missing_policies FROM unnest(ARRAY[
    'founder_journeys_owner_read','journey_stage_runs_owner_read','journey_evidence_owner_read',
    'journey_evidence_admin_all','journey_evidence_object_owner_insert','journey_evidence_object_owner_read','journey_evidence_object_owner_delete',
    'journey_evidence_object_admin_read'
  ]) name WHERE NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname=name);
  SELECT COALESCE(array_agg(name),'{}'::text[]) INTO v_missing_triggers FROM unnest(ARRAY[
    'sync_first_customer_sprint_row_to_journey','zz_sync_first_customer_event_to_journey',
    'sync_market_observation_to_repeatable_journey','sync_demo_event_to_customer_evidence_v1',
    'sync_demo_event_to_market_experiment','sync_waitlist_signup_to_founder_cycle_v1'
  ]) name WHERE NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname=name AND NOT tgisinternal);
  SELECT COALESCE(bool_and(relrowsecurity),false) INTO v_rls_enabled FROM pg_class
    WHERE oid IN ('public.founder_journeys'::regclass,'public.journey_stage_runs'::regclass,'public.journey_evidence_submissions'::regclass);
  SELECT COALESCE(NOT bucket.public,false) INTO v_bucket_private FROM storage.buckets bucket WHERE bucket.id='journey-evidence-private';
  RETURN jsonb_build_object(
    'healthy',cardinality(v_missing_relations)=0 AND cardinality(v_missing_functions)=0
      AND cardinality(v_missing_policies)=0 AND cardinality(v_missing_triggers)=0
      AND v_rls_enabled AND COALESCE(v_bucket_private,false),
    'checkedAt',now(),'missingRelations',v_missing_relations,'missingFunctions',v_missing_functions,
    'missingPolicies',v_missing_policies,'missingTriggers',v_missing_triggers,
    'rlsEnabled',v_rls_enabled,'privateEvidenceBucket',COALESCE(v_bucket_private,false)
  );
END; $$;

REVOKE ALL ON FUNCTION public.start_outcome_journey_v1(text,jsonb,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_my_outcome_journey_v1() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.submit_journey_evidence_v1(uuid,uuid,uuid,uuid,text,text,text,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.review_journey_evidence_v1(uuid,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_outcome_journey_pilot_scorecard_v1() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.cleanup_expired_journey_evidence_v1() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.get_outcome_journey_release_health_v1() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.start_outcome_journey_v1(text,jsonb,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_outcome_journey_v1() TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_journey_evidence_v1(uuid,uuid,uuid,uuid,text,text,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_journey_evidence_v1(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_outcome_journey_pilot_scorecard_v1() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_journey_evidence_v1() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_outcome_journey_release_health_v1() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-outcome-journey-evidence',
      '17 3 * * *',
      $job$SELECT public.cleanup_expired_journey_evidence_v1();$job$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Journey evidence cleanup schedule was not installed: %',SQLERRM;
END;
$$;

COMMENT ON TABLE public.founder_journeys IS 'One versioned, stage-adaptive founder journey keyed to business outcomes rather than tool visits.';
COMMENT ON TABLE public.journey_stage_runs IS 'Attempt-level artifact, outcome, evidence, and transition state for the seven outcome contracts.';
COMMENT ON TABLE public.journey_evidence_submissions IS 'Private redacted buyer evidence with immutable reviewer-derived observations and time-limited file retention.';
