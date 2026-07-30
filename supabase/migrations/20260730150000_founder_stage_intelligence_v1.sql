-- Evidence-backed, confidence-aware founder stage intelligence.
-- Operating maturity remains stages 1-6. Fundraising is a parallel capital motion.

CREATE TABLE IF NOT EXISTS public.founder_stage_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_key text NOT NULL CHECK (length(evidence_key) BETWEEN 1 AND 160),
  evidence_type text NOT NULL CHECK (evidence_type IN (
    'product_state',
    'customer_signal',
    'market_commitment',
    'live_product',
    'repeatable_growth',
    'capital_motion',
    'boundary_answer',
    'user_correction'
  )),
  source_type text NOT NULL CHECK (source_type IN (
    'self_report',
    'artifact',
    'platform',
    'external',
    'boundary_answer',
    'user_correction'
  )),
  stage_supported integer CHECK (stage_supported IS NULL OR stage_supported BETWEEN 1 AND 6),
  reliability numeric(4,3) NOT NULL CHECK (reliability BETWEEN 0 AND 1),
  source_entity_type text,
  source_entity_id text,
  observed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, evidence_key)
);

CREATE INDEX IF NOT EXISTS founder_stage_evidence_user_stage_idx
  ON public.founder_stage_evidence (user_id, stage_supported, observed_at DESC)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS founder_stage_evidence_source_idx
  ON public.founder_stage_evidence (user_id, source_type, source_entity_type, source_entity_id);

ALTER TABLE public.founder_stage_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own founder stage evidence" ON public.founder_stage_evidence;
CREATE POLICY "Users read own founder stage evidence"
  ON public.founder_stage_evidence FOR SELECT
  USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.founder_stage_evidence FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.founder_stage_evidence TO authenticated;
GRANT ALL ON TABLE public.founder_stage_evidence TO service_role;

DROP TRIGGER IF EXISTS set_founder_stage_evidence_updated_at ON public.founder_stage_evidence;
CREATE TRIGGER set_founder_stage_evidence_updated_at
  BEFORE UPDATE ON public.founder_stage_evidence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.founder_stage_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_stage integer NOT NULL DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 6),
  candidate_stage integer NOT NULL DEFAULT 1 CHECK (candidate_stage BETWEEN 1 AND 6),
  runner_up_stage integer CHECK (runner_up_stage IS NULL OR runner_up_stage BETWEEN 1 AND 6),
  score_margin numeric NOT NULL DEFAULT 0 CHECK (score_margin >= 0),
  confidence_score integer NOT NULL DEFAULT 50 CHECK (confidence_score BETWEEN 0 AND 100),
  confidence_band text NOT NULL DEFAULT 'low' CHECK (confidence_band IN ('low', 'medium', 'high')),
  evidence_coverage numeric(4,3) NOT NULL DEFAULT 0 CHECK (evidence_coverage BETWEEN 0 AND 1),
  capital_motion text NOT NULL DEFAULT 'inactive' CHECK (capital_motion IN ('inactive', 'preparing', 'active')),
  capital_evidence boolean NOT NULL DEFAULT false,
  rationale_codes text[] NOT NULL DEFAULT '{}',
  model_version text NOT NULL DEFAULT 'stage_evidence_v1',
  candidate_since timestamptz NOT NULL DEFAULT now(),
  last_transition_at timestamptz,
  last_evaluated_at timestamptz NOT NULL DEFAULT now(),
  stage_stale boolean NOT NULL DEFAULT false,
  user_confirmed_stage integer CHECK (user_confirmed_stage IS NULL OR user_confirmed_stage BETWEEN 1 AND 6),
  user_confirmed_at timestamptz,
  user_override_stage integer CHECK (user_override_stage IS NULL OR user_override_stage BETWEEN 1 AND 6),
  user_override_until timestamptz,
  correction_reason text CHECK (correction_reason IS NULL OR correction_reason IN (
    'product_state',
    'customer_evidence',
    'traction_evidence',
    'stage_definition',
    'capital_is_separate'
  )),
  boundary_question_key text,
  boundary_answer text CHECK (boundary_answer IS NULL OR boundary_answer IN ('lower', 'upper')),
  boundary_answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.founder_stage_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own founder stage state" ON public.founder_stage_state;
