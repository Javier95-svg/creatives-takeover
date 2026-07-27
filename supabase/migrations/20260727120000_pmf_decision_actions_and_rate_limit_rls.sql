-- Evidence-to-action completion slice.
--
-- 1. Protect the internal rate-limit ledger from direct client access while
--    preserving service-role and SECURITY DEFINER rate-limit calls.
-- 2. Turn every saved PMF decision into one idempotent dashboard action.

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.api_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.api_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.assert_rate_limit(
  p_key text,
  p_user_id uuid,
  p_max_per_minute int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ts_threshold timestamptz := now() - interval '60 seconds';
  cnt int;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) = 0 OR p_max_per_minute < 1 THEN
    RAISE EXCEPTION 'invalid_rate_limit_request';
  END IF;

  DELETE FROM public.api_rate_limits
  WHERE created_at < ts_threshold;

  SELECT count(*)
  INTO cnt
  FROM public.api_rate_limits
  WHERE key = p_key
    AND (p_user_id IS NULL OR user_id = p_user_id)
    AND created_at >= ts_threshold;

  IF cnt >= p_max_per_minute THEN
    RAISE EXCEPTION 'rate_limit_exceeded';
  END IF;

  INSERT INTO public.api_rate_limits(key, user_id)
  VALUES (p_key, p_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.assert_rate_limit(text, uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_rate_limit(text, uuid, int) TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS daily_tasks_pmf_decision_action_unique
  ON public.daily_tasks(user_id, recommendation_key)
  WHERE recommendation_key LIKE 'pmf:decision:%';

CREATE OR REPLACE FUNCTION public.sync_pmf_decision_daily_task_v1(
  p_analysis_id uuid,
  p_task_text text,
  p_task_description text,
  p_source_route text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_task_id uuid;
  v_recommendation_key text := 'pmf:decision:' || p_analysis_id::text;
  v_route text := CASE
    WHEN p_source_route = '/mvp-builder?source=pmf-decision' THEN p_source_route
    ELSE '/pmf-lab'
  END;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.pmf_analysis_results
    WHERE id = p_analysis_id
      AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'pmf_analysis_not_found';
  END IF;

  IF length(trim(COALESCE(p_task_text, ''))) < 3 THEN
    RAISE EXCEPTION 'task_text_required';
  END IF;

  INSERT INTO public.daily_tasks (
    user_id,
    task_text,
    task_description,
    task_date,
    deadline_time,
    task_source,
    priority,
    source_tool,
    source_route,
    intent_type,
    recommendation_key,
    recommendation_reason,
    recommendation_status,
    effort_estimate,
    business_impact_score,
    stage_alignment_score,
    ai_generated,
    is_foundational,
    is_completed
  )
  VALUES (
    v_user_id,
    left(trim(p_task_text), 240),
    left(trim(COALESCE(p_task_description, '')), 1200),
    current_date,
    current_date + interval '23 hours 59 minutes',
    'platform',
    'high',
    'pmf-lab',
    v_route,
    'daily_momentum',
    v_recommendation_key,
    'A saved evidence decision should end in one checkable founder action.',
    'accepted',
    30,
    9,
    9,
    false,
    false,
    false
  )
  ON CONFLICT (user_id, recommendation_key)
    WHERE recommendation_key LIKE 'pmf:decision:%'
  DO UPDATE SET
    task_text = CASE
      WHEN public.daily_tasks.is_completed THEN public.daily_tasks.task_text
      ELSE EXCLUDED.task_text
    END,
    task_description = CASE
      WHEN public.daily_tasks.is_completed THEN public.daily_tasks.task_description
      ELSE EXCLUDED.task_description
    END,
    task_date = CASE
      WHEN public.daily_tasks.is_completed THEN public.daily_tasks.task_date
      ELSE EXCLUDED.task_date
    END,
    deadline_time = CASE
      WHEN public.daily_tasks.is_completed THEN public.daily_tasks.deadline_time
      ELSE EXCLUDED.deadline_time
    END,
    source_route = CASE
      WHEN public.daily_tasks.is_completed THEN public.daily_tasks.source_route
      ELSE EXCLUDED.source_route
    END,
    updated_at = now()
  RETURNING id INTO v_task_id;

  RETURN v_task_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_pmf_decision_daily_task_v1(uuid, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_pmf_decision_daily_task_v1(uuid, text, text, text)
  TO authenticated;
