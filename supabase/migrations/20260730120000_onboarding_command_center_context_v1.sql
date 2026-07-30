-- Canonical onboarding session + dashboard-personalization context.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_checklist_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS profile_checklist_dismissed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.onboarding_rollout_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  adaptive_percent integer NOT NULL DEFAULT 10 CHECK (adaptive_percent BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.onboarding_rollout_config (singleton, adaptive_percent)
VALUES (true, 10)
ON CONFLICT (singleton) DO NOTHING;

ALTER TABLE public.onboarding_rollout_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.onboarding_rollout_config FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.onboarding_rollout_config TO service_role;

CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version = 1),
  flow_version text NOT NULL CHECK (flow_version IN ('control_v6', 'adaptive_v1')),
  rollout_variant text NOT NULL CHECK (rollout_variant IN ('control_v6', 'adaptive_v1')),
  source text NOT NULL DEFAULT 'direct' CHECK (length(source) BETWEEN 1 AND 80),
  plan_snapshot text,
  device_snapshot text CHECK (device_snapshot IS NULL OR device_snapshot IN ('mobile', 'desktop')),
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  current_step integer NOT NULL DEFAULT 0 CHECK (current_step BETWEEN 0 AND 20),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(answers) = 'object'),
  derived_context jsonb CHECK (derived_context IS NULL OR jsonb_typeof(derived_context) = 'object'),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  abandoned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_sessions_one_active_per_user_idx
  ON public.onboarding_sessions (user_id)
  WHERE status = 'in_progress';
CREATE INDEX IF NOT EXISTS onboarding_sessions_cohort_idx
  ON public.onboarding_sessions (rollout_variant, started_at, completed_at);
CREATE INDEX IF NOT EXISTS onboarding_sessions_user_completed_idx
  ON public.onboarding_sessions (user_id, completed_at DESC)
  WHERE status = 'completed';

ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own onboarding sessions" ON public.onboarding_sessions;
CREATE POLICY "Users read own onboarding sessions"
  ON public.onboarding_sessions FOR SELECT
  USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.onboarding_sessions FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.onboarding_sessions TO authenticated;
GRANT ALL ON TABLE public.onboarding_sessions TO service_role;

