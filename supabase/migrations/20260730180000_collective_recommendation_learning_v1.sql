-- Collective recommendation learning v1.
-- Converts recommendation usage into a privacy-safe, outcome-based learning loop.

CREATE TABLE IF NOT EXISTS public.recommendation_policy_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  active_policy_version text NOT NULL DEFAULT 'collective_v1',
  status text NOT NULL DEFAULT 'collecting'
    CHECK (status IN ('collecting', 'active', 'paused')),
  holdout_percent integer NOT NULL DEFAULT 10 CHECK (holdout_percent BETWEEN 5 AND 25),
  exploration_percent integer NOT NULL DEFAULT 5 CHECK (exploration_percent BETWEEN 0 AND 10),
  min_segment_samples integer NOT NULL DEFAULT 20 CHECK (min_segment_samples BETWEEN 10 AND 1000),
  min_activation_exposures integer NOT NULL DEFAULT 100 CHECK (min_activation_exposures >= 50),
  min_matured_d7 integer NOT NULL DEFAULT 50 CHECK (min_matured_d7 >= 25),
  max_negative_feedback_rate numeric NOT NULL DEFAULT 0.25
    CHECK (max_negative_feedback_rate BETWEEN 0.05 AND 0.50),
  max_relative_artifact_decline numeric NOT NULL DEFAULT 0.10
    CHECK (max_relative_artifact_decline BETWEEN 0 AND 0.50),
  auto_activate boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.recommendation_policy_config (singleton)
VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

ALTER TABLE public.dashboard_ranking_cache
  ADD COLUMN IF NOT EXISTS policy_version text NOT NULL DEFAULT 'legacy_ai_v1',
  ADD COLUMN IF NOT EXISTS assignment text NOT NULL DEFAULT 'baseline',
  ADD COLUMN IF NOT EXISTS deterministic_key text,
  ADD COLUMN IF NOT EXISTS score_diagnostics jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS context_segments jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS suppressed_keys jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.recommendation_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision_key text NOT NULL,
  surface text NOT NULL
    CHECK (surface IN ('command_center', 'daily_mission', 'first_action')),
  snapshot_hash text,
  candidate_set jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(candidate_set) = 'array'),
  selected_key text NOT NULL,
  selected_tool_key text NOT NULL,
  deterministic_key text NOT NULL,
  policy_version text NOT NULL,
  assignment text NOT NULL
    CHECK (assignment IN ('control', 'learned', 'explore', 'baseline')),
  model text,
  context_segments jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(context_segments) = 'object'),
  score_diagnostics jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(score_diagnostics) = 'object'),
  shown_at timestamptz NOT NULL DEFAULT now(),
  last_shown_at timestamptz NOT NULL DEFAULT now(),
  exposure_count integer NOT NULL DEFAULT 1 CHECK (exposure_count > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, decision_key)
);

CREATE INDEX IF NOT EXISTS recommendation_decisions_user_shown_idx
  ON public.recommendation_decisions (user_id, shown_at DESC);
CREATE INDEX IF NOT EXISTS recommendation_decisions_policy_assignment_idx
  ON public.recommendation_decisions (policy_version, assignment, shown_at DESC);
CREATE INDEX IF NOT EXISTS recommendation_decisions_tool_idx
  ON public.recommendation_decisions (selected_tool_key, shown_at DESC);

CREATE TABLE IF NOT EXISTS public.recommendation_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES public.recommendation_decisions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outcome_type text NOT NULL
    CHECK (outcome_type IN (
      'opened', 'completed', 'artifact_24h', 'd1_return', 'd7_return',
      'helpful', 'not_relevant'
    )),
  reward_value numeric NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  source_event_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (decision_id, outcome_type)
);

CREATE INDEX IF NOT EXISTS recommendation_outcomes_user_time_idx
  ON public.recommendation_outcomes (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS recommendation_outcomes_type_time_idx
  ON public.recommendation_outcomes (outcome_type, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.recommendation_user_suppressions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope_key text NOT NULL,
  recommendation_key text NOT NULL,
  recommendation_family text NOT NULL,
  reason text NOT NULL
    CHECK (reason IN ('already_completed', 'wrong_stage', 'wrong_goal', 'too_much_time', 'not_relevant')),
  suppressed_until timestamptz NOT NULL,
  feedback_count integer NOT NULL DEFAULT 1 CHECK (feedback_count > 0),
  last_feedback_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, scope_key)
);

CREATE INDEX IF NOT EXISTS recommendation_suppressions_active_idx
  ON public.recommendation_user_suppressions (user_id, suppressed_until DESC);

CREATE TABLE IF NOT EXISTS public.recommendation_segment_priors (
  policy_version text NOT NULL,
  segment_key text NOT NULL,
  recommendation_family text NOT NULL,
  matured_exposures integer NOT NULL DEFAULT 0,
  opened_users integer NOT NULL DEFAULT 0,
  completed_users integer NOT NULL DEFAULT 0,
  artifact_users integer NOT NULL DEFAULT 0,
  d1_users integer NOT NULL DEFAULT 0,
  d7_users integer NOT NULL DEFAULT 0,
  helpful_users integer NOT NULL DEFAULT 0,
  negative_users integer NOT NULL DEFAULT 0,
  reward_sum numeric NOT NULL DEFAULT 0,
  raw_reward numeric NOT NULL DEFAULT 0,
  smoothed_score numeric NOT NULL DEFAULT 0,
  eligible boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (policy_version, segment_key, recommendation_family)
);

