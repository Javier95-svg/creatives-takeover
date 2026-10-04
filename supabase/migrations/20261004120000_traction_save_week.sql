-- Save a Traction Engine week in one transaction.
--
-- The page used to upsert the weekly log, delete that week's experiments and
-- insert the new ones as three separate requests. If the insert failed, the
-- week was left with no experiments at all. This function does all three
-- together: either the whole week is saved or nothing changes.
--
-- SECURITY INVOKER keeps row level security in force; every row is written for
-- auth.uid(), and an experiment can only point at one of the caller's sprints.

CREATE OR REPLACE FUNCTION public.save_traction_week(p_log jsonb, p_experiments jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_log_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF jsonb_typeof(p_experiments) IS DISTINCT FROM 'array' OR jsonb_array_length(p_experiments) = 0 THEN
    RAISE EXCEPTION 'A week needs at least one experiment';
  END IF;

  INSERT INTO public.traction_engine_weekly_logs (
    user_id, week_start_date, new_users, seven_day_active_users, thirty_day_active_users,
    primary_acquisition_channel, product_category, revenue, combined_score, consistency_score,
    channel_efficiency_score, experiment_quality_score, retention_health_score,
    consistency_streak_weeks, channel_quality_signal, prioritized_recommendation,
    phase_seven_ready, score_breakdown, verification_mode, calculation_version
  ) VALUES (
    v_user_id,
    (p_log->>'week_start_date')::date,
    COALESCE((p_log->>'new_users')::integer, 0),
    COALESCE((p_log->>'seven_day_active_users')::integer, 0),
    COALESCE((p_log->>'thirty_day_active_users')::integer, 0),
    COALESCE(p_log->>'primary_acquisition_channel', ''),
    COALESCE(p_log->>'product_category', 'other'),
    NULLIF(p_log->>'revenue', '')::numeric,
    COALESCE((p_log->>'combined_score')::integer, 0),
    COALESCE((p_log->>'consistency_score')::integer, 0),
    COALESCE((p_log->>'channel_efficiency_score')::integer, 0),
    COALESCE((p_log->>'experiment_quality_score')::integer, 0),
    COALESCE((p_log->>'retention_health_score')::integer, 0),
    COALESCE((p_log->>'consistency_streak_weeks')::integer, 0),
    COALESCE(p_log->>'channel_quality_signal', ''),
    COALESCE(p_log->>'prioritized_recommendation', ''),
    COALESCE((p_log->>'phase_seven_ready')::boolean, false),
    COALESCE(p_log->'score_breakdown', '{}'::jsonb),
    COALESCE(p_log->>'verification_mode', 'founder_reported'),
    COALESCE((p_log->>'calculation_version')::integer, 1)
  )
  ON CONFLICT (user_id, week_start_date) DO UPDATE SET
    new_users = EXCLUDED.new_users,
    seven_day_active_users = EXCLUDED.seven_day_active_users,
    thirty_day_active_users = EXCLUDED.thirty_day_active_users,
    primary_acquisition_channel = EXCLUDED.primary_acquisition_channel,
    product_category = EXCLUDED.product_category,
    revenue = EXCLUDED.revenue,
    combined_score = EXCLUDED.combined_score,
    consistency_score = EXCLUDED.consistency_score,
    channel_efficiency_score = EXCLUDED.channel_efficiency_score,
    experiment_quality_score = EXCLUDED.experiment_quality_score,
    retention_health_score = EXCLUDED.retention_health_score,
    consistency_streak_weeks = EXCLUDED.consistency_streak_weeks,
    channel_quality_signal = EXCLUDED.channel_quality_signal,
    prioritized_recommendation = EXCLUDED.prioritized_recommendation,
    phase_seven_ready = EXCLUDED.phase_seven_ready,
    score_breakdown = EXCLUDED.score_breakdown,
    verification_mode = EXCLUDED.verification_mode,
    calculation_version = EXCLUDED.calculation_version,
    updated_at = now()
  RETURNING id INTO v_log_id;

  DELETE FROM public.traction_engine_experiments
  WHERE weekly_log_id = v_log_id AND user_id = v_user_id;

  INSERT INTO public.traction_engine_experiments (
    user_id, weekly_log_id, sprint_id, channel, hypothesis, action_taken, target_metric,
    target_value, result_value, time_invested_hours, decision, recommended_decision,
    override_rationale, assumption_fingerprint, assumption_status, pass, efficiency_score,
    quality_score, sample_size
  )
  SELECT
    v_user_id,
    v_log_id,
    sprint.id,
    e->>'channel',
    e->>'hypothesis',
    e->>'action_taken',
    e->>'target_metric',
    COALESCE((e->>'target_value')::numeric, 0),
    COALESCE((e->>'result_value')::numeric, 0),
    COALESCE((e->>'time_invested_hours')::numeric, 0),
    e->>'decision',
    e->>'recommended_decision',
    e->>'override_rationale',
    e->>'assumption_fingerprint',
    e->>'assumption_status',
    COALESCE((e->>'pass')::boolean, false),
    COALESCE((e->>'efficiency_score')::integer, 0),
    COALESCE((e->>'quality_score')::integer, 0),
    NULLIF(e->>'sample_size', '')::numeric
  FROM jsonb_array_elements(p_experiments) AS e
  LEFT JOIN public.traction_engine_sprints sprint
    ON sprint.id = NULLIF(e->>'sprint_id', '')::uuid AND sprint.user_id = v_user_id;

  RETURN v_log_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_traction_week(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_traction_week(jsonb, jsonb) TO authenticated;

COMMENT ON FUNCTION public.save_traction_week(jsonb, jsonb) IS
  'Saves a Traction Engine weekly log and replaces its experiments in one transaction.';