DROP TRIGGER IF EXISTS set_onboarding_sessions_updated_at ON public.onboarding_sessions;
CREATE TRIGGER set_onboarding_sessions_updated_at
  BEFORE UPDATE ON public.onboarding_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.begin_onboarding_v1(
  p_source text DEFAULT 'direct',
  p_plan text DEFAULT NULL,
  p_device text DEFAULT NULL
)
RETURNS public.onboarding_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_session public.onboarding_sessions;
  v_variant text;
  v_rollout_percent integer := 10;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_device IS NOT NULL AND p_device NOT IN ('mobile', 'desktop') THEN
    RAISE EXCEPTION 'Invalid device' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_session
  FROM public.onboarding_sessions
  WHERE user_id = v_user AND status = 'in_progress'
  ORDER BY started_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN v_session;
  END IF;

  SELECT adaptive_percent INTO v_rollout_percent
  FROM public.onboarding_rollout_config
  WHERE singleton = true;

  -- Durable, deterministic assignment. Operations can safely ramp the
  -- server-owned percentage; existing sessions never change variants.
  v_variant := CASE
    WHEN mod(abs(hashtext(v_user::text || ':adaptive_onboarding_v1')::bigint), 100) < COALESCE(v_rollout_percent, 10)
      THEN 'adaptive_v1'
    ELSE 'control_v6'
  END;

  INSERT INTO public.onboarding_sessions (
    user_id, flow_version, rollout_variant, source, plan_snapshot, device_snapshot
  ) VALUES (
    v_user,
    v_variant,
    v_variant,
    left(COALESCE(NULLIF(trim(p_source), ''), 'direct'), 80),
    NULLIF(trim(p_plan), ''),
    p_device
  )
  RETURNING * INTO v_session;

  INSERT INTO public.user_activity_log (
    user_id, activity_type, activity_data, page_path,
    source_tool, source_entity_type, source_entity_id, event_key
  ) VALUES (
    v_user,
    'onboarding_started',
    jsonb_build_object(
      'onboarding_session_id', v_session.id,
      'flow_version', v_session.flow_version,
      'rollout_variant', v_session.rollout_variant,
      'source', v_session.source,
      'plan', v_session.plan_snapshot,
      'device', v_session.device_snapshot
    ),
    '/onboarding',
    'onboarding',
    'onboarding_session',
    v_session.id::text,
    'onboarding:' || v_session.id::text || ':started'
  )
  ON CONFLICT (user_id, event_key) DO NOTHING;

  RETURN v_session;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_onboarding_progress_v1(
  p_session_id uuid,
  p_current_step integer,
  p_answer_patch jsonb
)
RETURNS public.onboarding_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_session public.onboarding_sessions;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_current_step < 0 OR p_current_step > 20 THEN
    RAISE EXCEPTION 'Invalid onboarding step' USING ERRCODE = '22023';
  END IF;
  IF p_answer_patch IS NULL OR jsonb_typeof(p_answer_patch) <> 'object' THEN
    RAISE EXCEPTION 'Answer patch must be an object' USING ERRCODE = '22023';
  END IF;
  IF p_answer_patch ? 'startupBrief'
    AND length(trim(COALESCE(p_answer_patch->>'startupBrief', ''))) > 280 THEN
    RAISE EXCEPTION 'Startup brief is too long' USING ERRCODE = '22023';
  END IF;
  IF p_answer_patch ? 'country' AND length(trim(COALESCE(p_answer_patch->>'country', ''))) > 100 THEN
    RAISE EXCEPTION 'Country is too long' USING ERRCODE = '22023';
  END IF;

  UPDATE public.onboarding_sessions
  SET
    current_step = GREATEST(current_step, p_current_step),
    answers = answers || p_answer_patch
  WHERE id = p_session_id
    AND user_id = v_user
    AND status = 'in_progress'
  RETURNING * INTO v_session;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active onboarding session not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.user_activity_log (
    user_id, activity_type, activity_data, page_path,
    source_tool, source_entity_type, source_entity_id, event_key
  ) VALUES (
    v_user,
    'onboarding_step_completed',
    jsonb_build_object(
      'onboarding_session_id', v_session.id,
      'flow_version', v_session.flow_version,
      'rollout_variant', v_session.rollout_variant,
      'step', p_current_step,
      'total_steps', CASE WHEN v_session.flow_version = 'adaptive_v1' THEN 7 ELSE 8 END
    ),
    '/onboarding',
    'onboarding',
    'onboarding_session',
    v_session.id::text,
    'onboarding:' || v_session.id::text || ':step:' || p_current_step::text
  )
  ON CONFLICT (user_id, event_key) DO NOTHING;

  RETURN v_session;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_onboarding_v1(
  p_session_id uuid,
  p_answers jsonb,
  p_context jsonb,
  p_profile_updates jsonb DEFAULT '{}'::jsonb,
  p_preference_patch jsonb DEFAULT '{}'::jsonb,
  p_routine_goal text DEFAULT NULL,
  p_routine_config jsonb DEFAULT NULL
)
RETURNS public.onboarding_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_session public.onboarding_sessions;
  v_brief text;
  v_sectors text[];
  v_customer_count integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(COALESCE(p_answers, 'null'::jsonb)) <> 'object'
    OR jsonb_typeof(COALESCE(p_context, 'null'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'Answers and context must be objects' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_session
  FROM public.onboarding_sessions
  WHERE id = p_session_id AND user_id = v_user
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Onboarding session not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_session.status = 'completed' THEN
    RETURN v_session;
  END IF;

  IF v_session.flow_version = 'adaptive_v1' THEN
    v_brief := trim(COALESCE(p_answers->>'startupBrief', ''));
    IF length(v_brief) < 20 OR length(v_brief) > 280 THEN
      RAISE EXCEPTION 'Startup brief must contain 20 to 280 characters' USING ERRCODE = '22023';
    END IF;
    IF COALESCE(p_answers->>'businessModel', '') = ''
      OR COALESCE(p_answers->>'evidenceState', '') = ''
      OR COALESCE(p_answers->>'primaryGoal', '') = ''
      OR COALESCE(p_answers->>'blocker', '') = ''
      OR COALESCE(p_answers->>'weeklyCapacityHours', '') = ''
      OR COALESCE(p_answers->>'selectedIntent', '') = '' THEN
      RAISE EXCEPTION 'Required adaptive onboarding answers are missing' USING ERRCODE = '22023';
    END IF;
  END IF;
  IF length(trim(COALESCE(p_answers->>'country', ''))) > 100 THEN
    RAISE EXCEPTION 'Country is too long' USING ERRCODE = '22023';
  END IF;

  v_sectors := CASE
    WHEN jsonb_typeof(p_answers->'sectors') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(p_answers->'sectors'))
    WHEN jsonb_typeof(p_profile_updates->'startup_industry') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(p_profile_updates->'startup_industry'))
    ELSE NULL
  END;

  UPDATE public.onboarding_sessions
  SET
    answers = p_answers,
    derived_context = p_context,
    status = 'completed',
    current_step = GREATEST(current_step, 6),
    completed_at = COALESCE(completed_at, now()),
    abandoned_at = NULL
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  UPDATE public.profiles p
  SET
    business_stage = COALESCE(NULLIF(p_context->>'businessStage', ''), NULLIF(p_profile_updates->>'business_stage', ''), p.business_stage),
    quiz_current_stage = COALESCE(NULLIF(p_context->>'businessStage', ''), NULLIF(p_profile_updates->>'quiz_current_stage', ''), p.quiz_current_stage),
    quiz_biggest_challenge = COALESCE(NULLIF(p_answers->>'blocker', ''), NULLIF(p_profile_updates->>'quiz_biggest_challenge', ''), p.quiz_biggest_challenge),
    current_focus = COALESCE(NULLIF(p_answers->>'primaryGoal', ''), p.current_focus),
    startup_description = COALESCE(NULLIF(p_answers->>'startupBrief', ''), p.startup_description),
    onboarding_completed = true,
    startup_industry = COALESCE(v_sectors, p.startup_industry),
    country = COALESCE(NULLIF(trim(p_answers->>'country'), ''), NULLIF(p_profile_updates->>'country', ''), p.country),
    assigned_stage = COALESCE((p_context->>'assignedStage')::integer, (p_profile_updates->>'assigned_stage')::integer, p.assigned_stage),
    quiz_completed = true,
    quiz_completed_at = COALESCE(p.quiz_completed_at, now()),
    quiz_answers_v2 = jsonb_build_object(
      'version', 4,
      'onboardingSessionId', p_session_id,
      'flowVersion', v_session.flow_version,
      'answers', p_answers - 'startupBrief' - 'country',
      'context', p_context
    ),
    user_preferences = COALESCE(p.user_preferences, '{}'::jsonb)
      || COALESCE(p_preference_patch, '{}'::jsonb)
      || jsonb_build_object(
        'activationIntent', p_context->>'selectedIntent',
        'founderStage', (p_context->>'assignedStage')::integer,
        'founderStageLabel', p_context->>'assignedStageLabel',
        'bizMapStage', p_context->>'bizMapStage',
        'founderLoop', p_context->>'founderLoop',
        'primaryPain', p_answers->>'blocker',
        'startupSectors', COALESCE(p_answers->'sectors', '[]'::jsonb),
        'supportAreasNeeded', COALESCE(p_preference_patch->'supportAreasNeeded', '[]'::jsonb),
        'cofounderSituation', NULLIF(p_answers->>'cofounderSituation', ''),
        'onboardingSessionId', p_session_id,
        'onboardingFlowVersion', v_session.flow_version,
        'onboardingRolloutVariant', v_session.rollout_variant,
        'onboardingContextVersion', 1
      ),
    routine_primary_goal = CASE
      WHEN p.routine_config IS NULL THEN COALESCE(NULLIF(p_routine_goal, ''), p.routine_primary_goal)
      ELSE p.routine_primary_goal
    END,
    routine_config = CASE
      WHEN p.routine_config IS NULL THEN COALESCE(p_routine_config, p.routine_config)
      ELSE p.routine_config
    END,
    updated_at = now()
  WHERE p.id = v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;

  IF to_regclass('public.founder_cycle_state') IS NOT NULL
    AND COALESCE(p_answers->>'businessModel', '') <> '' THEN
    v_customer_count := CASE p_answers->>'customerCountBand'
      WHEN '1' THEN 1 WHEN '2' THEN 2 WHEN '3' THEN 3 WHEN '4_plus' THEN 4 ELSE 0
    END;
    INSERT INTO public.founder_cycle_state (
      user_id, business_model, customer_count, recommended_loop, selected_loop,
      primary_goal, raise_active, weekly_capacity_hours, assignment_reason
    ) VALUES (
      v_user,
      p_answers->>'businessModel',
      v_customer_count,
      p_context->>'founderLoop',
      p_context->>'founderLoop',
      NULLIF(p_answers->>'primaryGoal', ''),
      COALESCE(p_context->>'founderLoop' = 'RAISE', false)
        OR COALESCE(p_answers->>'primaryGoal' = 'raise', false),
      NULLIF(p_answers->>'weeklyCapacityHours', '')::numeric,
      'Assigned from canonical onboarding session ' || p_session_id::text
    )
    ON CONFLICT (user_id) DO UPDATE SET
      business_model = EXCLUDED.business_model,
      customer_count = EXCLUDED.customer_count,
      recommended_loop = EXCLUDED.recommended_loop,
      selected_loop = EXCLUDED.selected_loop,
      primary_goal = EXCLUDED.primary_goal,
      raise_active = EXCLUDED.raise_active,
      weekly_capacity_hours = EXCLUDED.weekly_capacity_hours,
      assignment_reason = EXCLUDED.assignment_reason;
  END IF;

  INSERT INTO public.user_activity_log (
    user_id, activity_type, activity_data, page_path,
    source_tool, source_entity_type, source_entity_id, event_key
  ) VALUES (
    v_user,
    'onboarding_completed',
    jsonb_build_object(
      'onboarding_session_id', v_session.id,
      'flow_version', v_session.flow_version,
      'rollout_variant', v_session.rollout_variant,
      'plan', v_session.plan_snapshot,
      'device', v_session.device_snapshot,
      'assigned_stage', p_context->>'assignedStage',
      'founder_loop', p_context->>'founderLoop',
      'primary_goal', p_answers->>'primaryGoal',
      'blocker', p_answers->>'blocker',
      'activation_intent', p_context->>'selectedIntent',
      'recommendation_accepted', COALESCE((p_context->>'recommendationAccepted')::boolean, false),
      'data_completeness', p_context->>'dataCompleteness'
    ),
    '/onboarding',
    'onboarding',
    'onboarding_session',
    v_session.id::text,
    'onboarding:' || v_session.id::text || ':completed'
  )
  ON CONFLICT (user_id, event_key) DO NOTHING;

  RETURN v_session;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_onboarding_focus_v1(
  p_answer_patch jsonb,
  p_context jsonb,
  p_routine_goal text,
  p_routine_config jsonb
)
RETURNS public.onboarding_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_session public.onboarding_sessions;
  v_brief text := trim(COALESCE(p_answer_patch->>'startupBrief', ''));
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(COALESCE(p_answer_patch, 'null'::jsonb)) <> 'object'
    OR jsonb_typeof(COALESCE(p_context, 'null'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'Focus updates must be objects' USING ERRCODE = '22023';
  END IF;
  IF v_brief <> '' AND (length(v_brief) < 20 OR length(v_brief) > 280) THEN
    RAISE EXCEPTION 'Startup brief must contain 20 to 280 characters' USING ERRCODE = '22023';
  END IF;
  IF length(trim(COALESCE(p_answer_patch->>'country', ''))) > 100 THEN
    RAISE EXCEPTION 'Country is too long' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_session
  FROM public.onboarding_sessions
  WHERE user_id = v_user AND status = 'completed'
  ORDER BY completed_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.onboarding_sessions (
      user_id,
      schema_version,
      flow_version,
      rollout_variant,
      source,
      status,
      current_step,
      answers,
      derived_context,
      started_at,
      completed_at
    ) VALUES (
      v_user,
      1,
      'control_v6',
      'control_v6',
      'legacy_adapter',
      'completed',
      7,
      p_answer_patch,
      p_context,
      now(),
      now()
    )
    RETURNING * INTO v_session;
  END IF;

  UPDATE public.onboarding_sessions
  SET answers = answers || p_answer_patch, derived_context = p_context
  WHERE id = v_session.id
  RETURNING * INTO v_session;

  UPDATE public.profiles p
  SET
    startup_description = COALESCE(NULLIF(p_answer_patch->>'startupBrief', ''), p.startup_description),
    country = COALESCE(NULLIF(trim(p_answer_patch->>'country'), ''), p.country),
    current_focus = COALESCE(NULLIF(p_answer_patch->>'primaryGoal', ''), p.current_focus),
    quiz_biggest_challenge = COALESCE(NULLIF(p_answer_patch->>'blocker', ''), p.quiz_biggest_challenge),
    user_preferences = COALESCE(p.user_preferences, '{}'::jsonb) || jsonb_build_object(
      'activationIntent', p_context->>'selectedIntent',
      'founderLoop', p_context->>'founderLoop',
      'primaryPain', COALESCE(NULLIF(p_answer_patch->>'blocker', ''), p.user_preferences->>'primaryPain'),
      'onboardingContextVersion', 1
    ),
    routine_primary_goal = CASE
      WHEN p.routine_config IS NULL OR NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(p.routine_config->'tasks', '[]'::jsonb)) task
        WHERE task->>'source' = 'custom'
      ) THEN p_routine_goal
      ELSE p.routine_primary_goal
    END,
    routine_config = CASE
      WHEN p.routine_config IS NULL OR NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(p.routine_config->'tasks', '[]'::jsonb)) task
        WHERE task->>'source' = 'custom'
      ) THEN p_routine_config
      ELSE p.routine_config
    END,
    updated_at = now()
  WHERE p.id = v_user;

  IF to_regclass('public.founder_cycle_state') IS NOT NULL THEN
    UPDATE public.founder_cycle_state
    SET
      primary_goal = COALESCE(NULLIF(p_answer_patch->>'primaryGoal', ''), primary_goal),
      recommended_loop = COALESCE(NULLIF(p_context->>'founderLoop', ''), recommended_loop),
      selected_loop = COALESCE(NULLIF(p_context->>'founderLoop', ''), selected_loop),
      raise_active = COALESCE(NULLIF(p_answer_patch->>'primaryGoal', ''), primary_goal) = 'raise',
      weekly_capacity_hours = COALESCE(
        NULLIF(p_answer_patch->>'weeklyCapacityHours', '')::numeric,
        weekly_capacity_hours
      ),
      updated_at = now()
    WHERE user_id = v_user;
  END IF;

  INSERT INTO public.user_activity_log (
    user_id, activity_type, activity_data, page_path,
    source_tool, source_entity_type, source_entity_id, event_key
  ) VALUES (
    v_user,
    'onboarding_focus_updated',
    jsonb_build_object(
      'onboarding_session_id', v_session.id,
      'flow_version', v_session.flow_version,
      'rollout_variant', v_session.rollout_variant,
      'primary_goal', p_answer_patch->>'primaryGoal',
      'blocker', p_answer_patch->>'blocker',
      'weekly_capacity_hours', p_answer_patch->>'weeklyCapacityHours',
      'activation_intent', p_context->>'selectedIntent'
    ),
    '/dashboard',
    'dashboard',
    'onboarding_session',
    v_session.id::text,
    'onboarding:' || v_session.id::text || ':focus:' || extract(epoch from now())::bigint::text
  );

  RETURN v_session;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_onboarding_dashboard_outcomes_v1(
  p_from timestamptz,
  p_to timestamptz
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
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from >= p_to THEN
    RAISE EXCEPTION 'Invalid reporting range' USING ERRCODE = '22023';
  END IF;

  WITH eligible_signups AS (
    SELECT p.id AS user_id, p.created_at
    FROM public.profiles p
    WHERE p.created_at >= p_from AND p.created_at <= p_to
      AND COALESCE((p.user_preferences->>'requires_guided_onboarding')::boolean, false)
  ), sessions AS (
    SELECT DISTINCT ON (s.user_id)
      s.*
    FROM public.onboarding_sessions s
    WHERE s.started_at >= p_from AND s.started_at <= p_to
    ORDER BY s.user_id, s.started_at
  ), completed AS (
    SELECT * FROM sessions WHERE status = 'completed' AND completed_at IS NOT NULL
  ), outcomes AS (
    SELECT
      c.*,
      EXISTS (
        SELECT 1 FROM public.user_activity_log a
        WHERE a.user_id = c.user_id AND a.activity_type = 'activation_destination_viewed'
          AND a.created_at BETWEEN c.completed_at AND c.completed_at + interval '2 minutes'
      ) AS destination_2m,
      EXISTS (
        SELECT 1 FROM public.user_activity_log a
        WHERE a.user_id = c.user_id AND a.activity_type = 'activation_first_input_submitted'
          AND a.created_at BETWEEN c.completed_at AND c.completed_at + interval '10 minutes'
      ) AS input_10m,
      EXISTS (
        SELECT 1 FROM public.user_activity_log a
        WHERE a.user_id = c.user_id AND a.activity_type IN ('activation_first_artifact_saved', 'first_artifact_created')
          AND a.created_at BETWEEN c.completed_at AND c.completed_at + interval '30 minutes'
      ) AS artifact_30m,
      EXISTS (
        SELECT 1 FROM public.user_activity_log a
        WHERE a.user_id = c.user_id AND a.activity_type IN ('activation_first_artifact_saved', 'first_artifact_created')
          AND a.created_at BETWEEN c.completed_at AND c.completed_at + interval '24 hours'
      ) AS artifact_24h,
      EXISTS (
        SELECT 1 FROM public.user_activity_log a
        WHERE a.user_id = c.user_id AND a.activity_type = 'dashboard_viewed'
          AND a.created_at BETWEEN c.completed_at + interval '24 hours' AND c.completed_at + interval '48 hours'
      ) AS dashboard_d1,
      EXISTS (
        SELECT 1 FROM public.user_activity_log a
        WHERE a.user_id = c.user_id AND a.activity_type = 'dashboard_viewed'
          AND a.created_at BETWEEN c.completed_at + interval '144 hours' AND c.completed_at + interval '192 hours'
      ) AS dashboard_d7,
      EXISTS (
        SELECT 1 FROM public.user_activity_log a
        WHERE a.user_id = c.user_id AND a.activity_type = 'dashboard_recommendation_feedback'
          AND a.activity_data->>'relevance' = 'helpful'
      ) AS helpful_feedback,
      EXISTS (
        SELECT 1 FROM public.daily_missions dm
        WHERE dm.user_id = c.user_id AND dm.completed = true
          AND dm.mission_date BETWEEN c.completed_at::date AND (c.completed_at + interval '7 days')::date
      ) AS mission_completed,
      EXISTS (
        SELECT 1 FROM public.daily_tasks dt
        WHERE dt.user_id = c.user_id AND dt.is_completed = true
          AND dt.completed_at BETWEEN c.completed_at AND c.completed_at + interval '7 days'
      ) AS task_completed
    FROM completed c
  ), summary AS (
    SELECT jsonb_build_object(
      'eligibleSignups', (SELECT count(*) FROM eligible_signups),
      'startedUsers', (SELECT count(*) FROM sessions),
      'completedUsers', count(*),
      'completionRate', round(100.0 * count(*) / NULLIF((SELECT count(*) FROM sessions), 0), 1),
      'medianCompletionSeconds', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM completed_at - started_at))::numeric, 1),
      'p75CompletionSeconds', round(percentile_cont(0.75) WITHIN GROUP (ORDER BY extract(epoch FROM completed_at - started_at))::numeric, 1),
      'destinationWithin2Minutes', count(*) FILTER (WHERE destination_2m),
      'inputWithin10Minutes', count(*) FILTER (WHERE input_10m),
      'artifactWithin30Minutes', count(*) FILTER (WHERE artifact_30m),
      'artifactWithin24Hours', count(*) FILTER (WHERE artifact_24h),
      'maturedD1Users', count(*) FILTER (WHERE completed_at <= now() - interval '48 hours'),
      'returnedD1', count(*) FILTER (WHERE completed_at <= now() - interval '48 hours' AND dashboard_d1),
      'maturedD7Users', count(*) FILTER (WHERE completed_at <= now() - interval '192 hours'),
      'returnedD7', count(*) FILTER (WHERE completed_at <= now() - interval '192 hours' AND dashboard_d7),
      'helpfulFeedbackUsers', count(*) FILTER (WHERE helpful_feedback),
      'missionCompletedUsers', count(*) FILTER (WHERE mission_completed),
      'taskCompletedUsers', count(*) FILTER (WHERE task_completed),
      'completeContextUsers', count(*) FILTER (WHERE derived_context->>'dataCompleteness' = 'complete')
    ) AS value
    FROM outcomes
  ), by_variant AS (
    SELECT jsonb_agg(jsonb_build_object(
      'variant', rollout_variant,
      'users', users,
      'completed', completed_users,
      'artifact24h', artifact_24h,
      'maturedD7', matured_d7,
      'returnedD7', returned_d7
    ) ORDER BY rollout_variant) AS value
    FROM (
      SELECT
        s.rollout_variant,
        count(*) AS users,
        count(*) FILTER (WHERE s.status = 'completed') AS completed_users,
        count(*) FILTER (WHERE o.artifact_24h) AS artifact_24h,
        count(*) FILTER (WHERE o.completed_at <= now() - interval '192 hours') AS matured_d7,
        count(*) FILTER (WHERE o.completed_at <= now() - interval '192 hours' AND o.dashboard_d7) AS returned_d7
      FROM sessions s
      LEFT JOIN outcomes o ON o.id = s.id
      GROUP BY s.rollout_variant
    ) grouped
  ), breakdowns AS (
    SELECT jsonb_build_object(
      'plan', COALESCE((SELECT jsonb_agg(jsonb_build_object('key', key, 'users', users) ORDER BY users DESC) FROM (
        SELECT COALESCE(plan_snapshot, 'unknown') key, count(*) users FROM completed GROUP BY 1
      ) x), '[]'::jsonb),
      'device', COALESCE((SELECT jsonb_agg(jsonb_build_object('key', key, 'users', users) ORDER BY users DESC) FROM (
        SELECT COALESCE(device_snapshot, 'unknown') key, count(*) users FROM completed GROUP BY 1
      ) x), '[]'::jsonb),
      'source', COALESCE((SELECT jsonb_agg(jsonb_build_object('key', key, 'users', users) ORDER BY users DESC) FROM (
        SELECT source key, count(*) users FROM completed GROUP BY 1
      ) x), '[]'::jsonb),
      'stage', COALESCE((SELECT jsonb_agg(jsonb_build_object('key', key, 'users', users) ORDER BY users DESC) FROM (
        SELECT COALESCE(derived_context->>'assignedStage', 'unknown') key, count(*) users FROM completed GROUP BY 1
      ) x), '[]'::jsonb),
      'loop', COALESCE((SELECT jsonb_agg(jsonb_build_object('key', key, 'users', users) ORDER BY users DESC) FROM (
        SELECT COALESCE(derived_context->>'founderLoop', 'unknown') key, count(*) users FROM completed GROUP BY 1
      ) x), '[]'::jsonb),
      'goal', COALESCE((SELECT jsonb_agg(jsonb_build_object('key', key, 'users', users) ORDER BY users DESC) FROM (
        SELECT COALESCE(answers->>'primaryGoal', 'unknown') key, count(*) users FROM completed GROUP BY 1
      ) x), '[]'::jsonb),
      'blocker', COALESCE((SELECT jsonb_agg(jsonb_build_object('key', key, 'users', users) ORDER BY users DESC) FROM (
        SELECT COALESCE(answers->>'blocker', 'unknown') key, count(*) users FROM completed GROUP BY 1
      ) x), '[]'::jsonb),
      'intent', COALESCE((SELECT jsonb_agg(jsonb_build_object('key', key, 'users', users) ORDER BY users DESC) FROM (
        SELECT COALESCE(derived_context->>'selectedIntent', 'unknown') key, count(*) users FROM completed GROUP BY 1
      ) x), '[]'::jsonb),
      'recommendationDecision', COALESCE((SELECT jsonb_agg(jsonb_build_object('key', key, 'users', users) ORDER BY users DESC) FROM (
        SELECT CASE WHEN COALESCE((derived_context->>'recommendationAccepted')::boolean, false) THEN 'accepted' ELSE 'overridden' END key, count(*) users
        FROM completed GROUP BY 1
      ) x), '[]'::jsonb)
    ) AS value
  )
  SELECT jsonb_build_object(
    'summary', summary.value,
    'byVariant', COALESCE(by_variant.value, '[]'::jsonb),
    'breakdowns', breakdowns.value
  )
  INTO v_result
  FROM summary CROSS JOIN by_variant CROSS JOIN breakdowns;

  RETURN COALESCE(v_result, jsonb_build_object('summary', '{}'::jsonb, 'byVariant', '[]'::jsonb, 'breakdowns', '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.begin_onboarding_v1(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_onboarding_progress_v1(uuid, integer, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_onboarding_v1(uuid, jsonb, jsonb, jsonb, jsonb, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_onboarding_focus_v1(jsonb, jsonb, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_onboarding_dashboard_outcomes_v1(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.begin_onboarding_v1(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_onboarding_progress_v1(uuid, integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_onboarding_v1(uuid, jsonb, jsonb, jsonb, jsonb, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_onboarding_focus_v1(jsonb, jsonb, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_onboarding_dashboard_outcomes_v1(timestamptz, timestamptz) TO authenticated;

COMMENT ON TABLE public.onboarding_sessions IS
  'Versioned, user-scoped onboarding attempts and immutable completion context for dashboard personalization.';
COMMENT ON FUNCTION public.get_onboarding_dashboard_outcomes_v1(timestamptz, timestamptz) IS
  'Admin-only unique-user onboarding, first-value, and D1/D7 Command Center outcome report.';
