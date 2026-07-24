-- Outcome-led founder journey and Validation Sprint.
-- Additive by design: legacy artifacts and routes remain readable while new
-- surfaces consume the server-authoritative snapshot below.

CREATE TABLE IF NOT EXISTS public.validation_sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'started' CHECK (status IN (
    'started', 'customer_defined', 'sourcing', 'gathering_evidence',
    'decision_ready', 'completed', 'abandoned'
  )),
  hypothesis text,
  primary_segment text,
  current_step integer NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 4),
  icp_outcome_id uuid REFERENCES public.journey_outcomes(id) ON DELETE SET NULL,
  pmf_outcome_id uuid REFERENCES public.journey_outcomes(id) ON DELETE SET NULL,
  decision text CHECK (decision IS NULL OR decision IN (
    'build', 'narrow', 'pivot', 'stop', 'collect_more_evidence'
  )),
  evidence_grade text NOT NULL DEFAULT 'insufficient' CHECK (evidence_grade IN (
    'insufficient', 'directional', 'emerging', 'decision_grade'
  )),
  credit_spend_total integer NOT NULL DEFAULT 0 CHECK (credit_spend_total >= 0),
  customer_brief jsonb NOT NULL DEFAULT '{}'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  interview_plan jsonb NOT NULL DEFAULT '[]'::jsonb,
  outreach_script text,
  next_experiment text,
  recommendation text CHECK (recommendation IS NULL OR recommendation IN (
    'build', 'narrow', 'pivot', 'stop', 'collect_more_evidence'
  )),
  override_rationale text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  last_resumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS validation_sprints_user_status_idx
  ON public.validation_sprints(user_id, status, updated_at DESC);

ALTER TABLE public.validation_sprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their validation sprints" ON public.validation_sprints;
CREATE POLICY "Users manage their validation sprints" ON public.validation_sprints
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage validation sprints" ON public.validation_sprints;
CREATE POLICY "Admins manage validation sprints" ON public.validation_sprints
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS set_validation_sprints_updated_at ON public.validation_sprints;
CREATE TRIGGER set_validation_sprints_updated_at
  BEFORE UPDATE ON public.validation_sprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.validation_sprint_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid NOT NULL REFERENCES public.validation_sprints(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN (
    'interview', 'transcript', 'hosted_survey', 'demo_behavior', 'external_research'
  )),
  source_id text NOT NULL,
  source_label text NOT NULL,
  participant_fingerprint text NOT NULL,
  summary text,
  signal text NOT NULL DEFAULT 'neutral' CHECK (signal IN ('supports', 'contradicts', 'neutral')),
  weight numeric NOT NULL DEFAULT 1 CHECK (weight > 0 AND weight <= 1),
  verification_mode text NOT NULL DEFAULT 'founder_reported' CHECK (verification_mode IN (
    'founder_reported', 'corroborated', 'platform_verified'
  )),
  occurred_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sprint_id, source_type, source_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS validation_sprint_evidence_participant_idx
  ON public.validation_sprint_evidence(sprint_id, participant_fingerprint);

CREATE INDEX IF NOT EXISTS validation_sprint_evidence_user_idx
  ON public.validation_sprint_evidence(user_id, sprint_id, created_at DESC);

ALTER TABLE public.validation_sprint_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their validation evidence" ON public.validation_sprint_evidence;
CREATE POLICY "Users manage their validation evidence" ON public.validation_sprint_evidence
  FOR ALL USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.validation_sprints sprint
      WHERE sprint.id = sprint_id AND sprint.user_id = auth.uid()
    )
  ) WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.validation_sprints sprint
      WHERE sprint.id = sprint_id AND sprint.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins manage validation evidence" ON public.validation_sprint_evidence;
CREATE POLICY "Admins manage validation evidence" ON public.validation_sprint_evidence
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS set_validation_sprint_evidence_updated_at ON public.validation_sprint_evidence;
CREATE TRIGGER set_validation_sprint_evidence_updated_at
  BEFORE UPDATE ON public.validation_sprint_evidence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Evidence is mutable and free to edit, so a prior decision cannot remain