CREATE POLICY "Users read own founder stage state"
  ON public.founder_stage_state FOR SELECT
  USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.founder_stage_state FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.founder_stage_state TO authenticated;
GRANT ALL ON TABLE public.founder_stage_state TO service_role;

DROP TRIGGER IF EXISTS set_founder_stage_state_updated_at ON public.founder_stage_state;
CREATE TRIGGER set_founder_stage_state_updated_at
  BEFORE UPDATE ON public.founder_stage_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.founder_stage_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_key text NOT NULL CHECK (length(assessment_key) BETWEEN 1 AND 200),
  model_version text NOT NULL DEFAULT 'stage_evidence_v1',
  assigned_stage integer NOT NULL CHECK (assigned_stage BETWEEN 1 AND 6),
  candidate_stage integer NOT NULL CHECK (candidate_stage BETWEEN 1 AND 6),
  runner_up_stage integer CHECK (runner_up_stage IS NULL OR runner_up_stage BETWEEN 1 AND 6),
  confidence_score integer NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
  confidence_band text NOT NULL CHECK (confidence_band IN ('low', 'medium', 'high')),
  score_margin numeric NOT NULL DEFAULT 0 CHECK (score_margin >= 0),
  evidence_coverage numeric(4,3) NOT NULL DEFAULT 0 CHECK (evidence_coverage BETWEEN 0 AND 1),
  capital_motion text NOT NULL CHECK (capital_motion IN ('inactive', 'preparing', 'active')),
  rationale_codes text[] NOT NULL DEFAULT '{}',
  trigger text NOT NULL CHECK (length(trigger) BETWEEN 1 AND 80),
  confirmed_stage integer CHECK (confirmed_stage IS NULL OR confirmed_stage BETWEEN 1 AND 6),
  confirmation_result text CHECK (confirmation_result IS NULL OR confirmation_result IN ('confirmed', 'corrected', 'boundary_resolved')),
  correction_reason text,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, assessment_key)
);

CREATE INDEX IF NOT EXISTS founder_stage_assessments_calibration_idx
  ON public.founder_stage_assessments (model_version, confidence_band, created_at DESC);

ALTER TABLE public.founder_stage_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own founder stage assessments" ON public.founder_stage_assessments;
CREATE POLICY "Users read own founder stage assessments"
  ON public.founder_stage_assessments FOR SELECT
  USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.founder_stage_assessments FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.founder_stage_assessments TO authenticated;
GRANT ALL ON TABLE public.founder_stage_assessments TO service_role;

