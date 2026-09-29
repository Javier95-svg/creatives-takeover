-- Onboarding context v2.
--
-- 1. Per-project context: projects.context holds the answers and derived
--    context that describe that project, so Pulse can reason about the
--    selected project instead of one account-wide set of answers.
-- 2. Server validation: every answer is checked against its allowed values,
--    and the stored context must be well formed.
-- 3. Server-derived stage: complete_onboarding_as_v1 and
--    update_onboarding_focus_as_v1 take the user id explicitly and are only
--    callable by the service role. The onboarding-context edge function calls
--    them after deriving the stage from the answers itself. The browser-facing
--    *_v1 functions remain as thin wrappers during rollout; see
--    docs/sql/onboarding-context-lockdown.sql to revoke them afterwards.
-- 4. The dashboard focus editor can now change business model, evidence,
--    customer count, sectors, co-founder and fundraising answers.

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS context jsonb;
COMMENT ON COLUMN public.projects.context IS
  'Onboarding answers and derived context for this project (stage, loop, goal, blocker). Written by onboarding and focus edits.';

CREATE OR REPLACE FUNCTION public.onboarding_answers_problem(p_answers jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_field text;
  v_value text;
  v_options text[];
  v_item jsonb;
BEGIN
  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'object' THEN
    RETURN 'Answers must be an object';
  END IF;

  FOR v_field, v_options IN
    SELECT * FROM (VALUES
      ('businessModel', ARRAY['b2b_saas','service','b2c_product','marketplace','ecommerce','media','other']),
      ('evidenceState', ARRAY['none','prospects','replies','conversations','commitment','payment','repeatable_growth']),
      ('customerCountBand', ARRAY['0','1','2','3','4_plus']),
      ('revenueBand', ARRAY['none','under_1k','1k_10k','10k_50k','over_50k']),
      ('primaryGoal', ARRAY['validate_problem','win_first_customer','reach_three_customers','repeatable_growth','build_product','launch','raise']),
      ('blocker', ARRAY['customer_clarity','prospect_access','messaging','sales_conversion','product_delivery','traction_growth','fundraising','accountability','team']),
      ('fundraisingStatus', ARRAY['not_now','preparing','talking_investors','raising_now']),
      ('cofounderSituation', ARRAY['actively_looking','solo_ok']),
      ('runwayMonths', ARRAY['under_3','3_6','6_12','over_12','not_applicable']),
      ('builderStartingPoint', ARRAY['exploring','idea_chosen']),
      ('selectedIntent', ARRAY['publish_proof','first_customer_sprint','build_demo','find_mentor','run_icp','start_validation','build_mvp','plan_gtm','log_traction','analyze_pitch_deck','unlock_pitch_deck','unlock_tech_stack','unlock_insighta','save_mentor','send_message','book_call'])
    ) AS rules(field, options)
  LOOP
    IF p_answers ? v_field AND jsonb_typeof(p_answers->v_field) <> 'null' THEN
      IF jsonb_typeof(p_answers->v_field) <> 'string' THEN
        RETURN 'Invalid value for ' || v_field;
      END IF;
      v_value := p_answers->>v_field;
      IF v_value <> '' AND NOT v_value = ANY(v_options) THEN
        RETURN 'Invalid value for ' || v_field;
      END IF;
    END IF;
  END LOOP;

  IF p_answers ? 'weeklyCapacityHours' AND jsonb_typeof(p_answers->'weeklyCapacityHours') <> 'null'
    AND COALESCE(p_answers->>'weeklyCapacityHours', '') NOT IN ('', '2', '5', '10', '20') THEN
    RETURN 'Invalid value for weeklyCapacityHours';
  END IF;

  IF p_answers ? 'sectors' THEN
    IF jsonb_typeof(p_answers->'sectors') <> 'array' OR jsonb_array_length(p_answers->'sectors') > 12 THEN
      RETURN 'Invalid sectors';
    END IF;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_answers->'sectors') LOOP
      IF jsonb_typeof(v_item) <> 'string' OR NOT (v_item #>> '{}') = ANY(ARRAY['AI & Machine Learning','BioTech & Life Sciences','CleanTech & Climate','Consumer & D2C','Cybersecurity','DeepTech & Hardware','Developer Tools','E-Commerce & Marketplace','EdTech','Energy','Enterprise Software','FinTech','FoodTech & AgTech','Gaming & Entertainment','GovTech','HealthTech','HR Tech & Future of Work','InsurTech','LegalTech','Logistics & Supply Chain','Manufacturing & Industry 4.0','Media & Creator Economy','Mobility & Logistics','Mobility & Transportation','PropTech & Real Estate','RetailTech','Robotics & Automation','SaaS','Social Impact','SpaceTech','Sports & Wellness','Travel & Hospitality','Web3 & Blockchain']) THEN
        RETURN 'Invalid sectors';
      END IF;
    END LOOP;
  END IF;

  IF p_answers ? 'workingDays' THEN
    IF jsonb_typeof(p_answers->'workingDays') <> 'array' OR jsonb_array_length(p_answers->'workingDays') > 7 THEN
      RETURN 'Invalid workingDays';
    END IF;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_answers->'workingDays') LOOP
      IF jsonb_typeof(v_item) <> 'number' OR (v_item #>> '{}') NOT IN ('0','1','2','3','4','5','6') THEN
        RETURN 'Invalid workingDays';
      END IF;
    END LOOP;
  END IF;

  IF length(trim(COALESCE(p_answers->>'startupBrief', ''))) > 280 THEN RETURN 'Startup brief is too long'; END IF;
  IF length(trim(COALESCE(p_answers->>'country', ''))) > 100 THEN RETURN 'Country is too long'; END IF;
  IF length(btrim(COALESCE(p_answers->>'projectName', ''))) > 120 THEN RETURN 'Project name is too long'; END IF;
  RETURN NULL;
END;
$$;

-- The stored context must be one the platform can read back.
CREATE OR REPLACE FUNCTION public.onboarding_context_problem(p_context jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_context IS NULL OR jsonb_typeof(p_context) <> 'object' THEN 'Invalid onboarding context'
    WHEN COALESCE(p_context->>'assignedStage', '') !~ '^[1-7]$' THEN 'Invalid onboarding stage'
    WHEN COALESCE(p_context->>'founderLoop', '') NOT IN ('PROVE', 'SELL', 'GROW') THEN 'Invalid onboarding loop'
    ELSE NULL
  END;
$$;

-- What a project's context holds: the answers without free text that already
-- has its own column, plus the derived context.
CREATE OR REPLACE FUNCTION public.onboarding_project_context(p_answers jsonb, p_context jsonb, p_source text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'version', 1,
    'source', p_source,
    'answers', COALESCE(p_answers, '{}'::jsonb) - 'startupBrief' - 'country' - '_draftVersion' - 'roleProfile' - 'entryStage',
    'context', COALESCE(p_context, '{}'::jsonb)
  );
$$;

CREATE OR REPLACE FUNCTION public.complete_onboarding_as_v1(
  p_user uuid,
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
  v_user uuid := p_user;
  v_session public.onboarding_sessions;
  v_brief text;
  v_sectors text[];
  v_customer_count integer;
  v_type text;
  v_name text;
  v_project uuid;
  v_problem text;
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

  v_problem := COALESCE(public.onboarding_answers_problem(p_answers), public.onboarding_context_problem(p_context));
  IF v_problem IS NOT NULL THEN RAISE EXCEPTION '%', v_problem USING ERRCODE = '22023'; END IF;

  v_name := NULLIF(btrim(p_answers->>'projectName'),'');
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
      OR COALESCE(p_answers->>'runwayMonths', '') = ''
      OR COALESCE(p_answers->>'selectedIntent', '') = ''
      OR (v_type = 'builder' AND COALESCE(p_answers->>'builderStartingPoint', '') = '') THEN
      RAISE EXCEPTION 'Required adaptive onboarding answers are missing' USING ERRCODE = '22023';
    END IF;
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
  -- but a placeholder title or an empty summary takes the quiz answers. The
  -- quiz describes this project, so its context is stored on it.
  UPDATE public.projects
  SET
    title = CASE
      WHEN NULLIF(btrim(title), '') IS NULL OR title IN ('My project', 'Untitled idea') THEN v_name
      ELSE title
    END,
    idea_summary = COALESCE(NULLIF(btrim(idea_summary), ''), NULLIF(trim(COALESCE(p_answers->>'startupBrief', '')), '')),
    context = public.onboarding_project_context(p_answers, p_context, 'onboarding'),
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

-- Browser entry point, kept during rollout. Same behaviour, caller from JWT.
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
BEGIN
  RETURN public.complete_onboarding_as_v1(auth.uid(), p_session_id, p_answers, p_context,
    p_profile_updates, p_preference_patch, p_routine_goal, p_routine_config);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_onboarding_focus_as_v1(
  p_user uuid,
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
  v_user uuid := p_user;
  v_session public.onboarding_sessions;
  v_brief text := trim(COALESCE(p_answer_patch->>'startupBrief', ''));
  v_previous_brief text;
  v_problem text;
  v_project uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(COALESCE(p_answer_patch, 'null'::jsonb)) <> 'object'
    OR jsonb_typeof(COALESCE(p_context, 'null'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'Focus updates must be objects' USING ERRCODE = '22023';
  END IF;
  v_problem := COALESCE(public.onboarding_answers_problem(p_answer_patch), public.onboarding_context_problem(p_context));
  IF v_problem IS NOT NULL THEN RAISE EXCEPTION '%', v_problem USING ERRCODE = '22023'; END IF;
  IF v_brief <> '' AND (length(v_brief) < 20 OR length(v_brief) > 280) THEN
    RAISE EXCEPTION 'Startup brief must contain 20 to 280 characters' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_session
  FROM public.onboarding_sessions
  WHERE user_id = v_user AND status = 'completed'
  ORDER BY completed_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.onboarding_sessions (
      user_id, schema_version, flow_version, rollout_variant, source, status,
      current_step, answers, derived_context, started_at, completed_at
    ) VALUES (
      v_user, 1, 'control_v6', 'control_v6', 'legacy_adapter', 'completed',
      7, p_answer_patch, p_context, now(), now()
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
    startup_industry = CASE
      WHEN jsonb_typeof(p_answer_patch->'sectors') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(p_answer_patch->'sectors'))
      ELSE p.startup_industry
    END,
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
    user_preferences = COALESCE(p.user_preferences, '{}'::jsonb)
      || jsonb_build_object(
        'activationIntent', p_context->>'selectedIntent',
        'founderStage', (p_context->>'assignedStage')::integer,
        'founderStageLabel', p_context->>'assignedStageLabel',
        'founderLoop', p_context->>'founderLoop',
        'primaryPain', COALESCE(NULLIF(p_answer_patch->>'blocker', ''), p.user_preferences->>'primaryPain'),
        'onboardingContextVersion', 1
      )
      || CASE WHEN p_answer_patch ? 'sectors'
        THEN jsonb_build_object('startupSectors', p_answer_patch->'sectors') ELSE '{}'::jsonb END
      || CASE WHEN p_answer_patch ? 'cofounderSituation'
        THEN jsonb_build_object('cofounderSituation', NULLIF(p_answer_patch->>'cofounderSituation', '')) ELSE '{}'::jsonb END,
    routine_primary_goal = CASE
      WHEN p_routine_config IS NOT NULL AND (p.routine_config IS NULL OR NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(p.routine_config->'tasks', '[]'::jsonb)) task
        WHERE task->>'source' = 'custom'
      )) THEN p_routine_goal
      ELSE p.routine_primary_goal
    END,
    routine_config = CASE
      WHEN p_routine_config IS NOT NULL AND (p.routine_config IS NULL OR NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(p.routine_config->'tasks', '[]'::jsonb)) task
        WHERE task->>'source' = 'custom'
      )) THEN p_routine_config
      ELSE p.routine_config
    END,
    updated_at = now()
  WHERE p.id = v_user;

  -- The focus editor describes the founder's current project: the most
  -- recently used active one, the same one ensure_active_project picks.
  SELECT id INTO v_project FROM public.projects
  WHERE user_id = v_user AND archived_at IS NULL
  ORDER BY COALESCE(last_run_at, updated_at, created_at) DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF v_project IS NOT NULL THEN
    UPDATE public.projects
    SET
      -- A new brief reaches the project unless it has a summary of its own,
      -- written somewhere other than the onboarding brief.
      idea_summary = CASE
        WHEN v_brief <> '' AND (NULLIF(btrim(idea_summary), '') IS NULL OR idea_summary = v_previous_brief) THEN v_brief
        ELSE idea_summary
      END,
      context = public.onboarding_project_context(v_session.answers, p_context, 'focus_edit'),
      updated_at = now()
    WHERE id = v_project;
  END IF;

  IF to_regclass('public.founder_cycle_state') IS NOT NULL THEN
    UPDATE public.founder_cycle_state
    SET
      business_model = COALESCE(NULLIF(v_session.answers->>'businessModel', ''), business_model),
      customer_count = CASE
        WHEN p_answer_patch ? 'customerCountBand' OR p_answer_patch ? 'evidenceState' THEN
          CASE v_session.answers->>'customerCountBand'
            WHEN '1' THEN 1 WHEN '2' THEN 2 WHEN '3' THEN 3 WHEN '4_plus' THEN 4 ELSE 0
          END
        ELSE customer_count
      END,
      primary_goal = COALESCE(NULLIF(v_session.answers->>'primaryGoal', ''), primary_goal),
      recommended_loop = COALESCE(NULLIF(p_context->>'founderLoop', ''), recommended_loop),
      selected_loop = COALESCE(NULLIF(p_context->>'founderLoop', ''), selected_loop),
      raise_active = COALESCE(v_session.answers->>'primaryGoal' = 'raise', false)
        OR COALESCE(v_session.answers->>'blocker' = 'fundraising', false),
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
      'activation_intent', p_context->>'selectedIntent',
      'changed_fields', (SELECT jsonb_agg(key) FROM jsonb_object_keys(p_answer_patch) key)
    ),
    '/dashboard',
    'dashboard',
    'onboarding_session',
    v_session.id::text,
    'onboarding:' || v_session.id::text || ':focus:' || extract(epoch from clock_timestamp())::text
  );

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
BEGIN
  RETURN public.update_onboarding_focus_as_v1(auth.uid(), p_answer_patch, p_context, p_routine_goal, p_routine_config);
