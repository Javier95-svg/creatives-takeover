-- Keep onboarding context in sync across the profile, the active project and
-- founder_cycle_state.
--
-- 1. complete_onboarding_v1 copied the quiz's project name and brief onto a
--    project only when it created one. A founder whose project already existed
--    (for example "My project", created when a tool saved its first result)
--    kept the placeholder title and an empty summary, so Pulse had no project
--    brief. Placeholder titles and empty summaries are now filled in.
-- 2. update_onboarding_focus_v1 updated the session and a few profile fields
--    but not quiz_answers_v2, assigned_stage, business_stage or the project
--    summary. Pulse, the roadmap and recommendations kept the pre-edit answers.
-- 3. raise_active looked for a founder loop named 'RAISE', which does not
--    exist (loops are PROVE, SELL and GROW), and ignored a fundraising blocker.
--
-- Function bodies are otherwise unchanged from
-- 20260925161000_onboarding_classification_and_project.sql and
-- 20260730120000_onboarding_command_center_context_v1.sql.

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
  v_type text;
  v_name text;
  v_project uuid;
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

  SELECT user_type INTO v_type FROM public.profiles WHERE id=v_user FOR UPDATE;
  IF v_type IN ('mentor','marketplace','investor') THEN RAISE EXCEPTION 'Use the reviewed account onboarding flow'; END IF;
  v_type := public.classify_onboarding_situation(p_answers->>'situation');
  IF v_type IS NULL THEN RAISE EXCEPTION 'Answer the first onboarding question'; END IF;
  p_answers := p_answers || jsonb_build_object('founderSegment',v_type);
  IF v_type NOT IN ('founder','builder') THEN RAISE EXCEPTION 'Invalid self-serve account type'; END IF;
  v_name := NULLIF(btrim(p_answers->>'projectName'),'');
  IF length(v_name)>120 THEN RAISE EXCEPTION 'Project name is too long'; END IF;
  IF v_type='founder' AND v_name IS NULL THEN RAISE EXCEPTION 'Project name is required'; END IF;
  v_name := COALESCE(v_name,'Untitled idea');
  IF COALESCE((p_answers->>'investorVisible')::boolean,false) AND NULLIF(p_answers->>'investmentStage','') IS NULL THEN
    RAISE EXCEPTION 'Choose a funding stage for investor matching';
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
    user_type = v_type,
    founder_segment = v_type,
    approval_status = 'approved',
    startup_name = v_name,
    investor_match_visible = COALESCE((p_answers->>'investorVisible')::boolean,false),
    investment_stage = NULLIF(p_answers->>'investmentStage',''),
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

  -- Reuse the active project; no duplicate plan slot on retry or re-entry.
  v_project := public.ensure_active_project(v_user);

  -- A project that existed before the quiz keeps a title the founder chose,
  -- but a placeholder title or an empty summary takes the quiz answers.
  UPDATE public.projects
  SET
    title = CASE
      WHEN NULLIF(btrim(title), '') IS NULL OR title IN ('My project', 'Untitled idea') THEN v_name
      ELSE title
    END,
    idea_summary = COALESCE(NULLIF(btrim(idea_summary), ''), NULLIF(trim(COALESCE(p_answers->>'startupBrief', '')), '')),
    updated_at = now()
  WHERE id = v_project AND user_id = v_user;

  UPDATE public.onboarding_sessions SET derived_context=derived_context ||
    jsonb_build_object('userType',v_type,'projectId',v_project,'quizVersion',2)
    WHERE id=p_session_id RETURNING * INTO v_session;

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
      -- A raise goal or a fundraising blocker both mean the founder is raising.
      COALESCE(p_answers->>'primaryGoal' = 'raise', false)
        OR COALESCE(p_answers->>'blocker' = 'fundraising', false),
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
  v_previous_brief text;
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

  SELECT startup_description INTO v_previous_brief FROM public.profiles WHERE id = v_user;

  UPDATE public.profiles p
  SET
    startup_description = COALESCE(NULLIF(p_answer_patch->>'startupBrief', ''), p.startup_description),
    country = COALESCE(NULLIF(trim(p_answer_patch->>'country'), ''), p.country),
    current_focus = COALESCE(NULLIF(p_answer_patch->>'primaryGoal', ''), p.current_focus),
    quiz_biggest_challenge = COALESCE(NULLIF(p_answer_patch->>'blocker', ''), p.quiz_biggest_challenge),
    -- The edit re-derives the context, so the stage and the stored answers
    -- that Pulse, the roadmap and recommendations read move with it.
    assigned_stage = COALESCE((p_context->>'assignedStage')::integer, p.assigned_stage),
    business_stage = COALESCE(NULLIF(p_context->>'businessStage', ''), p.business_stage),
    quiz_current_stage = COALESCE(NULLIF(p_context->>'businessStage', ''), p.quiz_current_stage),
    quiz_answers_v2 = jsonb_build_object(
      'version', 4,
      'onboardingSessionId', v_session.id,
      'flowVersion', v_session.flow_version,
      'answers', v_session.answers - 'startupBrief' - 'country' - '_draftVersion',
      'context', p_context
    ),
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

  -- A new brief reaches the active project unless that project has a summary
  -- of its own, written somewhere other than the onboarding brief.
  IF v_brief <> '' THEN
    UPDATE public.projects
    SET idea_summary = v_brief, updated_at = now()
    WHERE id = (
        SELECT id FROM public.projects
        WHERE user_id = v_user AND archived_at IS NULL
        ORDER BY COALESCE(last_run_at, updated_at, created_at) DESC NULLS LAST, created_at DESC
        LIMIT 1
      )
      AND (NULLIF(btrim(idea_summary), '') IS NULL OR idea_summary = v_previous_brief);
  END IF;

  IF to_regclass('public.founder_cycle_state') IS NOT NULL THEN
    UPDATE public.founder_cycle_state
    SET
      primary_goal = COALESCE(NULLIF(p_answer_patch->>'primaryGoal', ''), primary_goal),
      recommended_loop = COALESCE(NULLIF(p_context->>'founderLoop', ''), recommended_loop),
      selected_loop = COALESCE(NULLIF(p_context->>'founderLoop', ''), selected_loop),
      raise_active = COALESCE(NULLIF(p_answer_patch->>'primaryGoal', ''), primary_goal) = 'raise'
        OR COALESCE((SELECT quiz_biggest_challenge FROM public.profiles WHERE id = v_user) = 'fundraising', false),
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

-- One-time repair for founders already affected by (1): their only active
-- project still has the placeholder title or no summary although the quiz
-- captured both. Accounts with several projects are left for the founder,
-- because there is no way to tell which project the quiz described.
UPDATE public.projects pr
SET
  title = CASE
    WHEN pr.title IN ('My project', 'Untitled idea') AND NULLIF(btrim(p.startup_name), '') IS NOT NULL THEN p.startup_name
    ELSE pr.title
  END,
  idea_summary = COALESCE(NULLIF(btrim(pr.idea_summary), ''), NULLIF(btrim(p.startup_description), '')),
  updated_at = now()
FROM public.profiles p
WHERE pr.user_id = p.id
  AND pr.archived_at IS NULL
  AND p.onboarding_completed IS TRUE
  AND p.user_type IN ('founder', 'builder')
  AND (
    (pr.title = 'My project' AND NULLIF(btrim(p.startup_name), '') IS NOT NULL AND p.startup_name <> 'My project')
    OR (NULLIF(btrim(pr.idea_summary), '') IS NULL AND NULLIF(btrim(p.startup_description), '') IS NOT NULL)
  )
  AND (SELECT count(*) FROM public.projects other WHERE other.user_id = p.id AND other.archived_at IS NULL) = 1;
