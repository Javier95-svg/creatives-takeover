-- Recommendation learning hardening v2.
-- Makes the collective loop sample-efficient, attribution-safe, observable,
-- replayable, and resistant to popularity and recommendation-fatigue bias.

ALTER TABLE public.recommendation_policy_config
  ADD COLUMN IF NOT EXISTS min_unique_users integer NOT NULL DEFAULT 5
    CHECK (min_unique_users BETWEEN 3 AND 1000),
  ADD COLUMN IF NOT EXISTS bayesian_prior_strength numeric NOT NULL DEFAULT 12
    CHECK (bayesian_prior_strength BETWEEN 2 AND 100),
  ADD COLUMN IF NOT EXISTS exploration_min_samples integer NOT NULL DEFAULT 3
    CHECK (exploration_min_samples BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS max_exploration_negative_rate numeric NOT NULL DEFAULT 0.20
    CHECK (max_exploration_negative_rate BETWEEN 0.05 AND 0.50),
  ADD COLUMN IF NOT EXISTS family_frequency_window_days integer NOT NULL DEFAULT 7
    CHECK (family_frequency_window_days BETWEEN 1 AND 30),
  ADD COLUMN IF NOT EXISTS family_frequency_cap integer NOT NULL DEFAULT 3
    CHECK (family_frequency_cap BETWEEN 1 AND 20),
  ADD COLUMN IF NOT EXISTS diversity_window_days integer NOT NULL DEFAULT 3
    CHECK (diversity_window_days BETWEEN 1 AND 14),
  ADD COLUMN IF NOT EXISTS repeat_penalty numeric NOT NULL DEFAULT 0.08
    CHECK (repeat_penalty BETWEEN 0 AND 0.50),
  ADD COLUMN IF NOT EXISTS max_reward_drift numeric NOT NULL DEFAULT 0.25
    CHECK (max_reward_drift BETWEEN 0.05 AND 0.75),
  ADD COLUMN IF NOT EXISTS min_replay_coverage numeric NOT NULL DEFAULT 0.30
    CHECK (min_replay_coverage BETWEEN 0.05 AND 1),
  ADD COLUMN IF NOT EXISTS max_data_delay_hours integer NOT NULL DEFAULT 3
    CHECK (max_data_delay_hours BETWEEN 1 AND 48),
  ADD COLUMN IF NOT EXISTS auto_pause_critical_drift boolean NOT NULL DEFAULT false;

-- A changed scorer receives a fresh persisted cohort. Historical v1 decisions remain
-- available for audit and replay but cannot silently activate the v2 visible policy.
UPDATE public.recommendation_policy_config
SET
  active_policy_version = 'collective_bayesian_v2',
  status = 'collecting',
  updated_at = now()
WHERE singleton = true
  AND active_policy_version <> 'collective_bayesian_v2';

ALTER TABLE public.dashboard_ranking_cache
  ADD COLUMN IF NOT EXISTS fatigue_fingerprint text;

ALTER TABLE public.recommendation_decisions
  ADD COLUMN IF NOT EXISTS selection_probability numeric NOT NULL DEFAULT 1
    CHECK (selection_probability > 0 AND selection_probability <= 1),
  ADD COLUMN IF NOT EXISTS ranking_version text NOT NULL DEFAULT 'collective_v1',
  ADD COLUMN IF NOT EXISTS exploration_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fatigue_state jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(fatigue_state) = 'object');

ALTER TABLE public.recommendation_outcomes
  ADD COLUMN IF NOT EXISTS attribution_model text NOT NULL DEFAULT 'direct_or_legacy',
  ADD COLUMN IF NOT EXISTS attribution_weight numeric NOT NULL DEFAULT 1
    CHECK (attribution_weight > 0 AND attribution_weight <= 1),
  ADD COLUMN IF NOT EXISTS maturity_window text,
  ADD COLUMN IF NOT EXISTS matured_at timestamptz;

ALTER TABLE public.recommendation_outcomes
  DROP CONSTRAINT IF EXISTS recommendation_outcomes_outcome_type_check;
ALTER TABLE public.recommendation_outcomes
  ADD CONSTRAINT recommendation_outcomes_outcome_type_check
  CHECK (outcome_type IN (
    'opened', 'completed', 'artifact_24h', 'artifact_7d',
    'd1_return', 'd7_return', 'd30_return', 'business_milestone',
    'helpful', 'not_relevant'
  ));

ALTER TABLE public.recommendation_segment_priors
  ADD COLUMN IF NOT EXISTS unique_users integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS effective_sample_size numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS positive_users integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bayesian_alpha numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS bayesian_beta numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS bayesian_mean numeric NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS bayesian_lower_bound numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS posterior_variance numeric NOT NULL DEFAULT 0.083333,
  ADD COLUMN IF NOT EXISTS negative_rate numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.recommendation_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_event_id uuid NOT NULL,
  decision_id uuid NOT NULL REFERENCES public.recommendation_decisions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outcome_type text NOT NULL,
  attribution_model text NOT NULL,
  attribution_weight numeric NOT NULL DEFAULT 1
    CHECK (attribution_weight > 0 AND attribution_weight <= 1),
  occurred_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_event_id, outcome_type)
);