CREATE OR REPLACE FUNCTION public.record_founder_stage_evidence_v1(
  p_evidence_key text,
  p_evidence_type text,
  p_source_type text,
  p_stage_supported integer DEFAULT NULL,
  p_reliability numeric DEFAULT 0.5,
  p_source_entity_type text DEFAULT NULL,
  p_source_entity_id text DEFAULT NULL,
  p_observed_at timestamptz DEFAULT now(),
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.founder_stage_evidence
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_row public.founder_stage_evidence;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF length(trim(COALESCE(p_evidence_key, ''))) NOT BETWEEN 1 AND 160 THEN
    RAISE EXCEPTION 'Invalid evidence key' USING ERRCODE = '22023';
  END IF;
  IF p_evidence_type NOT IN (
    'product_state', 'customer_signal', 'market_commitment', 'live_product',
    'repeatable_growth', 'capital_motion', 'boundary_answer', 'user_correction'
  ) THEN
    RAISE EXCEPTION 'Invalid evidence type' USING ERRCODE = '22023';
  END IF;
  IF p_source_type NOT IN (
    'self_report', 'artifact', 'platform', 'external', 'boundary_answer', 'user_correction'
  ) THEN
    RAISE EXCEPTION 'Invalid evidence source' USING ERRCODE = '22023';
  END IF;
  IF p_stage_supported IS NOT NULL AND p_stage_supported NOT BETWEEN 1 AND 6 THEN
    RAISE EXCEPTION 'Invalid operating stage' USING ERRCODE = '22023';
  END IF;
  IF p_reliability < 0 OR p_reliability > 1 THEN
    RAISE EXCEPTION 'Invalid reliability' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(COALESCE(p_metadata, 'null'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'Metadata must be an object' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.founder_stage_evidence (
    user_id, evidence_key, evidence_type, source_type, stage_supported,
    reliability, source_entity_type, source_entity_id, observed_at, metadata
  ) VALUES (
    v_user, trim(p_evidence_key), p_evidence_type, p_source_type, p_stage_supported,
    p_reliability, NULLIF(trim(p_source_entity_type), ''), NULLIF(trim(p_source_entity_id), ''),
    COALESCE(p_observed_at, now()), p_metadata
  )
  ON CONFLICT (user_id, evidence_key) DO UPDATE SET
    evidence_type = EXCLUDED.evidence_type,
    source_type = EXCLUDED.source_type,
    stage_supported = EXCLUDED.stage_supported,
    reliability = EXCLUDED.reliability,
    source_entity_type = EXCLUDED.source_entity_type,
    source_entity_id = EXCLUDED.source_entity_id,
    observed_at = EXCLUDED.observed_at,
    metadata = EXCLUDED.metadata,
    active = true
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_founder_stage_state_v1(
  p_candidate_stage integer,
  p_runner_up_stage integer,
  p_score_margin numeric,
  p_confidence_score integer,
  p_confidence_band text,
  p_evidence_coverage numeric,
  p_capital_motion text,
  p_capital_evidence boolean,
  p_rationale_codes text[],
  p_trigger text,
  p_boundary_question_key text DEFAULT NULL
)
RETURNS public.founder_stage_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_state public.founder_stage_state;
  v_support_count integer := 0;
  v_verified_count integer := 0;
  v_next_stage integer;
  v_transitioned boolean := false;
  v_candidate_changed boolean := false;
  v_assessment_key text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_candidate_stage NOT BETWEEN 1 AND 6
    OR (p_runner_up_stage IS NOT NULL AND p_runner_up_stage NOT BETWEEN 1 AND 6) THEN
    RAISE EXCEPTION 'Invalid operating stage' USING ERRCODE = '22023';
  END IF;
  IF p_confidence_score NOT BETWEEN 0 AND 100
    OR p_confidence_band NOT IN ('low', 'medium', 'high')
    OR p_evidence_coverage < 0 OR p_evidence_coverage > 1
    OR p_capital_motion NOT IN ('inactive', 'preparing', 'active') THEN
    RAISE EXCEPTION 'Invalid stage assessment' USING ERRCODE = '22023';
  END IF;
  IF length(trim(COALESCE(p_trigger, ''))) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'Invalid assessment trigger' USING ERRCODE = '22023';
  END IF;

  SELECT
    count(*) FILTER (WHERE stage_supported = p_candidate_stage),
    count(*) FILTER (
      WHERE stage_supported = p_candidate_stage
        AND reliability >= 0.8
        AND source_type IN ('platform', 'external', 'artifact', 'user_correction')
    )
  INTO v_support_count, v_verified_count
  FROM public.founder_stage_evidence
  WHERE user_id = v_user
    AND active = true
    AND (expires_at IS NULL OR expires_at > now());

  SELECT * INTO v_state
  FROM public.founder_stage_state
  WHERE user_id = v_user
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.founder_stage_state (
      user_id, current_stage, candidate_stage, runner_up_stage, score_margin,
      confidence_score, confidence_band, evidence_coverage, capital_motion,
      capital_evidence, rationale_codes, boundary_question_key, last_transition_at
    ) VALUES (
      v_user, p_candidate_stage, p_candidate_stage, p_runner_up_stage,
      GREATEST(0, COALESCE(p_score_margin, 0)), p_confidence_score,
      p_confidence_band, p_evidence_coverage, p_capital_motion,
      COALESCE(p_capital_evidence, false), COALESCE(p_rationale_codes, '{}'),
      p_boundary_question_key, now()
    )
    RETURNING * INTO v_state;
    v_transitioned := true;
  ELSE
    v_candidate_changed := v_state.candidate_stage <> p_candidate_stage;
    v_next_stage := v_state.current_stage;

    IF v_state.user_override_stage IS NOT NULL
      AND v_state.user_override_until IS NOT NULL
      AND v_state.user_override_until > now() THEN
      v_next_stage := v_state.user_override_stage;
    ELSIF p_candidate_stage > v_state.current_stage
      AND (v_verified_count >= 1 OR v_support_count >= 2) THEN
      v_next_stage := p_candidate_stage;
      v_transitioned := true;
    END IF;

    UPDATE public.founder_stage_state
    SET
      current_stage = v_next_stage,
      candidate_stage = p_candidate_stage,
      runner_up_stage = p_runner_up_stage,
      score_margin = GREATEST(0, COALESCE(p_score_margin, 0)),
      confidence_score = p_confidence_score,
      confidence_band = p_confidence_band,
      evidence_coverage = p_evidence_coverage,
      capital_motion = p_capital_motion,
      capital_evidence = COALESCE(p_capital_evidence, false),
      rationale_codes = COALESCE(p_rationale_codes, '{}'),
      candidate_since = CASE WHEN v_candidate_changed THEN now() ELSE candidate_since END,
      last_transition_at = CASE WHEN v_transitioned THEN now() ELSE last_transition_at END,
      last_evaluated_at = now(),
      stage_stale = p_candidate_stage < v_next_stage,
      boundary_question_key = p_boundary_question_key
    WHERE user_id = v_user
    RETURNING * INTO v_state;
  END IF;

  UPDATE public.profiles
  SET
    assigned_stage = v_state.current_stage,
    user_preferences = COALESCE(user_preferences, '{}'::jsonb) || jsonb_build_object(
      'founderStage', v_state.current_stage,
      'founderStageCandidate', v_state.candidate_stage,
      'founderStageConfidenceBand', v_state.confidence_band,
      'capitalMotion', v_state.capital_motion,
      'stageModelVersion', v_state.model_version
    ),
    updated_at = now()
  WHERE id = v_user;

  v_assessment_key := concat_ws(
    ':',
    v_state.model_version,
    p_trigger,
    v_state.current_stage,
    v_state.candidate_stage,
    to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD')
  );

  INSERT INTO public.founder_stage_assessments (
    user_id, assessment_key, model_version, assigned_stage, candidate_stage,
    runner_up_stage, confidence_score, confidence_band, score_margin,
    evidence_coverage, capital_motion, rationale_codes, trigger
  ) VALUES (
    v_user, v_assessment_key, v_state.model_version, v_state.current_stage,
    v_state.candidate_stage, v_state.runner_up_stage, v_state.confidence_score,
    v_state.confidence_band, v_state.score_margin, v_state.evidence_coverage,
    v_state.capital_motion, v_state.rationale_codes, left(p_trigger, 80)
  )
  ON CONFLICT (user_id, assessment_key) DO UPDATE SET
    assigned_stage = EXCLUDED.assigned_stage,
    candidate_stage = EXCLUDED.candidate_stage,
    runner_up_stage = EXCLUDED.runner_up_stage,
    confidence_score = EXCLUDED.confidence_score,
    confidence_band = EXCLUDED.confidence_band,
    score_margin = EXCLUDED.score_margin,
    evidence_coverage = EXCLUDED.evidence_coverage,
    capital_motion = EXCLUDED.capital_motion,
    rationale_codes = EXCLUDED.rationale_codes;

  RETURN v_state;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_founder_stage_v1(
  p_confirmed_stage integer,
  p_reason text DEFAULT 'stage_definition'
)
RETURNS public.founder_stage_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_state public.founder_stage_state;
  v_result text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_confirmed_stage NOT BETWEEN 1 AND 6 THEN
    RAISE EXCEPTION 'Invalid operating stage' USING ERRCODE = '22023';
  END IF;
  IF p_reason NOT IN (
    'product_state', 'customer_evidence', 'traction_evidence',
    'stage_definition', 'capital_is_separate'
  ) THEN
    RAISE EXCEPTION 'Invalid correction reason' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_state
  FROM public.founder_stage_state
  WHERE user_id = v_user
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Founder stage state not found' USING ERRCODE = 'P0002';
  END IF;

  v_result := CASE WHEN p_confirmed_stage = v_state.current_stage THEN 'confirmed' ELSE 'corrected' END;

  UPDATE public.founder_stage_state
  SET
    current_stage = p_confirmed_stage,
    candidate_stage = p_confirmed_stage,
    user_confirmed_stage = p_confirmed_stage,
    user_confirmed_at = now(),
    user_override_stage = CASE WHEN v_result = 'corrected' THEN p_confirmed_stage ELSE user_override_stage END,
    user_override_until = CASE WHEN v_result = 'corrected' THEN now() + interval '90 days' ELSE user_override_until END,
    correction_reason = p_reason,
    rationale_codes = ARRAY['user_correction'] || array_remove(rationale_codes, 'user_correction'),
    stage_stale = false,
    last_transition_at = CASE WHEN v_result = 'corrected' THEN now() ELSE last_transition_at END
  WHERE user_id = v_user
  RETURNING * INTO v_state;

  INSERT INTO public.founder_stage_evidence (
    user_id, evidence_key, evidence_type, source_type, stage_supported,
    reliability, observed_at, metadata
  ) VALUES (
    v_user,
    'user-correction:' || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS'),
    'user_correction',
    'user_correction',
    p_confirmed_stage,
    0.95,
    now(),
    jsonb_build_object('reason', p_reason, 'result', v_result)
  );

  UPDATE public.founder_stage_assessments
  SET
    confirmed_stage = p_confirmed_stage,
    confirmation_result = v_result,
    correction_reason = p_reason,
    confirmed_at = now()
  WHERE id = (
    SELECT id
    FROM public.founder_stage_assessments
    WHERE user_id = v_user AND confirmed_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  );

  UPDATE public.profiles
  SET
    assigned_stage = p_confirmed_stage,
    user_preferences = COALESCE(user_preferences, '{}'::jsonb) || jsonb_build_object(
      'founderStage', p_confirmed_stage,
      'founderStageConfirmedAt', now(),
      'founderStageCorrectionReason', p_reason
    ),
    updated_at = now()
  WHERE id = v_user;

  INSERT INTO public.user_activity_log (
    user_id, activity_type, activity_data, page_path,
    source_tool, source_entity_type, source_entity_id, event_key
  ) VALUES (
    v_user,
    'founder_stage_confirmed',
    jsonb_build_object(
      'assigned_stage', v_state.current_stage,
      'confirmation_result', v_result,
      'reason', p_reason,
      'model_version', v_state.model_version
    ),
    '/dashboard',
    'dashboard',
    'founder_stage_state',
    v_user::text,
    'founder-stage-confirmed:' || extract(epoch FROM now())::text
  );

  RETURN v_state;
END;
$$;

CREATE OR REPLACE FUNCTION public.answer_founder_stage_boundary_v1(
  p_question_key text,
  p_answer text,
  p_supported_stage integer
)
RETURNS public.founder_stage_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_state public.founder_stage_state;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_question_key NOT IN (
    'stage-boundary-1-2', 'stage-boundary-2-3', 'stage-boundary-3-4',
    'stage-boundary-4-5', 'stage-boundary-5-6'
  ) OR p_answer NOT IN ('lower', 'upper') OR p_supported_stage NOT BETWEEN 1 AND 6 THEN
    RAISE EXCEPTION 'Invalid boundary answer' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_state
  FROM public.founder_stage_state
  WHERE user_id = v_user
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Founder stage state not found' USING ERRCODE = 'P0002';
  END IF;
  IF abs(p_supported_stage - v_state.current_stage) > 1
    AND abs(p_supported_stage - v_state.candidate_stage) > 1 THEN
    RAISE EXCEPTION 'Boundary answer is not adjacent to the current assessment' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.founder_stage_evidence (
    user_id, evidence_key, evidence_type, source_type, stage_supported,
    reliability, observed_at, metadata
  ) VALUES (
    v_user,
    'boundary:' || p_question_key,
    'boundary_answer',
    'boundary_answer',
    p_supported_stage,
    0.72,
    now(),
    jsonb_build_object('question_key', p_question_key, 'answer', p_answer)
  )
  ON CONFLICT (user_id, evidence_key) DO UPDATE SET
    stage_supported = EXCLUDED.stage_supported,
    observed_at = EXCLUDED.observed_at,
    metadata = EXCLUDED.metadata,
    active = true;

  UPDATE public.founder_stage_state
  SET
    current_stage = p_supported_stage,
    candidate_stage = p_supported_stage,
    boundary_question_key = p_question_key,
    boundary_answer = p_answer,
    boundary_answered_at = now(),
    stage_stale = false,
    last_transition_at = CASE WHEN current_stage <> p_supported_stage THEN now() ELSE last_transition_at END
  WHERE user_id = v_user
  RETURNING * INTO v_state;

  UPDATE public.founder_stage_assessments
  SET
    confirmed_stage = p_supported_stage,
    confirmation_result = 'boundary_resolved',
    correction_reason = p_question_key,
    confirmed_at = now()
  WHERE id = (
    SELECT id
    FROM public.founder_stage_assessments
    WHERE user_id = v_user AND confirmed_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  );

  UPDATE public.profiles
  SET assigned_stage = p_supported_stage, updated_at = now()
  WHERE id = v_user;

  RETURN v_state;
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_onboarding_stage_intelligence_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage integer;
  v_evidence_state text;
  v_capital_motion text;
BEGIN
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'completed' THEN
      RETURN NEW;
    END IF;
  END IF;

  v_stage := LEAST(6, GREATEST(1, COALESCE(
    CASE
      WHEN NEW.derived_context->>'operatingStage' ~ '^[1-6]$'
        THEN (NEW.derived_context->>'operatingStage')::integer
      ELSE NULL
    END,
    CASE
      WHEN NEW.derived_context->>'assignedStage' ~ '^[1-7]$'
        THEN LEAST(6, (NEW.derived_context->>'assignedStage')::integer)
      ELSE NULL
    END,
    1
  )));
  v_evidence_state := COALESCE(NEW.answers->>'evidenceState', 'none');
  v_capital_motion := CASE
    WHEN NEW.answers->>'fundraisingStatus' IN ('talking_investors', 'raising_now') THEN 'active'
    WHEN NEW.answers->>'fundraisingStatus' = 'preparing'
      OR NEW.answers->>'primaryGoal' = 'raise'
      OR NEW.answers->>'blocker' = 'fundraising' THEN 'preparing'
    ELSE 'inactive'
  END;

  INSERT INTO public.founder_stage_evidence (
    user_id, evidence_key, evidence_type, source_type, stage_supported,
    reliability, source_entity_type, source_entity_id, observed_at, metadata
  ) VALUES (
    NEW.user_id,
    'onboarding:' || NEW.id::text || ':evidence-state',
    CASE
      WHEN v_evidence_state = 'repeatable_growth' THEN 'repeatable_growth'
      WHEN v_evidence_state = 'payment' THEN 'market_commitment'
      WHEN v_evidence_state IN ('conversations', 'commitment') THEN 'customer_signal'
      ELSE 'product_state'
    END,
    'self_report',
    v_stage,
    0.45,
    'onboarding_session',
    NEW.id::text,
    COALESCE(NEW.completed_at, now()),
    jsonb_build_object('evidence_state', v_evidence_state)
  )
  ON CONFLICT (user_id, evidence_key) DO NOTHING;

  IF v_capital_motion <> 'inactive' THEN
    INSERT INTO public.founder_stage_evidence (
      user_id, evidence_key, evidence_type, source_type, stage_supported,
      reliability, source_entity_type, source_entity_id, observed_at, metadata
    ) VALUES (
      NEW.user_id,
      'onboarding:' || NEW.id::text || ':capital-motion',
      'capital_motion',
      'self_report',
      NULL,
      0.45,
      'onboarding_session',
      NEW.id::text,
      COALESCE(NEW.completed_at, now()),
      jsonb_build_object('capital_motion', v_capital_motion)
    )
    ON CONFLICT (user_id, evidence_key) DO NOTHING;
  END IF;

  INSERT INTO public.founder_stage_state (
    user_id, current_stage, candidate_stage, runner_up_stage, score_margin,
    confidence_score, confidence_band, evidence_coverage, capital_motion,
    capital_evidence, rationale_codes, last_transition_at
  ) VALUES (
    NEW.user_id,
    v_stage,
    v_stage,
    CASE
      WHEN NEW.derived_context->>'runnerUpStage' ~ '^[1-6]$'
        THEN (NEW.derived_context->>'runnerUpStage')::integer
      ELSE NULL
    END,
    GREATEST(0, COALESCE(
      CASE WHEN NEW.derived_context->>'stageScoreMargin' ~ '^[0-9]+([.][0-9]+)?$'
        THEN (NEW.derived_context->>'stageScoreMargin')::numeric END,
      0
    )),
    LEAST(100, GREATEST(0, COALESCE(
      CASE WHEN NEW.derived_context->>'stageConfidence' ~ '^[0-9]+$'
        THEN (NEW.derived_context->>'stageConfidence')::integer END,
      50
    ))),
    CASE WHEN NEW.derived_context->>'stageConfidenceBand' IN ('low', 'medium', 'high')
      THEN NEW.derived_context->>'stageConfidenceBand' ELSE 'medium' END,
    LEAST(1, GREATEST(0, COALESCE(
      CASE WHEN NEW.derived_context->>'stageEvidenceCoverage' ~ '^[0-9]+([.][0-9]+)?$'
        THEN (NEW.derived_context->>'stageEvidenceCoverage')::numeric END,
      0.667
    ))),
    v_capital_motion,
    COALESCE(
      CASE WHEN NEW.derived_context->>'capitalEvidence' IN ('true', 'false')
        THEN (NEW.derived_context->>'capitalEvidence')::boolean END,
      false
    ),
    ARRAY(
      SELECT jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(NEW.derived_context->'stageRationaleCodes') = 'array'
          THEN NEW.derived_context->'stageRationaleCodes'
          ELSE '[]'::jsonb
        END
      )
    ),
    COALESCE(NEW.completed_at, now())
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seed_onboarding_stage_intelligence ON public.onboarding_sessions;
CREATE TRIGGER seed_onboarding_stage_intelligence
  AFTER INSERT OR UPDATE OF status ON public.onboarding_sessions
  FOR EACH ROW EXECUTE FUNCTION public.seed_onboarding_stage_intelligence_v1();

-- Existing completed canonical sessions receive a stable starting state. Their
-- next dashboard visit will recompute richer candidate and confidence fields.
INSERT INTO public.founder_stage_state (
  user_id, current_stage, candidate_stage, confidence_score, confidence_band,
  evidence_coverage, capital_motion, capital_evidence, rationale_codes, last_transition_at
)
SELECT DISTINCT ON (s.user_id)
  s.user_id,
  LEAST(6, GREATEST(1, COALESCE(
    CASE WHEN s.derived_context->>'operatingStage' ~ '^[1-6]$'
      THEN (s.derived_context->>'operatingStage')::integer END,
    CASE WHEN s.derived_context->>'assignedStage' ~ '^[1-7]$'
      THEN LEAST(6, (s.derived_context->>'assignedStage')::integer) END,
    1
  ))),
  LEAST(6, GREATEST(1, COALESCE(
    CASE WHEN s.derived_context->>'operatingStage' ~ '^[1-6]$'
      THEN (s.derived_context->>'operatingStage')::integer END,
    CASE WHEN s.derived_context->>'assignedStage' ~ '^[1-7]$'
      THEN LEAST(6, (s.derived_context->>'assignedStage')::integer) END,
    1
  ))),
  LEAST(100, GREATEST(0, COALESCE(
    CASE WHEN s.derived_context->>'stageConfidence' ~ '^[0-9]+$'
      THEN (s.derived_context->>'stageConfidence')::integer END,
    50
  ))),
  CASE WHEN s.derived_context->>'stageConfidenceBand' IN ('low', 'medium', 'high')
    THEN s.derived_context->>'stageConfidenceBand' ELSE 'medium' END,
  LEAST(1, GREATEST(0, COALESCE(
    CASE WHEN s.derived_context->>'stageEvidenceCoverage' ~ '^[0-9]+([.][0-9]+)?$'
      THEN (s.derived_context->>'stageEvidenceCoverage')::numeric END,
    0.667
  ))),
  CASE
    WHEN s.answers->>'fundraisingStatus' IN ('talking_investors', 'raising_now') THEN 'active'
    WHEN s.answers->>'fundraisingStatus' = 'preparing'
      OR s.answers->>'primaryGoal' = 'raise'
      OR s.answers->>'blocker' = 'fundraising' THEN 'preparing'
    ELSE 'inactive'
  END,
  COALESCE(
    CASE WHEN s.derived_context->>'capitalEvidence' IN ('true', 'false')
      THEN (s.derived_context->>'capitalEvidence')::boolean END,
    false
  ),
  ARRAY(
    SELECT jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(s.derived_context->'stageRationaleCodes') = 'array'
        THEN s.derived_context->'stageRationaleCodes'
        ELSE '[]'::jsonb
      END
    )
  ),
  COALESCE(s.completed_at, s.updated_at)
FROM public.onboarding_sessions s
WHERE s.status = 'completed'
ORDER BY s.user_id, s.completed_at DESC NULLS LAST
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_founder_stage_accuracy_v1(
  p_from timestamptz DEFAULT now() - interval '90 days',
  p_to timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  WITH confirmed AS (
    SELECT DISTINCT ON (user_id) *
    FROM public.founder_stage_assessments
    WHERE confirmed_at >= p_from
      AND confirmed_at < p_to
      AND confirmed_stage IS NOT NULL
    ORDER BY user_id, confirmed_at DESC
  ),
  summary AS (
    SELECT
      count(*)::integer AS labeled,
      count(*) FILTER (WHERE assigned_stage = confirmed_stage)::integer AS exact,
      count(*) FILTER (WHERE abs(assigned_stage - confirmed_stage) <= 1)::integer AS adjacent,
      count(*) FILTER (WHERE assigned_stage > confirmed_stage)::integer AS overstaged,
      count(*) FILTER (WHERE assigned_stage < confirmed_stage)::integer AS understaged
    FROM confirmed
  ),
  bands AS (
    SELECT jsonb_agg(jsonb_build_object(
      'confidenceBand', confidence_band,
      'labeled', labeled,
      'exact', exact,
      'exactRate', CASE WHEN labeled = 0 THEN 0 ELSE round(exact::numeric * 100 / labeled, 1) END
    ) ORDER BY CASE confidence_band WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END) AS rows
    FROM (
      SELECT
        confidence_band,
        count(*)::integer AS labeled,
        count(*) FILTER (WHERE assigned_stage = confirmed_stage)::integer AS exact
      FROM confirmed
      GROUP BY confidence_band
    ) grouped
  ),
  confusion AS (
    SELECT jsonb_agg(jsonb_build_object(
      'assignedStage', assigned_stage,
      'confirmedStage', confirmed_stage,
      'users', users
    ) ORDER BY assigned_stage, confirmed_stage) AS rows
    FROM (
      SELECT assigned_stage, confirmed_stage, count(*)::integer AS users
      FROM confirmed
      GROUP BY assigned_stage, confirmed_stage
    ) grouped
  )
  SELECT jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'summary', jsonb_build_object(
      'labeledUsers', summary.labeled,
      'exactMatches', summary.exact,
      'adjacentMatches', summary.adjacent,
      'overstaged', summary.overstaged,
      'understaged', summary.understaged,
      'exactRate', CASE WHEN summary.labeled = 0 THEN 0 ELSE round(summary.exact::numeric * 100 / summary.labeled, 1) END,
      'adjacentRate', CASE WHEN summary.labeled = 0 THEN 0 ELSE round(summary.adjacent::numeric * 100 / summary.labeled, 1) END
    ),
    'confidenceBands', COALESCE(bands.rows, '[]'::jsonb),
    'confusionMatrix', COALESCE(confusion.rows, '[]'::jsonb)
  )
  INTO v_result
  FROM summary CROSS JOIN bands CROSS JOIN confusion;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.record_founder_stage_evidence_v1(text, text, text, integer, numeric, text, text, timestamptz, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sync_founder_stage_state_v1(integer, integer, numeric, integer, text, numeric, text, boolean, text[], text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_founder_stage_v1(integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.answer_founder_stage_boundary_v1(text, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_founder_stage_accuracy_v1(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_founder_stage_evidence_v1(text, text, text, integer, numeric, text, text, timestamptz, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_founder_stage_state_v1(integer, integer, numeric, integer, text, numeric, text, boolean, text[], text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_founder_stage_v1(integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.answer_founder_stage_boundary_v1(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_founder_stage_accuracy_v1(timestamptz, timestamptz) TO authenticated;

COMMENT ON TABLE public.founder_stage_evidence IS
  'User-scoped maturity evidence. Goals and blockers are deliberately excluded as operating-stage proof.';
COMMENT ON TABLE public.founder_stage_state IS
  'Stable current and candidate operating stage plus a separate capital motion and confidence diagnostics.';
COMMENT ON FUNCTION public.get_founder_stage_accuracy_v1(timestamptz, timestamptz) IS
  'Admin-only calibration report using structured user confirmations and corrections.';