-- authoritative after a signal changes. Immutable outcome versions preserve
-- the history while the current outcome returns to draft.
CREATE OR REPLACE FUNCTION public.invalidate_validation_sprint_decision_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sprint_id uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.sprint_id ELSE NEW.sprint_id END;
  v_outcome_id uuid;
  v_signal_count integer := 0;
  v_completion_score numeric := 0;
BEGIN
  SELECT pmf_outcome_id INTO v_outcome_id
  FROM public.validation_sprints
  WHERE id = v_sprint_id;

  SELECT count(*) INTO v_signal_count
  FROM public.validation_sprint_evidence
  WHERE sprint_id = v_sprint_id;
  v_completion_score := LEAST(100, round((v_signal_count::numeric / 25) * 100));

  UPDATE public.validation_sprints
  SET status = 'gathering_evidence',
      current_step = 3,
      decision = NULL,
      recommendation = NULL,
      evidence_grade = CASE
        WHEN v_signal_count >= 25 THEN 'decision_grade'
        WHEN v_signal_count >= 10 THEN 'emerging'
        WHEN v_signal_count >= 5 THEN 'directional'
        ELSE 'insufficient'
      END,
      next_experiment = 'Re-evaluate the updated evidence before acting on the prior decision.',
      override_rationale = NULL,
      completed_at = NULL
  WHERE id = v_sprint_id;

  IF v_outcome_id IS NOT NULL THEN
    UPDATE public.journey_outcomes
    SET status = 'draft',
        verification_mode = 'founder_reported',
        quality_checks = quality_checks || jsonb_build_object(
          'decision_grade', false,
          'decision', NULL,
          'recommendation', NULL,
          'signal_count', v_signal_count,
          '_evaluation', jsonb_build_object(
            'evaluatorVersion', 'validation-sprint-1',
            'completionScore', v_completion_score,
            'status', 'draft',
            'verificationMode', 'founder_reported',
            'warnings', jsonb_build_array('Evidence changed after the last decision. Re-evaluate before proceeding.'),
            'nextAction', 'Review the changed evidence and run the decision again.'
          )
        ),
        completion_score = v_completion_score,
        last_evaluated_at = now(),
        completed_at = NULL,
        verified_at = NULL,
        reviewed_at = NULL,
        updated_at = now()
    WHERE id = v_outcome_id;

    UPDATE public.journey_handoffs
    SET status = 'failed',
        failure_reason = 'Evidence changed after this handoff was created.',
        updated_at = now()
    WHERE source_outcome_id = v_outcome_id
      AND status = 'pending';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invalidate_validation_sprint_decision
  ON public.validation_sprint_evidence;
CREATE TRIGGER invalidate_validation_sprint_decision
  AFTER INSERT OR UPDATE OR DELETE ON public.validation_sprint_evidence
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_validation_sprint_decision_v1();