CREATE INDEX IF NOT EXISTS recommendation_segment_priors_lookup_idx
  ON public.recommendation_segment_priors
  (policy_version, segment_key, eligible, smoothed_score DESC);

CREATE TABLE IF NOT EXISTS public.recommendation_policy_daily_metrics (
  metric_date date NOT NULL,
  policy_version text NOT NULL,
  assignment text NOT NULL,
  exposures integer NOT NULL DEFAULT 0,
  opened integer NOT NULL DEFAULT 0,
  completed integer NOT NULL DEFAULT 0,
  artifacts integer NOT NULL DEFAULT 0,
  matured_d1 integer NOT NULL DEFAULT 0,
  returned_d1 integer NOT NULL DEFAULT 0,
  matured_d7 integer NOT NULL DEFAULT 0,
  returned_d7 integer NOT NULL DEFAULT 0,
  helpful integer NOT NULL DEFAULT 0,
  negative integer NOT NULL DEFAULT 0,
  average_reward numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (metric_date, policy_version, assignment)
);

CREATE TABLE IF NOT EXISTS public.recommendation_policy_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_version text NOT NULL,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  learned_exposures integer NOT NULL DEFAULT 0,
  control_exposures integer NOT NULL DEFAULT 0,
  learned_artifact_rate numeric NOT NULL DEFAULT 0,
  control_artifact_rate numeric NOT NULL DEFAULT 0,
  relative_artifact_lift numeric,
  learned_negative_rate numeric NOT NULL DEFAULT 0,
  matured_d7 integer NOT NULL DEFAULT 0,
  recommendation text NOT NULL
    CHECK (recommendation IN ('collect', 'activate', 'continue', 'pause')),
  reason_codes text[] NOT NULL DEFAULT ARRAY[]::text[]
);

ALTER TABLE public.recommendation_policy_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_user_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_segment_priors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_policy_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_policy_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own recommendation decisions" ON public.recommendation_decisions;
CREATE POLICY "Users read own recommendation decisions"
  ON public.recommendation_decisions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users read own recommendation outcomes" ON public.recommendation_outcomes;
CREATE POLICY "Users read own recommendation outcomes"
  ON public.recommendation_outcomes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users read own recommendation suppressions" ON public.recommendation_user_suppressions;
CREATE POLICY "Users read own recommendation suppressions"
  ON public.recommendation_user_suppressions FOR SELECT USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.recommendation_policy_config FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.recommendation_decisions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.recommendation_outcomes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.recommendation_user_suppressions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.recommendation_segment_priors FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.recommendation_policy_daily_metrics FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.recommendation_policy_evaluations FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.recommendation_decisions TO authenticated;
GRANT SELECT ON public.recommendation_outcomes TO authenticated;
GRANT SELECT ON public.recommendation_user_suppressions TO authenticated;
GRANT ALL ON public.recommendation_policy_config TO service_role;
GRANT ALL ON public.recommendation_decisions TO service_role;
GRANT ALL ON public.recommendation_outcomes TO service_role;
GRANT ALL ON public.recommendation_user_suppressions TO service_role;
GRANT ALL ON public.recommendation_segment_priors TO service_role;
GRANT ALL ON public.recommendation_policy_daily_metrics TO service_role;
GRANT ALL ON public.recommendation_policy_evaluations TO service_role;