END;
$$;

-- The *_as_v1 functions trust the user id they are given, so only the
-- service role (the onboarding-context edge function) may call them.
REVOKE ALL ON FUNCTION public.complete_onboarding_as_v1(uuid, uuid, jsonb, jsonb, jsonb, jsonb, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_onboarding_focus_as_v1(uuid, jsonb, jsonb, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_onboarding_as_v1(uuid, uuid, jsonb, jsonb, jsonb, jsonb, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_onboarding_focus_as_v1(uuid, jsonb, jsonb, text, jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.onboarding_answers_problem(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.onboarding_context_problem(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.onboarding_project_context(jsonb, jsonb, text) FROM PUBLIC, anon;

-- Give existing single-project founders a project context from their latest
-- completed onboarding. Founders with several projects keep account-level
-- context until they edit their focus, because the quiz does not say which
-- project it described.
UPDATE public.projects pr
SET context = public.onboarding_project_context(s.answers, s.derived_context, 'backfill'), updated_at = now()
FROM (
  SELECT DISTINCT ON (user_id) user_id, answers, derived_context
  FROM public.onboarding_sessions
  WHERE status = 'completed' AND derived_context IS NOT NULL
  ORDER BY user_id, completed_at DESC NULLS LAST
) s
WHERE pr.user_id = s.user_id
  AND pr.archived_at IS NULL
  AND pr.context IS NULL
  AND (SELECT count(*) FROM public.projects other WHERE other.user_id = pr.user_id AND other.archived_at IS NULL) = 1;