-- Import only PII-free fingerprints and short provenance labels. Interview text,
-- customer names, and email addresses are never copied into analytics payloads.
CREATE OR REPLACE FUNCTION public.sync_validation_sprint_evidence_v1(p_sprint_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_before integer := 0;
  v_after integer := 0;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.validation_sprints
    WHERE id = p_sprint_id AND user_id = v_user_id
  ) THEN RAISE EXCEPTION 'Validation Sprint not found'; END IF;

  SELECT count(*) INTO v_before
  FROM public.validation_sprint_evidence
  WHERE sprint_id = p_sprint_id AND user_id = v_user_id;

  INSERT INTO public.validation_sprint_evidence (
    sprint_id, user_id, source_type, source_id, source_label,
    participant_fingerprint, summary, signal, weight, verification_mode, occurred_at
  )
  SELECT
    p_sprint_id,
    v_user_id,
    'hosted_survey',
    response.id::text,
    'Hosted survey response',
    md5('participant:' || COALESCE(lower(response.email), response.session_id, response.id::text)),
    CASE response.sean_ellis_answer
      WHEN 'very' THEN 'Would be very disappointed without the product.'
      WHEN 'somewhat' THEN 'Would be somewhat disappointed without the product.'
      ELSE 'Would not be disappointed without the product.'
    END,
    CASE response.sean_ellis_answer WHEN 'very' THEN 'supports' WHEN 'not' THEN 'contradicts' ELSE 'neutral' END,
    1,
    'platform_verified',
    response.created_at
  FROM public.pmf_survey_responses response
  JOIN public.pmf_surveys survey ON survey.id = response.survey_id
  JOIN public.validation_sprints sprint ON sprint.id = p_sprint_id
  WHERE survey.user_id = v_user_id
    AND response.created_at >= sprint.started_at
  ON CONFLICT DO NOTHING;

  INSERT INTO public.validation_sprint_evidence (
    sprint_id, user_id, source_type, source_id, source_label,
    participant_fingerprint, summary, signal, weight, verification_mode, occurred_at
  )
  SELECT
    p_sprint_id,
    v_user_id,
    'demo_behavior',
    signup.id::text,
    'Demo Studio signup',
    md5('participant:' || lower(signup.email)),
    'A non-owner submitted the Demo Studio call to action.',
    'supports',
    1,
    'platform_verified',
    signup.created_at
  FROM public.demo_studio_signups signup
  JOIN public.demo_studio_projects project ON project.id = signup.project_id
  JOIN public.validation_sprints sprint ON sprint.id = p_sprint_id
  WHERE project.owner_id = v_user_id
    AND signup.created_at >= sprint.started_at
  ON CONFLICT DO NOTHING;

  INSERT INTO public.validation_sprint_evidence (
    sprint_id, user_id, source_type, source_id, source_label,
    participant_fingerprint, summary, signal, weight, verification_mode, occurred_at
  )
  SELECT DISTINCT ON (
    event.project_id,
    COALESCE(event.meta->>'session_id', event.id::text)
  )
    p_sprint_id,
    v_user_id,
    'demo_behavior',
    event.id::text,
    CASE event.type WHEN 'cta_click' THEN 'Demo CTA click' ELSE 'Demo completion' END,
    md5('demo-event:' || event.project_id::text || ':' || COALESCE(event.meta->>'session_id', event.id::text)),
    CASE event.type
      WHEN 'cta_click' THEN 'A non-owner clicked the demo call to action.'
      ELSE 'A non-owner completed the interactive demo.'
    END,
    'supports',
    1,
    'platform_verified',
    event.created_at
  FROM public.demo_studio_events event
  JOIN public.demo_studio_projects project ON project.id = event.project_id
  JOIN public.validation_sprints sprint ON sprint.id = p_sprint_id
  WHERE project.owner_id = v_user_id
    AND event.type IN ('demo_complete', 'cta_click')
    AND event.created_at >= sprint.started_at
  ORDER BY event.project_id, COALESCE(event.meta->>'session_id', event.id::text), event.created_at
  ON CONFLICT DO NOTHING;

  SELECT count(*) INTO v_after
  FROM public.validation_sprint_evidence
  WHERE sprint_id = p_sprint_id AND user_id = v_user_id;

  IF v_after > 0 THEN
    UPDATE public.validation_sprints
    SET status = CASE WHEN status IN ('started', 'customer_defined', 'sourcing') THEN 'gathering_evidence' ELSE status END,
        current_step = GREATEST(current_step, 3)
    WHERE id = p_sprint_id AND user_id = v_user_id;
  END IF;

  RETURN jsonb_build_object('imported', GREATEST(0, v_after - v_before), 'signalCount', v_after);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_validation_sprint_evidence_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_validation_sprint_evidence_v1(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.evaluate_validation_sprint_v1(
  p_sprint_id uuid,
  p_override_decision text DEFAULT NULL,
  p_override_rationale text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_sprint public.validation_sprints;
  v_signal_count integer := 0;
  v_weighted_total numeric := 0;
  v_weighted_support numeric := 0;
  v_score numeric := 0;
  v_grade text := 'insufficient';
  v_recommendation text := 'collect_more_evidence';
  v_decision text := 'collect_more_evidence';
  v_status text := 'draft';
  v_verification_mode text := 'founder_reported';
  v_outcome public.journey_outcomes;
  v_version_id uuid;
  v_sources jsonb := '[]'::jsonb;
  v_override boolean := false;
  v_next_experiment text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_sprint FROM public.validation_sprints
  WHERE id = p_sprint_id AND user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Validation Sprint not found'; END IF;

  SELECT
    count(*),
    COALESCE(sum(weight), 0),
    COALESCE(sum(weight) FILTER (WHERE signal = 'supports'), 0),
    COALESCE(jsonb_agg(jsonb_build_object(
      'sourceId', source_id,
      'sourceType', source_type,
      'version', '1',
      'capturedAt', COALESCE(occurred_at, created_at),
      'confidence', weight,
      'provenance', source_type,
      'label', source_label,
      'independenceFingerprint', participant_fingerprint,
      'verificationMode', verification_mode
    ) ORDER BY created_at), '[]'::jsonb)
  INTO v_signal_count, v_weighted_total, v_weighted_support, v_sources
  FROM public.validation_sprint_evidence
  WHERE sprint_id = p_sprint_id AND user_id = v_user_id;

  v_score := CASE WHEN v_weighted_total > 0 THEN round((v_weighted_support / v_weighted_total) * 100, 2) ELSE 0 END;
  v_grade := CASE
    WHEN v_signal_count >= 25 THEN 'decision_grade'
    WHEN v_signal_count >= 10 THEN 'emerging'
    WHEN v_signal_count >= 5 THEN 'directional'
    ELSE 'insufficient'
  END;
  v_recommendation := CASE
    WHEN v_signal_count < 5 THEN 'collect_more_evidence'
    WHEN v_score >= 75 THEN 'build'
    WHEN v_score >= 60 THEN 'narrow'
    WHEN v_score >= 40 THEN 'pivot'
    ELSE 'stop'
  END;

  IF p_override_decision IS NOT NULL THEN
    IF p_override_decision NOT IN ('build', 'narrow', 'pivot', 'stop', 'collect_more_evidence') THEN
      RAISE EXCEPTION 'Invalid override decision';
    END IF;
    v_override := p_override_decision IS DISTINCT FROM v_recommendation;
    IF v_override AND length(trim(COALESCE(p_override_rationale, ''))) < 12 THEN
      RAISE EXCEPTION 'Explain the override in at least 12 characters';
    END IF;
    v_decision := p_override_decision;
  ELSE
    v_decision := v_recommendation;
  END IF;

  v_status := CASE
    WHEN v_signal_count >= 25 AND NOT v_override THEN 'verified'
    WHEN v_signal_count >= 5 THEN 'ready'
    ELSE 'draft'
  END;
  v_verification_mode := CASE
    WHEN v_status = 'verified' THEN 'corroborated'
    WHEN v_override THEN 'founder_reported'
    ELSE 'founder_reported'
  END;
  v_next_experiment := CASE v_decision
    WHEN 'build' THEN CASE WHEN v_status = 'verified'
      THEN 'Carry the evidence-backed build brief into MVP Builder.'
      ELSE 'Collect decision-grade evidence before treating Build as verified.' END
    WHEN 'narrow' THEN 'Interview five people in the strongest supported sub-segment.'
    WHEN 'pivot' THEN 'Test the highest-urgency alternative problem with five new conversations.'
    WHEN 'stop' THEN 'Document the stopping evidence and choose a new customer problem.'
    ELSE 'Add enough independent evidence to reach the next confidence threshold.'
  END;

  INSERT INTO public.journey_outcomes (
    user_id, tool, stage, artifact_type, artifact_id, status,
    quality_checks, evidence_manifest, completion_score, evaluation_version,
    verification_mode, last_evaluated_at, completed_at, verified_at
  ) VALUES (
    v_user_id, 'pmf_lab', 'validation', 'pmf_decision_report', p_sprint_id::text, v_status,
    jsonb_build_object(
      'report_generated', v_signal_count >= 5,
      'decision_present', v_decision <> 'collect_more_evidence',
      'weighted_sources_present', v_signal_count > 0,
      'directional_signals', v_signal_count >= 5,
      'duplicates_removed', true,
      'decision_grade', v_signal_count >= 25 AND NOT v_override,
      'signal_count', v_signal_count,
      'weighted_score', v_score,
      'decision', v_decision,
      'recommendation', v_recommendation,
      'override', v_override,
      '_evaluation', jsonb_build_object(
        'evaluatorVersion', 'validation-sprint-1',
        'completionScore', LEAST(100, round((v_signal_count::numeric / 25) * 100)),
        'status', v_status,
        'verificationMode', v_verification_mode,
        'warnings', CASE WHEN v_signal_count < 25
          THEN jsonb_build_array('Collect twenty-five independent weighted signals for a decision-grade result.')
          ELSE '[]'::jsonb END,
        'nextAction', v_next_experiment
      )
    ),
    jsonb_build_object('version', 2, 'generatedAt', now(), 'sources', v_sources),
    LEAST(100, round((v_signal_count::numeric / 25) * 100)),
    'validation-sprint-1',
    v_verification_mode,
    now(),
    CASE WHEN v_status <> 'draft' THEN now() ELSE NULL END,
    CASE WHEN v_status = 'verified' THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id, tool, artifact_type, artifact_id) DO UPDATE SET
    status = EXCLUDED.status,
    quality_checks = EXCLUDED.quality_checks,
    evidence_manifest = EXCLUDED.evidence_manifest,
    completion_score = EXCLUDED.completion_score,
    evaluation_version = EXCLUDED.evaluation_version,
    verification_mode = EXCLUDED.verification_mode,
    last_evaluated_at = EXCLUDED.last_evaluated_at,
    completed_at = EXCLUDED.completed_at,
    verified_at = EXCLUDED.verified_at,
    updated_at = now()
  RETURNING * INTO v_outcome;

  UPDATE public.validation_sprints SET
    status = CASE
      WHEN v_status = 'verified' AND v_decision = 'build' THEN 'completed'
      WHEN v_signal_count >= 5 THEN 'decision_ready'
      ELSE 'gathering_evidence'
    END,
    current_step = CASE WHEN v_signal_count >= 5 THEN 4 ELSE GREATEST(current_step, 3) END,
    pmf_outcome_id = v_outcome.id,
    evidence_grade = v_grade,
    recommendation = v_recommendation,
    decision = v_decision,
    override_rationale = CASE WHEN v_override THEN trim(p_override_rationale) ELSE NULL END,
    next_experiment = v_next_experiment,
    completed_at = CASE WHEN v_status = 'verified' AND v_decision = 'build' THEN now() ELSE NULL END
  WHERE id = p_sprint_id AND user_id = v_user_id;

  IF v_status = 'verified' AND v_decision = 'build' THEN
    SELECT id INTO v_version_id
    FROM public.journey_outcome_versions
    WHERE journey_outcome_id = v_outcome.id
    ORDER BY version_number DESC LIMIT 1;

    IF v_version_id IS NOT NULL THEN
      INSERT INTO public.journey_handoffs (
        user_id, source_outcome_id, source_version_id, destination_tool,
        payload, status, idempotency_key
      ) VALUES (
        v_user_id, v_outcome.id, v_version_id, 'mvp_builder',
        jsonb_build_object(
          'sourceArtifactId', p_sprint_id::text,
          'decision', v_decision,
          'evidenceGrade', v_grade,
          'hypothesis', v_sprint.hypothesis,
          'primarySegment', v_sprint.primary_segment,
          'destinationRoute', '/mvp-builder'
        ),
        'pending',
        'validation-sprint:' || p_sprint_id::text || ':mvp'
      )
      ON CONFLICT (user_id, idempotency_key) DO UPDATE SET
        source_version_id = EXCLUDED.source_version_id,
        payload = EXCLUDED.payload,
        status = CASE WHEN public.journey_handoffs.status = 'consumed' THEN 'consumed' ELSE 'pending' END,
        updated_at = now();
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'sprintId', p_sprint_id,
    'outcomeId', v_outcome.id,
    'status', v_status,
    'verificationMode', v_verification_mode,
    'signalCount', v_signal_count,
    'evidenceGrade', v_grade,
    'weightedScore', v_score,
    'recommendation', v_recommendation,
    'decision', v_decision,
    'wasOverridden', v_override,
    'nextExperiment', v_next_experiment,
    'recommendedNextRoute', CASE
      WHEN v_status = 'verified' AND v_decision = 'build' THEN '/mvp-builder'
      ELSE '/validation-sprint'
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_validation_sprint_v1(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_validation_sprint_v1(uuid, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_founder_outcome_snapshot_v1()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_outcomes jsonb;
  v_stages jsonb;
  v_sprint jsonb;
  v_handoffs jsonb;
  v_current_stage text := 'IDENTITY';
  v_next_route text := '/validation-sprint';
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  WITH tools(tool, stage, ordinal) AS (
    VALUES
      ('icp_builder', 'identity', 1),
      ('demo_studio', 'prototype', 2),
      ('pmf_lab', 'validation', 3),
      ('mvp_builder', 'building', 4),
      ('gtm_strategist', 'launch', 5),
      ('traction_engine', 'traction', 6)
  ),
  latest AS (
    SELECT DISTINCT ON (outcome.tool)
      outcome.*
    FROM public.journey_outcomes outcome
    WHERE outcome.user_id = v_user_id
    ORDER BY outcome.tool, outcome.updated_at DESC, outcome.id DESC
  )
  SELECT jsonb_object_agg(tools.tool, jsonb_build_object(
    'tool', tools.tool,
    'stage', tools.stage,
    'status', COALESCE(latest.status, 'not_started'),
    'completionScore', latest.completion_score,
    'verificationMode', COALESCE(latest.verification_mode, 'unverified'),
    'warnings', COALESCE(latest.quality_checks#>'{_evaluation,warnings}', '[]'::jsonb),
    'nextAction', latest.quality_checks#>>'{_evaluation,nextAction}',
    'artifactType', latest.artifact_type,
    'artifactId', latest.artifact_id,
    'outcomeId', latest.id,
    'updatedAt', latest.updated_at,
    'completedAt', latest.completed_at,
    'decision', latest.quality_checks->>'decision',
    'evidenceGrade', CASE
      WHEN latest.tool = 'pmf_lab' AND COALESCE((latest.quality_checks->>'signal_count')::integer, 0) >= 25 THEN 'decision_grade'
      WHEN latest.tool = 'pmf_lab' AND COALESCE((latest.quality_checks->>'signal_count')::integer, 0) >= 10 THEN 'emerging'
      WHEN latest.tool = 'pmf_lab' AND COALESCE((latest.quality_checks->>'signal_count')::integer, 0) >= 5 THEN 'directional'
      WHEN latest.tool = 'pmf_lab' THEN 'insufficient'
      ELSE NULL
    END
  ) ORDER BY tools.ordinal)
  INTO v_outcomes
  FROM tools LEFT JOIN latest ON latest.tool = tools.tool;

  SELECT jsonb_object_agg(stage_name, jsonb_build_object(
    'status', outcome_data->>'status',
    'completed', (outcome_data->>'status') IN ('ready', 'verified', 'reviewed'),
    'verified', (outcome_data->>'status') IN ('verified', 'reviewed'),
    'completedAt', outcome_data->>'completedAt',
    'outcomeId', outcome_data->>'outcomeId'
  ))
  INTO v_stages
  FROM (
    VALUES
      ('identity', v_outcomes->'icp_builder'),
      ('prototype', v_outcomes->'demo_studio'),
      ('validation', v_outcomes->'pmf_lab'),
      ('building', v_outcomes->'mvp_builder'),
      ('launch', v_outcomes->'gtm_strategist'),
      ('traction', v_outcomes->'traction_engine')
  ) mapped(stage_name, outcome_data);

  SELECT to_jsonb(sprint) INTO v_sprint
  FROM (
    SELECT id, status, hypothesis, primary_segment, current_step, icp_outcome_id,
      pmf_outcome_id, decision, recommendation, evidence_grade, credit_spend_total,
      next_experiment, started_at, completed_at, updated_at
    FROM public.validation_sprints
    WHERE user_id = v_user_id AND status <> 'abandoned'
    ORDER BY
      CASE WHEN status IN ('started', 'customer_defined', 'sourcing', 'gathering_evidence', 'decision_ready') THEN 0 ELSE 1 END,
      updated_at DESC
    LIMIT 1
  ) sprint;

  SELECT COALESCE(jsonb_object_agg(destination_tool, handoff), '{}'::jsonb)
  INTO v_handoffs
  FROM (
    SELECT DISTINCT ON (handoff.destination_tool)
      handoff.destination_tool,
      jsonb_build_object(
        'id', handoff.id,
        'status', handoff.status,
        'sourceOutcomeId', handoff.source_outcome_id,
        'sourceVersionId', handoff.source_version_id,
        'consumedArtifactId', handoff.consumed_artifact_id,
        'createdAt', handoff.created_at
      ) AS handoff
    FROM public.journey_handoffs handoff
    WHERE handoff.user_id = v_user_id
    ORDER BY handoff.destination_tool, handoff.created_at DESC
  ) latest_handoffs;

  v_current_stage := CASE
    WHEN v_sprint IS NOT NULL
      AND v_sprint->>'status' IN ('started', 'customer_defined', 'sourcing', 'gathering_evidence', 'decision_ready')
      THEN 'VALIDATING'
    WHEN v_outcomes#>>'{pmf_lab,status}' IN ('verified', 'reviewed')
      AND v_outcomes#>>'{pmf_lab,decision}' = 'build'
      AND v_outcomes#>>'{mvp_builder,status}' NOT IN ('ready', 'verified', 'reviewed') THEN 'BUILDING'
    WHEN v_outcomes#>>'{icp_builder,status}' NOT IN ('ready', 'verified', 'reviewed') THEN 'IDENTITY'
    WHEN v_outcomes#>>'{pmf_lab,status}' NOT IN ('ready', 'verified', 'reviewed') THEN 'VALIDATING'
    WHEN v_outcomes#>>'{mvp_builder,status}' NOT IN ('ready', 'verified', 'reviewed') THEN 'BUILDING'
    WHEN v_outcomes#>>'{gtm_strategist,status}' NOT IN ('ready', 'verified', 'reviewed') THEN 'LAUNCH'
    ELSE 'TRACTION'
  END;

  v_next_route := CASE
    WHEN v_sprint IS NOT NULL
      AND v_sprint->>'status' IN ('started', 'customer_defined', 'sourcing', 'gathering_evidence', 'decision_ready')
      THEN '/validation-sprint'
    WHEN v_outcomes#>>'{pmf_lab,status}' IN ('verified', 'reviewed')
      AND v_outcomes#>>'{pmf_lab,decision}' = 'build' THEN '/mvp-builder'
    WHEN v_outcomes#>>'{icp_builder,status}' NOT IN ('ready', 'verified', 'reviewed') THEN '/validation-sprint'
    WHEN v_outcomes#>>'{pmf_lab,status}' NOT IN ('ready', 'verified', 'reviewed') THEN '/validation-sprint'
    WHEN v_outcomes#>>'{mvp_builder,status}' NOT IN ('ready', 'verified', 'reviewed') THEN '/mvp-builder'
    WHEN v_outcomes#>>'{gtm_strategist,status}' NOT IN ('ready', 'verified', 'reviewed') THEN '/go-to-market'
    ELSE '/traction-engine'
  END;

  RETURN jsonb_build_object(
    'version', 1,
    'generatedAt', now(),
    'outcomes', COALESCE(v_outcomes, '{}'::jsonb),
    'stages', COALESCE(v_stages, '{}'::jsonb),
    'validationSprint', v_sprint,
    'recommendedNextRoute', v_next_route,
    'currentStage', v_current_stage,
    'handoffs', COALESCE(v_handoffs, '{}'::jsonb),
    'capitalOptional', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_founder_outcome_snapshot_v1() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_founder_outcome_snapshot_v1() TO authenticated, service_role;

COMMENT ON TABLE public.validation_sprints IS
  'Persistent four-step evidence-to-decision workflow for first-time founders.';
COMMENT ON TABLE public.validation_sprint_evidence IS
  'Deduplicated evidence signals with explicit provenance and verification mode.';
COMMENT ON FUNCTION public.get_founder_outcome_snapshot_v1() IS
  'Single authenticated read model for dashboard progress, recommendations, sprint state, and version-pinned handoffs.';