CREATE OR REPLACE FUNCTION public.get_recommendation_context_v1(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.onboarding_sessions;
  v_stage public.founder_stage_state;
  v_plan text := 'rookie';
  v_capacity numeric;
BEGIN
  SELECT * INTO v_session
  FROM public.onboarding_sessions
  WHERE user_id = p_user AND status = 'completed'
  ORDER BY completed_at DESC NULLS LAST
  LIMIT 1;

  SELECT * INTO v_stage
  FROM public.founder_stage_state
  WHERE user_id = p_user;

  SELECT COALESCE(NULLIF(subscription_tier, ''), 'rookie')
  INTO v_plan
  FROM public.profiles
  WHERE id = p_user;

  v_capacity := CASE
    WHEN COALESCE(v_session.answers->>'weeklyCapacityHours', '') ~ '^[0-9]+([.][0-9]+)?$'
      THEN (v_session.answers->>'weeklyCapacityHours')::numeric
    ELSE NULL
  END;

  RETURN jsonb_strip_nulls(jsonb_build_object(
    'stage', COALESCE(
      v_stage.current_stage,
      CASE
        WHEN COALESCE(v_session.derived_context->>'assignedStage', '') ~ '^[1-6]$'
          THEN (v_session.derived_context->>'assignedStage')::integer
        ELSE NULL
      END
    ),
    'loop', NULLIF(v_session.derived_context->>'founderLoop', ''),
    'goal', NULLIF(v_session.answers->>'primaryGoal', ''),
    'blocker', NULLIF(v_session.answers->>'blocker', ''),
    'capacityBand', CASE
      WHEN v_capacity IS NULL THEN NULL
      WHEN v_capacity <= 2 THEN 'micro'
      WHEN v_capacity <= 5 THEN 'light'
      WHEN v_capacity <= 10 THEN 'standard'
      ELSE 'intensive'
    END,
    'plan', lower(v_plan),
    'confidenceBand', v_stage.confidence_band
  ));
END;
$$;

REVOKE ALL ON FUNCTION public.get_recommendation_context_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_recommendation_context_v1(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.recommendation_segment_keys_v1(p_context jsonb)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY[
    'global',
    'stage:' || COALESCE(NULLIF(p_context->>'stage', ''), 'unknown'),
    'stage:' || COALESCE(NULLIF(p_context->>'stage', ''), 'unknown')
      || '|goal:' || COALESCE(NULLIF(p_context->>'goal', ''), 'unknown'),
    'stage:' || COALESCE(NULLIF(p_context->>'stage', ''), 'unknown')
      || '|goal:' || COALESCE(NULLIF(p_context->>'goal', ''), 'unknown')
      || '|blocker:' || COALESCE(NULLIF(p_context->>'blocker', ''), 'unknown'),
    'stage:' || COALESCE(NULLIF(p_context->>'stage', ''), 'unknown')
      || '|goal:' || COALESCE(NULLIF(p_context->>'goal', ''), 'unknown')
      || '|blocker:' || COALESCE(NULLIF(p_context->>'blocker', ''), 'unknown')
      || '|capacity:' || COALESCE(NULLIF(p_context->>'capacityBand', ''), 'unknown')
      || '|plan:' || COALESCE(NULLIF(p_context->>'plan', ''), 'rookie')
  ]::text[];
$$;

CREATE OR REPLACE FUNCTION public.record_recommendation_decision_v1(
  p_decision_key text,
  p_surface text,
  p_snapshot_hash text,
  p_candidate_set jsonb,
  p_selected_key text,
  p_selected_tool_key text,
  p_deterministic_key text,
  p_policy_version text,
  p_assignment text,
  p_model text DEFAULT NULL,
  p_score_diagnostics jsonb DEFAULT '{}'::jsonb
)
RETURNS public.recommendation_decisions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_decision public.recommendation_decisions;
  v_context jsonb;
  v_candidate_count integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_surface NOT IN ('command_center', 'daily_mission', 'first_action')
    OR p_assignment NOT IN ('control', 'learned', 'explore', 'baseline') THEN
    RAISE EXCEPTION 'Invalid recommendation decision' USING ERRCODE = '22023';
  END IF;
  IF p_candidate_set IS NULL OR jsonb_typeof(p_candidate_set) <> 'array' THEN
    RAISE EXCEPTION 'Candidate set must be an array' USING ERRCODE = '22023';
  END IF;
  v_candidate_count := jsonb_array_length(p_candidate_set);
  IF v_candidate_count < 1 OR v_candidate_count > 10 THEN
    RAISE EXCEPTION 'Candidate set must contain 1 to 10 actions' USING ERRCODE = '22023';
  END IF;
  IF length(COALESCE(p_decision_key, '')) > 180
    OR length(COALESCE(p_selected_key, '')) > 160
    OR length(COALESCE(p_selected_tool_key, '')) > 80
    OR NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_candidate_set) candidate
      WHERE candidate->>'key' = p_selected_key
    ) THEN
    RAISE EXCEPTION 'Invalid selected recommendation' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.recommendation_decisions
    WHERE user_id = v_user AND decision_key = p_decision_key
  ) AND (
    SELECT count(*) FROM public.recommendation_decisions
    WHERE user_id = v_user AND created_at >= date_trunc('day', now())
  ) >= 30 THEN
    RAISE EXCEPTION 'Daily recommendation exposure limit reached' USING ERRCODE = 'P0001';
  END IF;

  v_context := public.get_recommendation_context_v1(v_user);

  INSERT INTO public.recommendation_decisions (
    user_id, decision_key, surface, snapshot_hash, candidate_set,
    selected_key, selected_tool_key, deterministic_key, policy_version,
    assignment, model, context_segments, score_diagnostics
  ) VALUES (
    v_user,
    left(p_decision_key, 180),
    p_surface,
    left(COALESCE(p_snapshot_hash, ''), 128),
    p_candidate_set,
    left(p_selected_key, 160),
    left(p_selected_tool_key, 80),
    left(p_deterministic_key, 160),
    left(p_policy_version, 80),
    p_assignment,
    left(COALESCE(p_model, ''), 120),
    v_context,
    CASE WHEN jsonb_typeof(COALESCE(p_score_diagnostics, '{}'::jsonb)) = 'object'
      THEN p_score_diagnostics ELSE '{}'::jsonb END
  )
  ON CONFLICT (user_id, decision_key) DO UPDATE SET
    last_shown_at = now(),
    exposure_count = public.recommendation_decisions.exposure_count + 1,
    updated_at = now()
  RETURNING * INTO v_decision;

  RETURN v_decision;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_recommendation_outcome_v1(
  p_recommendation_key text,
  p_surface text,
  p_outcome_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.recommendation_outcomes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_decision public.recommendation_decisions;
  v_outcome public.recommendation_outcomes;
  v_reward numeric;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_outcome_type NOT IN ('opened', 'completed', 'helpful', 'not_relevant') THEN
    RAISE EXCEPTION 'Unsupported direct recommendation outcome' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_decision
  FROM public.recommendation_decisions
  WHERE user_id = v_user
    AND selected_key = p_recommendation_key
    AND surface = p_surface
    AND shown_at >= now() - interval '8 days'
  ORDER BY shown_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recommendation exposure not found' USING ERRCODE = 'P0002';
  END IF;

  v_reward := CASE p_outcome_type
    WHEN 'opened' THEN 0.05
    WHEN 'completed' THEN 0.35
    WHEN 'helpful' THEN 0.10
    WHEN 'not_relevant' THEN -0.25
  END;

  INSERT INTO public.recommendation_outcomes (
    decision_id, user_id, outcome_type, reward_value, metadata
  ) VALUES (
    v_decision.id,
    v_user,
    p_outcome_type,
    v_reward,
    CASE WHEN jsonb_typeof(COALESCE(p_metadata, '{}'::jsonb)) = 'object'
      THEN jsonb_strip_nulls(jsonb_build_object(
        'reason', left(COALESCE(p_metadata->>'reason', ''), 40),
        'source', left(COALESCE(p_metadata->>'source', ''), 40)
      ))
      ELSE '{}'::jsonb
    END
  )
  ON CONFLICT (decision_id, outcome_type) DO UPDATE SET
    occurred_at = LEAST(public.recommendation_outcomes.occurred_at, EXCLUDED.occurred_at)
  RETURNING * INTO v_outcome;

  RETURN v_outcome;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_recommendation_feedback_v1(
  p_recommendation_key text,
  p_surface text,
  p_relevance text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_decision public.recommendation_decisions;
  v_reason text;
  v_scope text;
  v_until timestamptz;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_relevance NOT IN ('helpful', 'not_relevant') THEN
    RAISE EXCEPTION 'Invalid recommendation feedback' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_decision
  FROM public.recommendation_decisions
  WHERE user_id = v_user
    AND selected_key = p_recommendation_key
    AND surface = p_surface
    AND shown_at >= now() - interval '8 days'
  ORDER BY shown_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recommendation exposure not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.record_recommendation_outcome_v1(
    p_recommendation_key,
    p_surface,
    CASE WHEN p_relevance = 'helpful' THEN 'helpful' ELSE 'not_relevant' END,
    jsonb_build_object('reason', p_reason, 'source', 'structured_feedback')
  );

  IF p_relevance = 'not_relevant' THEN
    v_reason := CASE
      WHEN p_reason IN ('already_completed', 'wrong_stage', 'wrong_goal', 'too_much_time')
        THEN p_reason
      ELSE 'not_relevant'
    END;
    v_scope := CASE
      WHEN v_reason IN ('wrong_stage', 'wrong_goal')
        THEN 'family:' || v_decision.selected_tool_key
      ELSE 'key:' || v_decision.selected_key
    END;
    v_until := CASE v_reason
      WHEN 'already_completed' THEN now() + interval '365 days'
      WHEN 'too_much_time' THEN now() + interval '7 days'
      ELSE now() + interval '30 days'
    END;

    INSERT INTO public.recommendation_user_suppressions (
      user_id, scope_key, recommendation_key, recommendation_family,
      reason, suppressed_until
    ) VALUES (
      v_user, v_scope, v_decision.selected_key, v_decision.selected_tool_key,
      v_reason, v_until
    )
    ON CONFLICT (user_id, scope_key) DO UPDATE SET
      reason = EXCLUDED.reason,
      suppressed_until = GREATEST(public.recommendation_user_suppressions.suppressed_until, EXCLUDED.suppressed_until),
      feedback_count = public.recommendation_user_suppressions.feedback_count + 1,
      last_feedback_at = now();
  END IF;

  RETURN jsonb_build_object('ok', true, 'suppressedUntil', v_until);
END;
$$;

CREATE OR REPLACE FUNCTION public.attribute_recommendation_outcomes_v1(
  p_now timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_artifacts integer := 0;
  v_completed integer := 0;
  v_d1 integer := 0;
  v_d7 integer := 0;
BEGIN
  INSERT INTO public.recommendation_outcomes (
    decision_id, user_id, outcome_type, reward_value, occurred_at, source_event_id,
    metadata
  )
  SELECT DISTINCT ON (d.id)
    d.id, d.user_id, 'completed', 0.35, a.created_at, a.id,
    jsonb_build_object('attributionWindow', 'tool_completion_7d')
  FROM public.recommendation_decisions d
  JOIN public.user_activity_log a ON a.user_id = d.user_id
    AND a.activity_type IN ('tool_milestone_completed', 'dashboard_inline_action_completed')
    AND a.created_at BETWEEN d.shown_at AND d.shown_at + interval '7 days'
    AND (
      a.source_tool = d.selected_tool_key
      OR a.activity_data->>'recommendation_key' = d.selected_key
    )
  WHERE d.shown_at <= p_now
  ORDER BY d.id, a.created_at
  ON CONFLICT (decision_id, outcome_type) DO NOTHING;
  GET DIAGNOSTICS v_completed = ROW_COUNT;

  INSERT INTO public.recommendation_outcomes (
    decision_id, user_id, outcome_type, reward_value, occurred_at, source_event_id,
    metadata
  )
  SELECT DISTINCT ON (d.id)
    d.id, d.user_id, 'artifact_24h', 0.40, a.created_at, a.id,
    jsonb_build_object('attributionWindow', '24h')
  FROM public.recommendation_decisions d
  JOIN public.user_activity_log a ON a.user_id = d.user_id
    AND a.activity_type IN ('activation_first_artifact_saved', 'first_artifact_created', 'artifact_saved')
    AND a.created_at BETWEEN d.shown_at AND d.shown_at + interval '24 hours'
  WHERE d.shown_at <= p_now - interval '24 hours'
  ORDER BY d.id, a.created_at
  ON CONFLICT (decision_id, outcome_type) DO NOTHING;
  GET DIAGNOSTICS v_artifacts = ROW_COUNT;

  INSERT INTO public.recommendation_outcomes (
    decision_id, user_id, outcome_type, reward_value, occurred_at, source_event_id,
    metadata
  )
  SELECT DISTINCT ON (d.id)
    d.id, d.user_id, 'd1_return', 0.10, a.created_at, a.id,
    jsonb_build_object('attributionWindow', '24h-48h')
  FROM public.recommendation_decisions d
  JOIN public.user_activity_log a ON a.user_id = d.user_id
    AND a.activity_type = 'dashboard_viewed'
    AND a.created_at BETWEEN d.shown_at + interval '24 hours' AND d.shown_at + interval '48 hours'
  WHERE d.shown_at <= p_now - interval '48 hours'
  ORDER BY d.id, a.created_at
  ON CONFLICT (decision_id, outcome_type) DO NOTHING;
  GET DIAGNOSTICS v_d1 = ROW_COUNT;

  INSERT INTO public.recommendation_outcomes (
    decision_id, user_id, outcome_type, reward_value, occurred_at, source_event_id,
    metadata
  )
  SELECT DISTINCT ON (d.id)
    d.id, d.user_id, 'd7_return', 0.10, a.created_at, a.id,
    jsonb_build_object('attributionWindow', '144h-192h')
  FROM public.recommendation_decisions d
  JOIN public.user_activity_log a ON a.user_id = d.user_id
    AND a.activity_type = 'dashboard_viewed'
    AND a.created_at BETWEEN d.shown_at + interval '144 hours' AND d.shown_at + interval '192 hours'
  WHERE d.shown_at <= p_now - interval '192 hours'
  ORDER BY d.id, a.created_at
  ON CONFLICT (decision_id, outcome_type) DO NOTHING;
  GET DIAGNOSTICS v_d7 = ROW_COUNT;

  RETURN jsonb_build_object(
    'completedOutcomes', v_completed,
    'artifactOutcomes', v_artifacts,
    'd1Outcomes', v_d1,
    'd7Outcomes', v_d7
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_recommendation_segment_priors_v1(
  p_now timestamptz DEFAULT now()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min_samples integer;
  v_rows integer;
BEGIN
  SELECT min_segment_samples INTO v_min_samples
  FROM public.recommendation_policy_config WHERE singleton = true;

  WITH matured AS (
    SELECT
      d.id,
      d.policy_version,
      d.selected_tool_key AS recommendation_family,
      public.recommendation_segment_keys_v1(d.context_segments) AS segment_keys,
      COALESCE(sum(o.reward_value), 0) AS reward,
      bool_or(o.outcome_type = 'opened') AS opened,
      bool_or(o.outcome_type = 'completed') AS completed,
      bool_or(o.outcome_type = 'artifact_24h') AS artifact,
      bool_or(o.outcome_type = 'd1_return') AS d1,
      bool_or(o.outcome_type = 'd7_return') AS d7,
      bool_or(o.outcome_type = 'helpful') AS helpful,
      bool_or(o.outcome_type = 'not_relevant') AS negative
    FROM public.recommendation_decisions d
    LEFT JOIN public.recommendation_outcomes o ON o.decision_id = d.id
    WHERE d.shown_at <= p_now - interval '24 hours'
      AND d.shown_at >= p_now - interval '180 days'
    GROUP BY d.id
  ), expanded AS (
    SELECT matured.*, segment_key
    FROM matured
    CROSS JOIN LATERAL unnest(matured.segment_keys) segment_key
  ), aggregate AS (
    SELECT
      policy_version,
      segment_key,
      recommendation_family,
      count(*)::integer AS exposures,
      count(*) FILTER (WHERE opened)::integer AS opened,
      count(*) FILTER (WHERE completed)::integer AS completed,
      count(*) FILTER (WHERE artifact)::integer AS artifacts,
      count(*) FILTER (WHERE d1)::integer AS d1,
      count(*) FILTER (WHERE d7)::integer AS d7,
      count(*) FILTER (WHERE helpful)::integer AS helpful,
      count(*) FILTER (WHERE negative)::integer AS negative,
      sum(reward)::numeric AS reward_sum
    FROM expanded
    GROUP BY policy_version, segment_key, recommendation_family
  ), global_mean AS (
    SELECT
      policy_version,
      COALESCE(sum(reward_sum) / NULLIF(sum(exposures), 0), 0)::numeric AS mean_reward
    FROM aggregate
    WHERE segment_key = 'global'
    GROUP BY policy_version
  )
  INSERT INTO public.recommendation_segment_priors (
    policy_version, segment_key, recommendation_family, matured_exposures,
    opened_users, completed_users, artifact_users, d1_users, d7_users,
    helpful_users, negative_users, reward_sum, raw_reward, smoothed_score,
    eligible, updated_at
  )
  SELECT
    a.policy_version,
    a.segment_key,
    a.recommendation_family,
    a.exposures,
    a.opened,
    a.completed,
    a.artifacts,
    a.d1,
    a.d7,
    a.helpful,
    a.negative,
    a.reward_sum,
    round(a.reward_sum / NULLIF(a.exposures, 0), 6),
    round((a.reward_sum + 20 * g.mean_reward) / (a.exposures + 20), 6),
    a.exposures >= v_min_samples,
    p_now
  FROM aggregate a
  JOIN global_mean g USING (policy_version)
  ON CONFLICT (policy_version, segment_key, recommendation_family) DO UPDATE SET
    matured_exposures = EXCLUDED.matured_exposures,
    opened_users = EXCLUDED.opened_users,
    completed_users = EXCLUDED.completed_users,
    artifact_users = EXCLUDED.artifact_users,
    d1_users = EXCLUDED.d1_users,
    d7_users = EXCLUDED.d7_users,
    helpful_users = EXCLUDED.helpful_users,
    negative_users = EXCLUDED.negative_users,
    reward_sum = EXCLUDED.reward_sum,
    raw_reward = EXCLUDED.raw_reward,
    smoothed_score = EXCLUDED.smoothed_score,
    eligible = EXCLUDED.eligible,
    updated_at = EXCLUDED.updated_at;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_recommendation_policy_metrics_v1(
  p_now timestamptz DEFAULT now()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  WITH decision_outcomes AS (
    SELECT
      d.id,
      d.shown_at::date AS metric_date,
      d.policy_version,
      d.assignment,
      d.shown_at,
      COALESCE(sum(o.reward_value), 0) AS reward,
      bool_or(o.outcome_type = 'opened') AS opened,
      bool_or(o.outcome_type = 'completed') AS completed,
      bool_or(o.outcome_type = 'artifact_24h') AS artifact,
      bool_or(o.outcome_type = 'd1_return') AS d1,
      bool_or(o.outcome_type = 'd7_return') AS d7,
      bool_or(o.outcome_type = 'helpful') AS helpful,
      bool_or(o.outcome_type = 'not_relevant') AS negative
    FROM public.recommendation_decisions d
    LEFT JOIN public.recommendation_outcomes o ON o.decision_id = d.id
    WHERE d.shown_at >= p_now - interval '180 days'
    GROUP BY d.id
  )
  INSERT INTO public.recommendation_policy_daily_metrics (
    metric_date, policy_version, assignment, exposures, opened, completed,
    artifacts, matured_d1, returned_d1, matured_d7, returned_d7,
    helpful, negative, average_reward, updated_at
  )
  SELECT
    metric_date,
    policy_version,
    assignment,
    count(*)::integer,
    count(*) FILTER (WHERE opened)::integer,
    count(*) FILTER (WHERE completed)::integer,
    count(*) FILTER (WHERE artifact)::integer,
    count(*) FILTER (WHERE shown_at <= p_now - interval '48 hours')::integer,
    count(*) FILTER (WHERE d1)::integer,
    count(*) FILTER (WHERE shown_at <= p_now - interval '192 hours')::integer,
    count(*) FILTER (WHERE d7)::integer,
    count(*) FILTER (WHERE helpful)::integer,
    count(*) FILTER (WHERE negative)::integer,
    round(avg(reward), 6),
    p_now
  FROM decision_outcomes
  GROUP BY metric_date, policy_version, assignment
  ON CONFLICT (metric_date, policy_version, assignment) DO UPDATE SET
    exposures = EXCLUDED.exposures,
    opened = EXCLUDED.opened,
    completed = EXCLUDED.completed,
    artifacts = EXCLUDED.artifacts,
    matured_d1 = EXCLUDED.matured_d1,
    returned_d1 = EXCLUDED.returned_d1,
    matured_d7 = EXCLUDED.matured_d7,
    returned_d7 = EXCLUDED.returned_d7,
    helpful = EXCLUDED.helpful,
    negative = EXCLUDED.negative,
    average_reward = EXCLUDED.average_reward,
    updated_at = EXCLUDED.updated_at;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.evaluate_recommendation_policy_v1(
  p_now timestamptz DEFAULT now()
)
RETURNS public.recommendation_policy_evaluations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.recommendation_policy_config;
  v_evaluation public.recommendation_policy_evaluations;
  v_learned_exposures integer := 0;
  v_control_exposures integer := 0;
  v_learned_artifacts integer := 0;
  v_control_artifacts integer := 0;
  v_learned_negative integer := 0;
  v_matured_d7 integer := 0;
  v_learned_rate numeric := 0;
  v_control_rate numeric := 0;
  v_negative_rate numeric := 0;
  v_lift numeric;
  v_recommendation text := 'collect';
  v_reasons text[] := ARRAY[]::text[];
BEGIN
  SELECT * INTO v_config
  FROM public.recommendation_policy_config WHERE singleton = true;

  SELECT
    count(*) FILTER (WHERE assignment IN ('learned', 'explore')),
    count(*) FILTER (WHERE assignment = 'control'),
    count(*) FILTER (WHERE assignment IN ('learned', 'explore') AND EXISTS (
      SELECT 1 FROM public.recommendation_outcomes o
      WHERE o.decision_id = d.id AND o.outcome_type = 'artifact_24h'
    )),
    count(*) FILTER (WHERE assignment = 'control' AND EXISTS (
      SELECT 1 FROM public.recommendation_outcomes o
      WHERE o.decision_id = d.id AND o.outcome_type = 'artifact_24h'
    )),
    count(*) FILTER (WHERE assignment IN ('learned', 'explore') AND EXISTS (
      SELECT 1 FROM public.recommendation_outcomes o
      WHERE o.decision_id = d.id AND o.outcome_type = 'not_relevant'
    )),
    count(*) FILTER (WHERE shown_at <= p_now - interval '192 hours')
  INTO
    v_learned_exposures, v_control_exposures, v_learned_artifacts,
    v_control_artifacts, v_learned_negative, v_matured_d7
  FROM public.recommendation_decisions d
  WHERE shown_at >= p_now - interval '28 days'
    AND shown_at <= p_now - interval '24 hours'
    AND policy_version = v_config.active_policy_version;

  v_learned_rate := COALESCE(v_learned_artifacts::numeric / NULLIF(v_learned_exposures, 0), 0);
  v_control_rate := COALESCE(v_control_artifacts::numeric / NULLIF(v_control_exposures, 0), 0);
  v_negative_rate := COALESCE(v_learned_negative::numeric / NULLIF(v_learned_exposures, 0), 0);
  v_lift := CASE WHEN v_control_rate > 0 THEN (v_learned_rate - v_control_rate) / v_control_rate ELSE NULL END;

  IF v_learned_exposures < v_config.min_activation_exposures
    OR v_control_exposures < greatest(20, v_config.min_activation_exposures / 10)
    OR v_matured_d7 < v_config.min_matured_d7 THEN
    v_recommendation := 'collect';
    v_reasons := array_append(v_reasons, 'insufficient_exposures');
  ELSIF v_negative_rate > v_config.max_negative_feedback_rate THEN
    v_recommendation := 'pause';
    v_reasons := array_append(v_reasons, 'negative_feedback_guardrail');
  ELSIF v_control_rate > 0
    AND v_learned_rate < v_control_rate * (1 - v_config.max_relative_artifact_decline) THEN
    v_recommendation := 'pause';
    v_reasons := array_append(v_reasons, 'artifact_rate_guardrail');
  ELSIF v_config.status = 'collecting' THEN
    v_recommendation := 'activate';
    v_reasons := array_append(v_reasons, 'minimum_learning_sample_reached');
  ELSE
    v_recommendation := 'continue';
    v_reasons := array_append(v_reasons, 'guardrails_healthy');
  END IF;

  INSERT INTO public.recommendation_policy_evaluations (
    policy_version, window_start, window_end, learned_exposures,
    control_exposures, learned_artifact_rate, control_artifact_rate,
    relative_artifact_lift, learned_negative_rate, matured_d7,
    recommendation, reason_codes
  ) VALUES (
    v_config.active_policy_version,
    p_now - interval '28 days',
    p_now,
    v_learned_exposures,
    v_control_exposures,
    round(v_learned_rate, 6),
    round(v_control_rate, 6),
    round(v_lift, 6),
    round(v_negative_rate, 6),
    v_matured_d7,
    v_recommendation,
    v_reasons
  )
  RETURNING * INTO v_evaluation;

  RETURN v_evaluation;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalibrate_recommendation_policy_v1(
  p_now timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attribution jsonb;
  v_priors integer;
  v_metrics integer;
  v_evaluation public.recommendation_policy_evaluations;
  v_config public.recommendation_policy_config;
BEGIN
  v_attribution := public.attribute_recommendation_outcomes_v1(p_now);
  v_priors := public.refresh_recommendation_segment_priors_v1(p_now);
  v_metrics := public.refresh_recommendation_policy_metrics_v1(p_now);
  v_evaluation := public.evaluate_recommendation_policy_v1(p_now);

  SELECT * INTO v_config
  FROM public.recommendation_policy_config WHERE singleton = true
  FOR UPDATE;

  IF v_config.auto_activate AND v_evaluation.recommendation = 'activate' THEN
    UPDATE public.recommendation_policy_config
    SET status = 'active', updated_at = p_now
    WHERE singleton = true;
  ELSIF v_evaluation.recommendation = 'pause' THEN
    UPDATE public.recommendation_policy_config
    SET status = 'paused', updated_at = p_now
    WHERE singleton = true;
  END IF;

  RETURN jsonb_build_object(
    'attribution', v_attribution,
    'priorsUpdated', v_priors,
    'metricsUpdated', v_metrics,
    'recommendation', v_evaluation.recommendation,
    'reasonCodes', v_evaluation.reason_codes
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_recommendation_learning_report_v1(
  p_from timestamptz DEFAULT now() - interval '28 days',
  p_to timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from >= p_to THEN
    RAISE EXCEPTION 'Invalid reporting range' USING ERRCODE = '22023';
  END IF;

  WITH decisions AS (
    SELECT * FROM public.recommendation_decisions
    WHERE shown_at >= p_from AND shown_at < p_to
  ), result AS (
    SELECT jsonb_build_object(
      'uniqueUsers', count(DISTINCT d.user_id),
      'exposures', count(*),
      'opened', count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM public.recommendation_outcomes o
        WHERE o.decision_id = d.id AND o.outcome_type = 'opened'
      )),
      'completed', count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM public.recommendation_outcomes o
        WHERE o.decision_id = d.id AND o.outcome_type = 'completed'
      )),
      'artifacts', count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM public.recommendation_outcomes o
        WHERE o.decision_id = d.id AND o.outcome_type = 'artifact_24h'
      )),
      'helpful', count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM public.recommendation_outcomes o
        WHERE o.decision_id = d.id AND o.outcome_type = 'helpful'
      )),
      'negative', count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM public.recommendation_outcomes o
        WHERE o.decision_id = d.id AND o.outcome_type = 'not_relevant'
      )),
      'maturedD7', count(*) FILTER (WHERE d.shown_at <= now() - interval '192 hours'),
      'returnedD7', count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM public.recommendation_outcomes o
        WHERE o.decision_id = d.id AND o.outcome_type = 'd7_return'
      ))
    ) AS value
    FROM decisions d
  ), assignments AS (
    SELECT jsonb_agg(jsonb_build_object(
      'assignment', assignment,
      'exposures', exposures,
      'artifacts', artifacts,
      'negative', negative
    ) ORDER BY assignment) AS value
    FROM (
      SELECT
        d.assignment,
        count(*) AS exposures,
        count(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM public.recommendation_outcomes o
          WHERE o.decision_id = d.id AND o.outcome_type = 'artifact_24h'
        )) AS artifacts,
        count(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM public.recommendation_outcomes o
          WHERE o.decision_id = d.id AND o.outcome_type = 'not_relevant'
        )) AS negative
      FROM decisions d GROUP BY d.assignment
    ) grouped
  )
  SELECT jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'config', (SELECT to_jsonb(c) FROM public.recommendation_policy_config c WHERE singleton = true),
    'summary', result.value,
    'assignments', COALESCE(assignments.value, '[]'::jsonb),
    'eligibleSegments', (
      SELECT count(*) FROM public.recommendation_segment_priors WHERE eligible = true
    ),
    'activeSuppressions', (
      SELECT count(*) FROM public.recommendation_user_suppressions WHERE suppressed_until > now()
    ),
    'latestEvaluation', (
      SELECT to_jsonb(e) FROM public.recommendation_policy_evaluations e
      ORDER BY evaluated_at DESC LIMIT 1
    )
  )
  INTO v_result
  FROM result CROSS JOIN assignments;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.recommendation_segment_keys_v1(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_recommendation_decision_v1(text, text, text, jsonb, text, text, text, text, text, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_recommendation_outcome_v1(text, text, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_recommendation_feedback_v1(text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.attribute_recommendation_outcomes_v1(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_recommendation_segment_priors_v1(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_recommendation_policy_metrics_v1(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.evaluate_recommendation_policy_v1(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalibrate_recommendation_policy_v1(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_recommendation_learning_report_v1(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_recommendation_decision_v1(text, text, text, jsonb, text, text, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_recommendation_outcome_v1(text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_recommendation_feedback_v1(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attribute_recommendation_outcomes_v1(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_recommendation_segment_priors_v1(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_recommendation_policy_metrics_v1(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.evaluate_recommendation_policy_v1(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.recalibrate_recommendation_policy_v1(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_recommendation_learning_report_v1(timestamptz, timestamptz) TO authenticated;

DO $$
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'recommendation-outcome-attribution-hourly') THEN
      PERFORM cron.unschedule('recommendation-outcome-attribution-hourly');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'recommendation-policy-recalibration-weekly') THEN
      PERFORM cron.unschedule('recommendation-policy-recalibration-weekly');
    END IF;

    PERFORM cron.schedule(
      'recommendation-outcome-attribution-hourly',
      '17 * * * *',
      $job$SELECT public.attribute_recommendation_outcomes_v1();$job$
    );
    PERFORM cron.schedule(
      'recommendation-policy-recalibration-weekly',
      '23 4 * * 1',
      $job$SELECT public.recalibrate_recommendation_policy_v1();$job$
    );
  END IF;
END;
$$;

COMMENT ON TABLE public.recommendation_decisions IS
  'Privacy-safe recommendation exposures with complete candidate sets and policy assignments.';
COMMENT ON TABLE public.recommendation_segment_priors IS
  'Bayesian-smoothed outcome priors used only after minimum sample thresholds are met.';
COMMENT ON FUNCTION public.recalibrate_recommendation_policy_v1(timestamptz) IS
  'Attributes outcomes, refreshes priors and metrics, and activates or pauses learning under explicit guardrails.';