CREATE INDEX IF NOT EXISTS recommendation_attributions_decision_idx
  ON public.recommendation_attributions (decision_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.recommendation_maturation_queue (
  decision_id uuid PRIMARY KEY REFERENCES public.recommendation_decisions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_24h_due_at timestamptz NOT NULL,
  d1_due_at timestamptz NOT NULL,
  completion_7d_due_at timestamptz NOT NULL,
  d7_due_at timestamptz NOT NULL,
  d30_due_at timestamptz NOT NULL,
  artifact_24h_processed_at timestamptz,
  d1_processed_at timestamptz,
  completion_7d_processed_at timestamptz,
  d7_processed_at timestamptz,
  d30_processed_at timestamptz,
  last_attempted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recommendation_maturation_due_idx
  ON public.recommendation_maturation_queue (
    artifact_24h_processed_at, d1_processed_at, completion_7d_processed_at,
    d7_processed_at, d30_processed_at
  );

CREATE TABLE IF NOT EXISTS public.recommendation_family_health (
  policy_version text NOT NULL,
  recommendation_family text NOT NULL,
  current_exposures integer NOT NULL DEFAULT 0,
  current_unique_users integer NOT NULL DEFAULT 0,
  current_average_reward numeric NOT NULL DEFAULT 0,
  current_negative_rate numeric NOT NULL DEFAULT 0,
  baseline_exposures integer NOT NULL DEFAULT 0,
  baseline_average_reward numeric NOT NULL DEFAULT 0,
  reward_drift numeric,
  status text NOT NULL DEFAULT 'insufficient'
    CHECK (status IN ('healthy', 'watch', 'critical', 'insufficient')),
  reason_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (policy_version, recommendation_family)
);

CREATE TABLE IF NOT EXISTS public.recommendation_policy_replays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_version text NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  decisions integer NOT NULL DEFAULT 0,
  covered_decisions integer NOT NULL DEFAULT 0,
  matched_decisions integer NOT NULL DEFAULT 0,
  replay_coverage numeric NOT NULL DEFAULT 0,
  policy_agreement numeric NOT NULL DEFAULT 0,
  inverse_propensity_reward numeric NOT NULL DEFAULT 0,
  observed_reward numeric NOT NULL DEFAULT 0,
  guardrail_passed boolean NOT NULL DEFAULT false,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metrics) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recommendation_policy_replays_policy_time_idx
  ON public.recommendation_policy_replays (policy_version, created_at DESC);

CREATE TABLE IF NOT EXISTS public.recommendation_quality_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_version text NOT NULL,
  recommendation_family text,
  alert_type text NOT NULL
    CHECK (alert_type IN ('reward_drift', 'negative_feedback', 'pipeline_delay', 'replay_coverage')),
  severity text NOT NULL CHECK (severity IN ('warning', 'critical')),
  observed_value numeric,
  threshold_value numeric,
  reason_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS recommendation_quality_alerts_open_idx
  ON public.recommendation_quality_alerts (policy_version, severity, detected_at DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE public.recommendation_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_maturation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_family_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_policy_replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_quality_alerts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.recommendation_attributions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.recommendation_maturation_queue FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.recommendation_family_health FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.recommendation_policy_replays FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.recommendation_quality_alerts FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.recommendation_attributions TO service_role;
GRANT ALL ON TABLE public.recommendation_maturation_queue TO service_role;
GRANT ALL ON TABLE public.recommendation_family_health TO service_role;
GRANT ALL ON TABLE public.recommendation_policy_replays TO service_role;
GRANT ALL ON TABLE public.recommendation_quality_alerts TO service_role;

CREATE OR REPLACE FUNCTION public.capture_recommendation_decision_metadata_v2()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_probability numeric;
BEGIN
  IF jsonb_typeof(COALESCE(NEW.score_diagnostics, '{}'::jsonb)) <> 'object' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.score_diagnostics #>> '{policy,selectionProbability}', '') ~ '^[0-9]+([.][0-9]+)?$' THEN
    v_probability := (NEW.score_diagnostics #>> '{policy,selectionProbability}')::numeric;
    NEW.selection_probability := greatest(0.000001, least(1, v_probability));
  END IF;
  NEW.ranking_version := left(
    COALESCE(NULLIF(NEW.score_diagnostics #>> '{policy,rankingVersion}', ''), NEW.ranking_version),
    80
  );
  NEW.exploration_eligible :=
    COALESCE((NEW.score_diagnostics #>> '{policy,explorationEligible}')::boolean, false);
  NEW.fatigue_state := jsonb_strip_nulls(jsonb_build_object(
    'fingerprint', NULLIF(NEW.score_diagnostics #>> '{policy,fatigueFingerprint}', ''),
    'selected', NEW.score_diagnostics -> NEW.selected_key -> 'fatigue'
  ));
  RETURN NEW;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS capture_recommendation_decision_metadata_v2
  ON public.recommendation_decisions;
CREATE TRIGGER capture_recommendation_decision_metadata_v2
BEFORE INSERT OR UPDATE OF score_diagnostics
ON public.recommendation_decisions
FOR EACH ROW EXECUTE FUNCTION public.capture_recommendation_decision_metadata_v2();

CREATE OR REPLACE FUNCTION public.enqueue_recommendation_maturation_v2()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.recommendation_maturation_queue (
    decision_id, user_id, artifact_24h_due_at, d1_due_at,
    completion_7d_due_at, d7_due_at, d30_due_at
  ) VALUES (
    NEW.id,
    NEW.user_id,
    NEW.shown_at + interval '24 hours',
    NEW.shown_at + interval '48 hours',
    NEW.shown_at + interval '7 days',
    NEW.shown_at + interval '192 hours',
    NEW.shown_at + interval '32 days'
  )
  ON CONFLICT (decision_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enqueue_recommendation_maturation_v2
  ON public.recommendation_decisions;
CREATE TRIGGER enqueue_recommendation_maturation_v2
AFTER INSERT ON public.recommendation_decisions
FOR EACH ROW EXECUTE FUNCTION public.enqueue_recommendation_maturation_v2();

INSERT INTO public.recommendation_maturation_queue (
  decision_id, user_id, artifact_24h_due_at, d1_due_at,
  completion_7d_due_at, d7_due_at, d30_due_at
)
SELECT
  d.id, d.user_id, d.shown_at + interval '24 hours',
  d.shown_at + interval '48 hours', d.shown_at + interval '7 days',
  d.shown_at + interval '192 hours', d.shown_at + interval '32 days'
FROM public.recommendation_decisions d
ON CONFLICT (decision_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.attribute_recommendation_outcomes_v1(
  p_now timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed integer := 0;
  v_recorded integer := 0;
  v_rows integer := 0;
BEGIN
  -- Tool completions require an explicit recommendation key or tool-family match.
  WITH candidates AS (
    SELECT
      a.id AS source_event_id,
      d.id AS decision_id,
      d.user_id,
      a.created_at AS occurred_at,
      row_number() OVER (
        PARTITION BY a.id
        ORDER BY d.shown_at DESC, d.id
      ) AS attribution_rank
    FROM public.user_activity_log a
    JOIN public.recommendation_decisions d
      ON d.user_id = a.user_id
      AND d.shown_at <= a.created_at
      AND d.shown_at >= a.created_at - interval '7 days'
      AND (
        a.source_tool = d.selected_tool_key
        OR a.activity_data->>'recommendation_key' = d.selected_key
      )
    WHERE a.activity_type IN (
      'tool_milestone_completed', 'dashboard_inline_action_completed'
    )
      AND a.created_at <= p_now
      AND a.created_at >= p_now - interval '45 days'
  )
  INSERT INTO public.recommendation_attributions (
    source_event_id, decision_id, user_id, outcome_type,
    attribution_model, attribution_weight, occurred_at, metadata
  )
  SELECT
    source_event_id, decision_id, user_id, 'completed',
    'explicit_last_touch_v2', 1, occurred_at,
    jsonb_build_object('window', 'tool_completion_7d')
  FROM candidates
  WHERE attribution_rank = 1
  ON CONFLICT (source_event_id, outcome_type) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_claimed := v_claimed + v_rows;

  -- Artifacts use explicit provenance and one last-touch decision per source event.
  WITH candidates AS (
    SELECT
      a.id AS source_event_id,
      d.id AS decision_id,
      d.user_id,
      a.created_at AS occurred_at,
      CASE WHEN a.created_at <= d.shown_at + interval '24 hours'
        THEN 'artifact_24h' ELSE 'artifact_7d' END AS outcome_type,
      CASE WHEN a.created_at <= d.shown_at + interval '24 hours'
        THEN 0.40 ELSE 0.20 END AS reward_value,
      row_number() OVER (
        PARTITION BY a.id
        ORDER BY d.shown_at DESC, d.id
      ) AS attribution_rank
    FROM public.user_activity_log a
    JOIN public.recommendation_decisions d
      ON d.user_id = a.user_id
      AND d.shown_at <= a.created_at
      AND d.shown_at >= a.created_at - interval '7 days'
      AND (
        a.source_tool = d.selected_tool_key
        OR a.activity_data->>'recommendation_key' = d.selected_key
        OR a.activity_data->>'activation_intent' = d.selected_tool_key
      )
    WHERE a.activity_type IN (
      'activation_first_artifact_saved', 'first_artifact_created', 'artifact_saved'
    )
      AND a.created_at <= p_now
      AND a.created_at >= p_now - interval '45 days'
  )
  INSERT INTO public.recommendation_attributions (
    source_event_id, decision_id, user_id, outcome_type,
    attribution_model, attribution_weight, occurred_at, metadata
  )
  SELECT
    source_event_id, decision_id, user_id, outcome_type,
    'explicit_last_touch_v2', 1, occurred_at,
    jsonb_build_object('window', outcome_type)
  FROM candidates
  WHERE attribution_rank = 1
  ON CONFLICT (source_event_id, outcome_type) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_claimed := v_claimed + v_rows;

  -- Business milestones must also carry explicit recommendation/tool provenance.
  WITH candidates AS (
    SELECT
      a.id AS source_event_id,
      d.id AS decision_id,
      d.user_id,
      a.created_at AS occurred_at,
      row_number() OVER (
        PARTITION BY a.id
        ORDER BY d.shown_at DESC, d.id
      ) AS attribution_rank
    FROM public.user_activity_log a
    JOIN public.recommendation_decisions d
      ON d.user_id = a.user_id
      AND d.shown_at <= a.created_at
      AND d.shown_at >= a.created_at - interval '30 days'
      AND (
        a.source_tool = d.selected_tool_key
        OR a.activity_data->>'recommendation_key' = d.selected_key
      )
    WHERE a.activity_type IN (
      'business_milestone_recorded', 'first_customer_recorded',
      'customer_commitment_recorded', 'revenue_metric_recorded'
    )
      AND a.created_at <= p_now
      AND a.created_at >= p_now - interval '60 days'
  )
  INSERT INTO public.recommendation_attributions (
    source_event_id, decision_id, user_id, outcome_type,
    attribution_model, attribution_weight, occurred_at, metadata
  )
  SELECT
    source_event_id, decision_id, user_id, 'business_milestone',
    'explicit_last_touch_v2', 1, occurred_at,
    jsonb_build_object('window', 'business_milestone_30d')
  FROM candidates
  WHERE attribution_rank = 1
  ON CONFLICT (source_event_id, outcome_type) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_claimed := v_claimed + v_rows;

  -- Return outcomes are session effects: credit only the closest command-center decision.
  WITH return_windows(outcome_type, starts_after, ends_after, reward_value) AS (
    VALUES
      ('d1_return'::text, interval '24 hours', interval '48 hours', 0.10::numeric),
      ('d7_return'::text, interval '144 hours', interval '192 hours', 0.10::numeric),
      ('d30_return'::text, interval '28 days', interval '32 days', 0.15::numeric)
  ), candidates AS (
    SELECT
      a.id AS source_event_id,
      d.id AS decision_id,
      d.user_id,
      a.created_at AS occurred_at,
      w.outcome_type,
      row_number() OVER (
        PARTITION BY a.id, w.outcome_type
        ORDER BY d.shown_at DESC, d.id
      ) AS attribution_rank
    FROM return_windows w
    JOIN public.user_activity_log a
      ON a.activity_type = 'dashboard_viewed'
      AND a.created_at <= p_now
      AND a.created_at >= p_now - interval '75 days'
    JOIN public.recommendation_decisions d
      ON d.user_id = a.user_id
      AND d.surface = 'command_center'
      AND a.created_at BETWEEN d.shown_at + w.starts_after AND d.shown_at + w.ends_after
  )
  INSERT INTO public.recommendation_attributions (
    source_event_id, decision_id, user_id, outcome_type,
    attribution_model, attribution_weight, occurred_at, metadata
  )
  SELECT
    source_event_id, decision_id, user_id, outcome_type,
    'windowed_last_touch_v2', 1, occurred_at,
    jsonb_build_object('window', outcome_type)
  FROM candidates
  WHERE attribution_rank = 1
  ON CONFLICT (source_event_id, outcome_type) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_claimed := v_claimed + v_rows;

  INSERT INTO public.recommendation_outcomes (
    decision_id, user_id, outcome_type, reward_value, occurred_at,
    source_event_id, metadata, attribution_model, attribution_weight,
    maturity_window, matured_at
  )
  SELECT
    a.decision_id,
    a.user_id,
    a.outcome_type,
    CASE a.outcome_type
      WHEN 'completed' THEN 0.35
      WHEN 'artifact_24h' THEN 0.40
      WHEN 'artifact_7d' THEN 0.20
      WHEN 'd1_return' THEN 0.10
      WHEN 'd7_return' THEN 0.10
      WHEN 'd30_return' THEN 0.15
      WHEN 'business_milestone' THEN 0.80
      ELSE 0
    END * a.attribution_weight,
    a.occurred_at,
    a.source_event_id,
    a.metadata,
    a.attribution_model,
    a.attribution_weight,
    a.metadata->>'window',
    p_now
  FROM public.recommendation_attributions a
  WHERE NOT EXISTS (
    SELECT 1 FROM public.recommendation_outcomes o
    WHERE o.decision_id = a.decision_id
      AND o.outcome_type = a.outcome_type
  )
  ON CONFLICT (decision_id, outcome_type) DO NOTHING;
  GET DIAGNOSTICS v_recorded = ROW_COUNT;

  RETURN jsonb_build_object(
    'attributionsClaimed', v_claimed,
    'outcomesRecorded', v_recorded,
    'model', 'explicit_and_windowed_last_touch_v2'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.process_recommendation_delayed_outcomes_v2(
  p_now timestamptz DEFAULT now(),
  p_limit integer DEFAULT 1000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attribution jsonb;
  v_processed integer := 0;
BEGIN
  p_limit := greatest(1, least(COALESCE(p_limit, 1000), 5000));
  v_attribution := public.attribute_recommendation_outcomes_v1(p_now);

  WITH due AS (
    SELECT q.decision_id
    FROM public.recommendation_maturation_queue q
    WHERE
      (q.artifact_24h_processed_at IS NULL AND q.artifact_24h_due_at <= p_now)
      OR (q.d1_processed_at IS NULL AND q.d1_due_at <= p_now)
      OR (q.completion_7d_processed_at IS NULL AND q.completion_7d_due_at <= p_now)
      OR (q.d7_processed_at IS NULL AND q.d7_due_at <= p_now)
      OR (q.d30_processed_at IS NULL AND q.d30_due_at <= p_now)
    ORDER BY least(
      COALESCE(q.artifact_24h_due_at, 'infinity'::timestamptz),
      COALESCE(q.d1_due_at, 'infinity'::timestamptz),
      COALESCE(q.completion_7d_due_at, 'infinity'::timestamptz),
      COALESCE(q.d7_due_at, 'infinity'::timestamptz),
      COALESCE(q.d30_due_at, 'infinity'::timestamptz)
    )
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.recommendation_maturation_queue q
  SET
    artifact_24h_processed_at = CASE
      WHEN q.artifact_24h_processed_at IS NULL AND q.artifact_24h_due_at <= p_now
        THEN p_now ELSE q.artifact_24h_processed_at END,
    d1_processed_at = CASE
      WHEN q.d1_processed_at IS NULL AND q.d1_due_at <= p_now
        THEN p_now ELSE q.d1_processed_at END,
    completion_7d_processed_at = CASE
      WHEN q.completion_7d_processed_at IS NULL AND q.completion_7d_due_at <= p_now
        THEN p_now ELSE q.completion_7d_processed_at END,
    d7_processed_at = CASE
      WHEN q.d7_processed_at IS NULL AND q.d7_due_at <= p_now
        THEN p_now ELSE q.d7_processed_at END,
    d30_processed_at = CASE
      WHEN q.d30_processed_at IS NULL AND q.d30_due_at <= p_now
        THEN p_now ELSE q.d30_processed_at END,
    last_attempted_at = p_now
  FROM due
  WHERE q.decision_id = due.decision_id;
  GET DIAGNOSTICS v_processed = ROW_COUNT;

  RETURN jsonb_build_object(
    'queueRowsProcessed', v_processed,
    'attribution', v_attribution
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
  v_config public.recommendation_policy_config;
  v_rows integer;
BEGIN
  SELECT * INTO v_config
  FROM public.recommendation_policy_config WHERE singleton = true;

  WITH decision_outcomes AS (
    SELECT
      d.id,
      d.user_id,
      d.policy_version,
      d.selected_tool_key AS recommendation_family,
      d.context_segments,
      date_trunc('week', d.shown_at) AS exposure_week,
      COALESCE(sum(o.reward_value), 0)::numeric AS reward,
      COALESCE(bool_or(o.outcome_type = 'opened'), false) AS opened,
      COALESCE(bool_or(o.outcome_type = 'completed'), false) AS completed,
      COALESCE(bool_or(o.outcome_type IN ('artifact_24h', 'artifact_7d')), false) AS artifact,
      COALESCE(bool_or(o.outcome_type = 'd1_return'), false) AS d1,
      COALESCE(bool_or(o.outcome_type = 'd7_return'), false) AS d7,
      COALESCE(bool_or(o.outcome_type = 'helpful'), false) AS helpful,
      COALESCE(bool_or(o.outcome_type = 'not_relevant'), false) AS negative,
      COALESCE(bool_or(o.outcome_type = 'business_milestone'), false) AS business_milestone
    FROM public.recommendation_decisions d
    LEFT JOIN public.recommendation_outcomes o ON o.decision_id = d.id
    WHERE d.shown_at <= p_now - interval '24 hours'
      AND d.shown_at >= p_now - interval '180 days'
      AND d.assignment <> 'control'
    GROUP BY d.id
  ), contribution_capped AS (
    SELECT *
    FROM (
      SELECT
        decision_outcomes.*,
        row_number() OVER (
          PARTITION BY user_id, policy_version, recommendation_family, exposure_week
          ORDER BY id
        ) AS contribution_rank
      FROM decision_outcomes
    ) ranked
    WHERE contribution_rank = 1
  ), expanded AS (
    SELECT
      contribution_capped.*,
      segment_key
    FROM contribution_capped
    CROSS JOIN LATERAL unnest(
      public.recommendation_segment_keys_v1(context_segments)
    ) segment_key
  ), aggregate AS (
    SELECT
      policy_version,
      segment_key,
      recommendation_family,
      count(*)::integer AS exposures,
      count(DISTINCT user_id)::integer AS unique_users,
      count(*) FILTER (
        WHERE completed OR artifact OR helpful OR business_milestone
      )::integer AS positives,
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
  ), global_rate AS (
    SELECT
      policy_version,
      COALESCE(
        (sum(positives) + 1)::numeric / NULLIF(sum(exposures) + 2, 0),
        0.5
      ) AS success_rate
    FROM aggregate
    WHERE segment_key = 'global'
    GROUP BY policy_version
  ), posterior AS (
    SELECT
      a.*,
      1 + v_config.bayesian_prior_strength * g.success_rate + a.positives AS alpha,
      1 + v_config.bayesian_prior_strength * (1 - g.success_rate)
        + greatest(0, a.exposures - a.positives) AS beta
    FROM aggregate a
    JOIN global_rate g USING (policy_version)
  ), scored AS (
    SELECT
      posterior.*,
      alpha / NULLIF(alpha + beta, 0) AS posterior_mean,
      (alpha * beta)
        / NULLIF(power(alpha + beta, 2) * (alpha + beta + 1), 0)
        AS posterior_variance
    FROM posterior
  )
  INSERT INTO public.recommendation_segment_priors (
    policy_version, segment_key, recommendation_family, matured_exposures,
    opened_users, completed_users, artifact_users, d1_users, d7_users,
    helpful_users, negative_users, reward_sum, raw_reward, smoothed_score,
    eligible, updated_at, unique_users, effective_sample_size, positive_users,
    bayesian_alpha, bayesian_beta, bayesian_mean, bayesian_lower_bound,
    posterior_variance, negative_rate
  )
  SELECT
    policy_version,
    segment_key,
    recommendation_family,
    exposures,
    opened,
    completed,
    artifacts,
    d1,
    d7,
    helpful,
    negative,
    reward_sum,
    round(reward_sum / NULLIF(exposures, 0), 6),
    round(greatest(0, posterior_mean - 1.64 * sqrt(greatest(0, posterior_variance))), 6),
    exposures >= v_config.min_segment_samples
      AND unique_users >= v_config.min_unique_users,
    p_now,
    unique_users,
    exposures,
    positives,
    alpha,
    beta,
    round(posterior_mean, 6),
    round(greatest(0, posterior_mean - 1.64 * sqrt(greatest(0, posterior_variance))), 6),
    round(posterior_variance, 8),
    round(negative::numeric / NULLIF(exposures, 0), 6)
  FROM scored
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
    updated_at = EXCLUDED.updated_at,
    unique_users = EXCLUDED.unique_users,
    effective_sample_size = EXCLUDED.effective_sample_size,
    positive_users = EXCLUDED.positive_users,
    bayesian_alpha = EXCLUDED.bayesian_alpha,
    bayesian_beta = EXCLUDED.bayesian_beta,
    bayesian_mean = EXCLUDED.bayesian_mean,
    bayesian_lower_bound = EXCLUDED.bayesian_lower_bound,
    posterior_variance = EXCLUDED.posterior_variance,
    negative_rate = EXCLUDED.negative_rate;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_recommendation_family_health_v2(
  p_now timestamptz DEFAULT now()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.recommendation_policy_config;
  v_rows integer;
BEGIN
  SELECT * INTO v_config
  FROM public.recommendation_policy_config WHERE singleton = true;

  WITH per_decision AS (
    SELECT
      d.id,
      d.user_id,
      d.policy_version,
      d.selected_tool_key AS family,
      d.shown_at,
      COALESCE(sum(o.reward_value), 0)::numeric AS reward,
      COALESCE(bool_or(o.outcome_type = 'not_relevant'), false) AS negative,
      row_number() OVER (
        PARTITION BY d.user_id, d.policy_version, d.selected_tool_key,
          date_trunc('week', d.shown_at)
        ORDER BY d.shown_at
      ) AS contribution_rank
    FROM public.recommendation_decisions d
    LEFT JOIN public.recommendation_outcomes o ON o.decision_id = d.id
    WHERE d.shown_at >= p_now - interval '35 days'
      AND d.shown_at <= p_now - interval '24 hours'
      AND d.assignment <> 'control'
    GROUP BY d.id
  ), capped AS (
    SELECT * FROM per_decision WHERE contribution_rank = 1
  ), aggregate AS (
    SELECT
      policy_version,
      family,
      count(*) FILTER (WHERE shown_at >= p_now - interval '7 days')::integer AS current_exposures,
      count(DISTINCT user_id) FILTER (WHERE shown_at >= p_now - interval '7 days')::integer
        AS current_unique_users,
      COALESCE(avg(reward) FILTER (WHERE shown_at >= p_now - interval '7 days'), 0)::numeric
        AS current_reward,
      COALESCE(
        count(*) FILTER (
          WHERE shown_at >= p_now - interval '7 days' AND negative
        )::numeric
        / NULLIF(count(*) FILTER (WHERE shown_at >= p_now - interval '7 days'), 0),
        0
      ) AS current_negative,
      count(*) FILTER (
        WHERE shown_at < p_now - interval '7 days'
      )::integer AS baseline_exposures,
      COALESCE(avg(reward) FILTER (
        WHERE shown_at < p_now - interval '7 days'
      ), 0)::numeric AS baseline_reward
    FROM capped
    GROUP BY policy_version, family
  ), classified AS (
    SELECT
      aggregate.*,
      CASE
        WHEN baseline_exposures > 0 AND baseline_reward <> 0
          THEN (current_reward - baseline_reward) / abs(baseline_reward)
        ELSE NULL
      END AS drift,
      CASE
        WHEN current_exposures < v_config.min_unique_users THEN 'insufficient'
        WHEN current_negative > v_config.max_negative_feedback_rate
          OR (
            baseline_exposures >= v_config.min_segment_samples
            AND baseline_reward > 0
            AND current_reward < baseline_reward * (1 - v_config.max_reward_drift)
          ) THEN 'critical'
        WHEN current_negative > v_config.max_negative_feedback_rate * 0.75
          OR (
            baseline_exposures >= v_config.min_segment_samples
            AND baseline_reward > 0
            AND current_reward < baseline_reward * (1 - v_config.max_reward_drift * 0.6)
          ) THEN 'watch'
        ELSE 'healthy'
      END AS health_status
    FROM aggregate
  )
  INSERT INTO public.recommendation_family_health (
    policy_version, recommendation_family, current_exposures,
    current_unique_users, current_average_reward, current_negative_rate,
    baseline_exposures, baseline_average_reward, reward_drift, status,
    reason_codes, updated_at
  )
  SELECT
    policy_version,
    family,
    current_exposures,
    current_unique_users,
    round(current_reward, 6),
    round(current_negative, 6),
    baseline_exposures,
    round(baseline_reward, 6),
    round(drift, 6),
    health_status,
    CASE
      WHEN health_status = 'critical' AND current_negative > v_config.max_negative_feedback_rate
        THEN ARRAY['negative_feedback_guardrail']::text[]
      WHEN health_status IN ('critical', 'watch')
        THEN ARRAY['reward_drift']::text[]
      WHEN health_status = 'insufficient'
        THEN ARRAY['insufficient_recent_sample']::text[]
      ELSE ARRAY['healthy']::text[]
    END,
    p_now
  FROM classified
  ON CONFLICT (policy_version, recommendation_family) DO UPDATE SET
    current_exposures = EXCLUDED.current_exposures,
    current_unique_users = EXCLUDED.current_unique_users,
    current_average_reward = EXCLUDED.current_average_reward,
    current_negative_rate = EXCLUDED.current_negative_rate,
    baseline_exposures = EXCLUDED.baseline_exposures,
    baseline_average_reward = EXCLUDED.baseline_average_reward,
    reward_drift = EXCLUDED.reward_drift,
    status = EXCLUDED.status,
    reason_codes = EXCLUDED.reason_codes,
    updated_at = EXCLUDED.updated_at;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_recommendation_policy_replay_v2(
  p_from timestamptz DEFAULT now() - interval '28 days',
  p_to timestamptz DEFAULT now(),
  p_policy_version text DEFAULT NULL
)
RETURNS public.recommendation_policy_replays
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy text;
  v_min_coverage numeric;
  v_result public.recommendation_policy_replays;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_from >= p_to THEN
    RAISE EXCEPTION 'Invalid replay range' USING ERRCODE = '22023';
  END IF;
  SELECT
    COALESCE(p_policy_version, active_policy_version),
    min_replay_coverage
  INTO v_policy, v_min_coverage
  FROM public.recommendation_policy_config
  WHERE singleton = true;

  WITH historical AS (
    SELECT
      d.*,
      public.recommendation_segment_keys_v1(d.context_segments) AS segment_keys,
      COALESCE((
        SELECT sum(o.reward_value)
        FROM public.recommendation_outcomes o
        WHERE o.decision_id = d.id
      ), 0)::numeric AS observed_reward
    FROM public.recommendation_decisions d
    WHERE d.shown_at >= p_from
      AND d.shown_at < p_to
      AND d.shown_at <= now() - interval '24 hours'
      AND jsonb_array_length(d.candidate_set) > 0
  ), candidates AS (
    SELECT
      h.id AS decision_id,
      h.selected_tool_key,
      h.selection_probability,
      h.observed_reward,
      candidate.value->>'toolKey' AS candidate_family,
      candidate.ordinality::integer AS ordinal,
      count(*) OVER (PARTITION BY h.id) AS candidate_count,
      prior.bayesian_lower_bound,
      prior.segment_key
    FROM historical h
    CROSS JOIN LATERAL jsonb_array_elements(h.candidate_set)
      WITH ORDINALITY candidate(value, ordinality)
    LEFT JOIN LATERAL (
      SELECT p.bayesian_lower_bound, p.segment_key
      FROM public.recommendation_segment_priors p
      WHERE p.policy_version = v_policy
        AND p.eligible = true
        AND p.recommendation_family = candidate.value->>'toolKey'
        AND p.segment_key = ANY(h.segment_keys)
      ORDER BY array_position(h.segment_keys, p.segment_key) DESC
      LIMIT 1
    ) prior ON true
    WHERE NULLIF(candidate.value->>'toolKey', '') IS NOT NULL
  ), choices AS (
    SELECT DISTINCT ON (decision_id)
      decision_id,
      selected_tool_key,
      selection_probability,
      observed_reward,
      candidate_family AS replay_family,
      bayesian_lower_bound IS NOT NULL AS covered
    FROM candidates
    ORDER BY
      decision_id,
      (
        (1 - greatest(0, ordinal - 1)::numeric / greatest(1, candidate_count)) * 0.40
        + COALESCE(bayesian_lower_bound, 0.5) * 0.60
      ) DESC,
      ordinal
  ), aggregate AS (
    SELECT
      count(*)::integer AS decisions,
      count(*) FILTER (WHERE covered)::integer AS covered,
      count(*) FILTER (WHERE replay_family = selected_tool_key)::integer AS matched,
      COALESCE(avg(observed_reward), 0)::numeric AS observed_reward,
      COALESCE(avg(
        CASE WHEN replay_family = selected_tool_key
          THEN observed_reward * least(10, 1 / greatest(0.000001, selection_probability))
          ELSE 0 END
      ), 0)::numeric AS ips_reward
    FROM choices
  )
  INSERT INTO public.recommendation_policy_replays (
    policy_version, window_start, window_end, decisions, covered_decisions,
    matched_decisions, replay_coverage, policy_agreement,
    inverse_propensity_reward, observed_reward, guardrail_passed, metrics
  )
  SELECT
    v_policy,
    p_from,
    p_to,
    decisions,
    covered,
    matched,
    round(COALESCE(covered::numeric / NULLIF(decisions, 0), 0), 6),
    round(COALESCE(matched::numeric / NULLIF(decisions, 0), 0), 6),
    round(ips_reward, 6),
    round(observed_reward, 6),
    decisions >= 20
      AND COALESCE(covered::numeric / NULLIF(decisions, 0), 0) >= v_min_coverage,
    jsonb_build_object(
      'estimator', 'capped_inverse_propensity_v2',
      'maxWeight', 10,
      'maturedWindow', '24h'
    )
  FROM aggregate
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.detect_recommendation_quality_drift_v2(
  p_now timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.recommendation_policy_config;
  v_prior_rows integer;
  v_health_rows integer;
  v_alerts integer := 0;
  v_lagged integer := 0;
  v_replay public.recommendation_policy_replays;
BEGIN
  SELECT * INTO v_config
  FROM public.recommendation_policy_config WHERE singleton = true;
  v_prior_rows := public.refresh_recommendation_segment_priors_v1(p_now);
  v_health_rows := public.refresh_recommendation_family_health_v2(p_now);

  INSERT INTO public.recommendation_quality_alerts (
    policy_version, recommendation_family, alert_type, severity,
    observed_value, threshold_value, reason_codes, metadata
  )
  SELECT
    h.policy_version,
    h.recommendation_family,
    CASE WHEN h.current_negative_rate > v_config.max_negative_feedback_rate
      THEN 'negative_feedback' ELSE 'reward_drift' END,
    CASE WHEN h.status = 'critical' THEN 'critical' ELSE 'warning' END,
    CASE WHEN h.current_negative_rate > v_config.max_negative_feedback_rate
      THEN h.current_negative_rate ELSE h.reward_drift END,
    CASE WHEN h.current_negative_rate > v_config.max_negative_feedback_rate
      THEN v_config.max_negative_feedback_rate ELSE -v_config.max_reward_drift END,
    h.reason_codes,
    jsonb_build_object(
      'currentExposures', h.current_exposures,
      'currentUniqueUsers', h.current_unique_users,
      'baselineExposures', h.baseline_exposures
    )
  FROM public.recommendation_family_health h
  WHERE h.policy_version = v_config.active_policy_version
    AND h.status IN ('watch', 'critical')
    AND NOT EXISTS (
      SELECT 1
      FROM public.recommendation_quality_alerts a
      WHERE a.policy_version = h.policy_version
        AND a.recommendation_family = h.recommendation_family
        AND a.alert_type = CASE
          WHEN h.current_negative_rate > v_config.max_negative_feedback_rate
            THEN 'negative_feedback' ELSE 'reward_drift' END
        AND a.resolved_at IS NULL
    );
  GET DIAGNOSTICS v_alerts = ROW_COUNT;

  UPDATE public.recommendation_quality_alerts a
  SET resolved_at = p_now
  WHERE a.resolved_at IS NULL
    AND a.alert_type IN ('reward_drift', 'negative_feedback')
    AND EXISTS (
      SELECT 1
      FROM public.recommendation_family_health h
      WHERE h.policy_version = a.policy_version
        AND h.recommendation_family = a.recommendation_family
        AND h.status = 'healthy'
    );

  SELECT count(*) INTO v_lagged
  FROM public.recommendation_maturation_queue q
  WHERE (
    q.artifact_24h_processed_at IS NULL
    AND q.artifact_24h_due_at < p_now - make_interval(hours => v_config.max_data_delay_hours)
  ) OR (
    q.d1_processed_at IS NULL
    AND q.d1_due_at < p_now - make_interval(hours => v_config.max_data_delay_hours)
  ) OR (
    q.d7_processed_at IS NULL
    AND q.d7_due_at < p_now - make_interval(hours => v_config.max_data_delay_hours)
  );

  IF v_lagged > 0 AND NOT EXISTS (
    SELECT 1 FROM public.recommendation_quality_alerts
    WHERE policy_version = v_config.active_policy_version
      AND alert_type = 'pipeline_delay'
      AND resolved_at IS NULL
  ) THEN
    INSERT INTO public.recommendation_quality_alerts (
      policy_version, alert_type, severity, observed_value,
      threshold_value, reason_codes
    ) VALUES (
      v_config.active_policy_version,
      'pipeline_delay',
      CASE WHEN v_lagged >= 100 THEN 'critical' ELSE 'warning' END,
      v_lagged,
      0,
      ARRAY['maturation_queue_delayed']
    );
    v_alerts := v_alerts + 1;
  ELSIF v_lagged = 0 THEN
    UPDATE public.recommendation_quality_alerts
    SET resolved_at = p_now
    WHERE policy_version = v_config.active_policy_version
      AND alert_type = 'pipeline_delay'
      AND resolved_at IS NULL;
  END IF;

  SELECT * INTO v_replay
  FROM public.recommendation_policy_replays
  WHERE policy_version = v_config.active_policy_version
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_replay.id IS NOT NULL
    AND v_replay.decisions >= 20
    AND NOT v_replay.guardrail_passed
    AND NOT EXISTS (
      SELECT 1 FROM public.recommendation_quality_alerts
      WHERE policy_version = v_config.active_policy_version
        AND alert_type = 'replay_coverage'
        AND resolved_at IS NULL
    ) THEN
    INSERT INTO public.recommendation_quality_alerts (
      policy_version, alert_type, severity, observed_value,
      threshold_value, reason_codes
    ) VALUES (
      v_config.active_policy_version,
      'replay_coverage',
      'warning',
      v_replay.replay_coverage,
      v_config.min_replay_coverage,
      ARRAY['offline_replay_coverage_below_guardrail']
    );
    v_alerts := v_alerts + 1;
  END IF;

  IF v_config.auto_pause_critical_drift AND EXISTS (
    SELECT 1 FROM public.recommendation_quality_alerts
    WHERE policy_version = v_config.active_policy_version
      AND severity = 'critical'
      AND resolved_at IS NULL
  ) THEN
    UPDATE public.recommendation_policy_config
    SET status = 'paused', updated_at = p_now
    WHERE singleton = true;
  END IF;

  RETURN jsonb_build_object(
    'priorRows', v_prior_rows,
    'healthRows', v_health_rows,
    'alertsCreated', v_alerts,
    'laggedQueueRows', v_lagged
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.recalibrate_recommendation_policy_v2(
  p_now timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delayed jsonb;
  v_core jsonb;
  v_replay public.recommendation_policy_replays;
  v_drift jsonb;
BEGIN
  v_delayed := public.process_recommendation_delayed_outcomes_v2(p_now, 5000);
  v_core := public.recalibrate_recommendation_policy_v1(p_now);
  v_replay := public.run_recommendation_policy_replay_v2(
    p_now - interval '28 days', p_now, NULL
  );
  v_drift := public.detect_recommendation_quality_drift_v2(p_now);

  RETURN jsonb_build_object(
    'delayedOutcomes', v_delayed,
    'corePolicy', v_core,
    'offlineReplay', to_jsonb(v_replay),
    'qualityDrift', v_drift
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_recommendation_learning_report_v2(
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
  v_base jsonb;
BEGIN
  v_base := public.get_recommendation_learning_report_v1(p_from, p_to);

  RETURN v_base || jsonb_build_object(
    'familyHealth', COALESCE((
      SELECT jsonb_agg(to_jsonb(h) ORDER BY
        CASE h.status
          WHEN 'critical' THEN 1
          WHEN 'watch' THEN 2
          WHEN 'healthy' THEN 3
          ELSE 4
        END,
        h.recommendation_family
      )
      FROM public.recommendation_family_health h
      WHERE h.policy_version = (
        SELECT active_policy_version
        FROM public.recommendation_policy_config
        WHERE singleton = true
      )
    ), '[]'::jsonb),
    'openAlerts', COALESCE((
      SELECT jsonb_agg(to_jsonb(a) ORDER BY a.detected_at DESC)
      FROM public.recommendation_quality_alerts a
      WHERE a.resolved_at IS NULL
    ), '[]'::jsonb),
    'latestReplay', (
      SELECT to_jsonb(r)
      FROM public.recommendation_policy_replays r
      ORDER BY r.created_at DESC
      LIMIT 1
    ),
    'maturationBacklog', (
      SELECT count(*)
      FROM public.recommendation_maturation_queue q
      WHERE (
        q.artifact_24h_processed_at IS NULL AND q.artifact_24h_due_at <= now()
      ) OR (
        q.d1_processed_at IS NULL AND q.d1_due_at <= now()
      ) OR (
        q.completion_7d_processed_at IS NULL AND q.completion_7d_due_at <= now()
      ) OR (
        q.d7_processed_at IS NULL AND q.d7_due_at <= now()
      ) OR (
        q.d30_processed_at IS NULL AND q.d30_due_at <= now()
      )
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.capture_recommendation_decision_metadata_v2() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_recommendation_maturation_v2() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_recommendation_delayed_outcomes_v2(timestamptz, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_recommendation_family_health_v2(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.run_recommendation_policy_replay_v2(timestamptz, timestamptz, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.detect_recommendation_quality_drift_v2(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalibrate_recommendation_policy_v2(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_recommendation_learning_report_v2(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.process_recommendation_delayed_outcomes_v2(timestamptz, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_recommendation_family_health_v2(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.run_recommendation_policy_replay_v2(timestamptz, timestamptz, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.detect_recommendation_quality_drift_v2(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.recalibrate_recommendation_policy_v2(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_recommendation_learning_report_v2(timestamptz, timestamptz) TO authenticated;

DO $$
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM cron.job
      WHERE jobname = 'recommendation-outcome-attribution-hourly'
    ) THEN
      PERFORM cron.unschedule('recommendation-outcome-attribution-hourly');
    END IF;
    IF EXISTS (
      SELECT 1 FROM cron.job
      WHERE jobname = 'recommendation-policy-recalibration-weekly'
    ) THEN
      PERFORM cron.unschedule('recommendation-policy-recalibration-weekly');
    END IF;
    IF EXISTS (
      SELECT 1 FROM cron.job
      WHERE jobname = 'recommendation-delayed-outcomes-hourly-v2'
    ) THEN
      PERFORM cron.unschedule('recommendation-delayed-outcomes-hourly-v2');
    END IF;
    IF EXISTS (
      SELECT 1 FROM cron.job
      WHERE jobname = 'recommendation-quality-monitor-daily-v2'
    ) THEN
      PERFORM cron.unschedule('recommendation-quality-monitor-daily-v2');
    END IF;
    IF EXISTS (
      SELECT 1 FROM cron.job
      WHERE jobname = 'recommendation-policy-recalibration-weekly-v2'
    ) THEN
      PERFORM cron.unschedule('recommendation-policy-recalibration-weekly-v2');
    END IF;

    PERFORM cron.schedule(
      'recommendation-delayed-outcomes-hourly-v2',
      '17 * * * *',
      $job$SELECT public.process_recommendation_delayed_outcomes_v2();$job$
    );
    PERFORM cron.schedule(
      'recommendation-quality-monitor-daily-v2',
      '41 3 * * *',
      $job$SELECT public.detect_recommendation_quality_drift_v2();$job$
    );
    PERFORM cron.schedule(
      'recommendation-policy-recalibration-weekly-v2',
      '23 4 * * 1',
      $job$SELECT public.recalibrate_recommendation_policy_v2();$job$
    );
  END IF;
END;
$$;

COMMENT ON COLUMN public.recommendation_segment_priors.bayesian_lower_bound IS
  'Conservative 90% one-sided posterior bound used by visible ranking.';
COMMENT ON TABLE public.recommendation_attributions IS
  'One privacy-safe last-touch claim per source activity and outcome type.';
COMMENT ON TABLE public.recommendation_maturation_queue IS
  'Explicit processing schedule for 24h, D1, 7d, D7, and D30 outcomes.';
COMMENT ON TABLE public.recommendation_policy_replays IS
  'Offline counterfactual policy checks using capped inverse-propensity scoring.';
COMMENT ON TABLE public.recommendation_quality_alerts IS
  'Actionable drift, feedback, replay coverage, and data-pipeline alerts.';
