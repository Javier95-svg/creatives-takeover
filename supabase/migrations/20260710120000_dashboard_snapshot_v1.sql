-- Dashboard command-center v1: one authenticated, RLS-aware read contract.
-- Existing product tables remain the source of truth.

ALTER TABLE public.user_activity_log
  ADD COLUMN IF NOT EXISTS source_tool text,
  ADD COLUMN IF NOT EXISTS source_entity_type text,
  ADD COLUMN IF NOT EXISTS source_entity_id text,
  ADD COLUMN IF NOT EXISTS event_key text;

CREATE UNIQUE INDEX IF NOT EXISTS user_activity_log_user_event_key_unique
  ON public.user_activity_log (user_id, event_key);

CREATE INDEX IF NOT EXISTS user_activity_log_dashboard_feed_idx
  ON public.user_activity_log (user_id, created_at DESC)
  WHERE source_tool IS NOT NULL;

ALTER TABLE public.user_activity_log REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_activity_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity_log;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS daily_tasks_dashboard_open_idx
  ON public.daily_tasks (user_id, task_date, is_completed, priority);

CREATE INDEX IF NOT EXISTS personalized_recommendations_dashboard_open_idx
  ON public.personalized_recommendations (user_id, is_dismissed, is_completed, priority DESC, expires_at);

CREATE INDEX IF NOT EXISTS messages_dashboard_unread_idx
  ON public.messages (conversation_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS mentor_saves_dashboard_recent_idx
  ON public.mentor_saves (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS dashboard_files_dashboard_recent_idx
  ON public.dashboard_files (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS kpi_goals_dashboard_active_idx
  ON public.kpi_goals (user_id, is_active, updated_at DESC);

CREATE INDEX IF NOT EXISTS revenue_metrics_dashboard_recent_idx
  ON public.revenue_metrics (user_id, metric_date DESC);

CREATE TABLE IF NOT EXISTS public.dashboard_ranking_cache (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_hash text NOT NULL,
  ordered_candidate_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  rationale_by_key jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

ALTER TABLE public.dashboard_ranking_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own dashboard ranking cache" ON public.dashboard_ranking_cache;
CREATE POLICY "Users read own dashboard ranking cache"
  ON public.dashboard_ranking_cache FOR SELECT
  USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.dashboard_ranking_cache FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.dashboard_ranking_cache TO authenticated;
GRANT ALL ON TABLE public.dashboard_ranking_cache TO service_role;

CREATE OR REPLACE FUNCTION public.get_dashboard_snapshot_v1(p_timezone text DEFAULT 'UTC')
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_now timestamptz := now();
  v_today date;
  v_month_start timestamptz;
  v_profile jsonb := '{}'::jsonb;
  v_plan text := 'rookie';
  v_due_today jsonb := '[]'::jsonb;
  v_overdue_count integer := 0;
  v_unread_count integer := 0;
  v_unread_conversation uuid;
  v_primary_action jsonb;
  v_secondary_actions jsonb := '[]'::jsonb;
  v_routine jsonb := jsonb_build_object('configured', false, 'completed', 0, 'total', 0, 'items', '[]'::jsonb);
  v_daily_mission jsonb;
  v_weekly_mission jsonb;
  v_current_stage text := 'IDENTITY';
  v_progress jsonb := '{}'::jsonb;
  v_has_icp boolean := false;
  v_has_waitlist boolean := false;
  v_has_pmf boolean := false;
  v_has_mvp boolean := false;
  v_has_tech_stack boolean := false;
  v_has_gtm boolean := false;
  v_has_traction boolean := false;
  v_traction_ready boolean := false;
  v_has_pitch boolean := false;
  v_tools jsonb := '[]'::jsonb;
  v_stages jsonb := '[]'::jsonb;
  v_stages_completed integer := 0;
  v_saved_mentors jsonb := '[]'::jsonb;
  v_bookings jsonb := '[]'::jsonb;
  v_follow_ups jsonb := '[]'::jsonb;
  v_active_cofounder_posts integer := 0;
  v_available_services integer := 0;
  v_pmf_score numeric;
  v_traction_score numeric;
  v_traction_previous numeric;
  v_demo_signups integer := 0;
  v_waitlist_signups integer := 0;
  v_published_products integer := 0;
  v_revenue jsonb;
  v_kpis jsonb := '[]'::jsonb;
  v_investor_activity integer := 0;
  v_artifacts jsonb := '[]'::jsonb;
  v_saved_content_count integer := 0;
  v_recent_activity jsonb := '[]'::jsonb;
  v_recommendations jsonb := '[]'::jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_timezone IS NULL OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_timezone) THEN
    RAISE EXCEPTION 'Invalid timezone: %', COALESCE(p_timezone, '<null>') USING ERRCODE = '22023';
  END IF;

  v_today := (v_now AT TIME ZONE p_timezone)::date;
  v_month_start := date_trunc('month', v_now AT TIME ZONE p_timezone) AT TIME ZONE p_timezone;

  SELECT jsonb_build_object(
           'id', p.id,
           'fullName', p.full_name,
           'startupName', p.startup_name,
           'stage', COALESCE(p.startup_stage, p.business_stage, p.quiz_current_stage),
           'subscriptionTier', lower(COALESCE(p.subscription_tier, 'rookie')),
           'activationIntent', p.user_preferences->>'activationIntent',
           'onboardingCompleted', COALESCE(p.onboarding_completed, false)
         ),
         CASE
           WHEN lower(COALESCE(p.subscription_tier, 'rookie')) IN ('pro', 'professional', 'elite', 'team', 'teams', 'enterprise') THEN 'pro'
           WHEN lower(COALESCE(p.subscription_tier, 'rookie')) IN ('rising', 'creator', 'premium') THEN 'rising'
           WHEN lower(COALESCE(p.subscription_tier, 'rookie')) IN ('starter', 'basic') THEN 'starter'
           ELSE 'rookie'
         END
    INTO v_profile, v_plan
  FROM public.profiles p
  WHERE p.id = v_user;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', t.id,
           'title', t.task_text,
           'description', t.task_description,
           'priority', COALESCE(t.priority, 'medium'),
           'dueDate', t.task_date,
           'deadlineAt', t.deadline_time,
           'sourceTool', t.source_tool,
           'sourceRoute', t.source_route,
           'recommendationKey', t.recommendation_key,
           'completed', COALESCE(t.is_completed, false)
         ) ORDER BY
           CASE COALESCE(t.priority, 'medium') WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
           t.deadline_time NULLS LAST,
           t.created_at), '[]'::jsonb)
    INTO v_due_today
  FROM (
    SELECT * FROM public.daily_tasks
    WHERE user_id = v_user
      AND task_date = v_today
      AND COALESCE(is_completed, false) = false
      AND COALESCE(recommendation_status, '') <> 'dismissed'
    ORDER BY deadline_time NULLS LAST, created_at
    LIMIT 8
  ) t;

  SELECT count(*)::integer INTO v_overdue_count
  FROM public.daily_tasks
  WHERE user_id = v_user
    AND task_date < v_today
    AND COALESCE(is_completed, false) = false
    AND COALESCE(recommendation_status, '') <> 'dismissed';

  SELECT count(*)::integer,
         (array_agg(m.conversation_id ORDER BY m.created_at DESC))[1]
    INTO v_unread_count, v_unread_conversation
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  WHERE v_user = ANY(c.participants)
    AND m.sender_id <> v_user
    AND COALESCE(m.is_read, false) = false;

  WITH routine_items AS (
    SELECT item
    FROM public.profiles p,
         LATERAL jsonb_array_elements(COALESCE(p.routine_config->'tasks', '[]'::jsonb)) item
    WHERE p.id = v_user
      AND COALESCE(item->>'active', 'true') <> 'false'
      AND COALESCE(item->>'cadence', 'daily') = 'daily'
      AND COALESCE(item->'days', '[]'::jsonb) @> jsonb_build_array(EXTRACT(DOW FROM v_today)::integer)
  ), item_rows AS (
    SELECT
      item->>'id' AS id,
      item->>'title' AS title,
      EXISTS (
        SELECT 1 FROM public.routine_task_completions rtc
        WHERE rtc.user_id = v_user
          AND rtc.routine_task_id = item->>'id'
          AND rtc.period_type = 'daily'
          AND rtc.period_date = v_today
          AND rtc.status = 'completed'
      ) AS completed
    FROM routine_items
  )
  SELECT jsonb_build_object(
           'configured', EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = v_user AND p.routine_config IS NOT NULL),
           'completed', count(*) FILTER (WHERE completed),
           'total', count(*),
           'items', COALESCE(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'completed', completed)), '[]'::jsonb)
         )
    INTO v_routine
  FROM item_rows;

  SELECT jsonb_build_object(
           'id', dm.id,
           'title', dm.mission_text,
           'completed', dm.completed,
           'stage', dm.stage
         )
    INTO v_daily_mission
  FROM public.daily_missions dm
  WHERE dm.user_id = v_user AND dm.mission_date = v_today
  ORDER BY dm.created_at DESC
  LIMIT 1;

  SELECT jsonb_build_object(
           'id', wm.id,
           'title', wm.mission_goal,
           'progress', COALESCE(wm.completion_percentage, 0),
           'status', wm.status,
           'weekEndDate', wm.week_end_date
         )
    INTO v_weekly_mission
  FROM public.weekly_missions wm
  WHERE wm.user_id = v_user
    AND wm.week_start_date <= v_today
    AND wm.week_end_date >= v_today
  ORDER BY wm.created_at DESC
  LIMIT 1;

  SELECT COALESCE(up.current_stage::text, 'IDENTITY'), to_jsonb(up)
    INTO v_current_stage, v_progress
  FROM public.user_progress up
  WHERE up.user_id = v_user;
  v_current_stage := COALESCE(v_current_stage, 'IDENTITY');
  v_progress := COALESCE(v_progress, '{}'::jsonb);

  SELECT EXISTS(SELECT 1 FROM public.icp_analysis_results WHERE user_id = v_user) INTO v_has_icp;
  SELECT EXISTS(SELECT 1 FROM public.waitlist_pages WHERE user_id = v_user AND status IN ('published', 'exported')) INTO v_has_waitlist;
  SELECT EXISTS(SELECT 1 FROM public.pmf_analysis_results WHERE user_id = v_user)
      OR EXISTS(SELECT 1 FROM public.pmf_validation_evidence WHERE user_id = v_user) INTO v_has_pmf;
  SELECT EXISTS(SELECT 1 FROM public.mvp_builder_artifacts WHERE user_id = v_user AND status = 'saved')
      OR EXISTS(SELECT 1 FROM public.mvp_projects WHERE user_id = v_user AND deployment_status = 'deployed') INTO v_has_mvp;
  SELECT EXISTS(SELECT 1 FROM public.tech_stack_reports WHERE user_id = v_user) INTO v_has_tech_stack;
  SELECT EXISTS(SELECT 1 FROM public.gtm_plans WHERE user_id = v_user AND status IN ('saved', 'exported')) INTO v_has_gtm;
  SELECT EXISTS(SELECT 1 FROM public.traction_engine_weekly_logs WHERE user_id = v_user),
         COALESCE(bool_or(phase_seven_ready), false)
    INTO v_has_traction, v_traction_ready
  FROM public.traction_engine_weekly_logs WHERE user_id = v_user;
  SELECT EXISTS(SELECT 1 FROM public.pitch_deck_analyses WHERE user_id = v_user) INTO v_has_pitch;

  v_tools := jsonb_build_array(
    jsonb_build_object('key','icp_builder','stage','IDENTITY','status',CASE WHEN v_has_icp THEN 'done' ELSE 'not_started' END),
    jsonb_build_object('key','demo_studio','stage','PROTOTYPE','status',CASE WHEN v_has_waitlist THEN 'done' WHEN EXISTS(SELECT 1 FROM public.demo_studio_projects WHERE owner_id=v_user) THEN 'started' ELSE 'not_started' END),
    jsonb_build_object('key','pmf_lab','stage','VALIDATING','status',CASE WHEN v_has_pmf THEN 'done' ELSE 'not_started' END),
    jsonb_build_object('key','mvp_builder','stage','BUILDING','status',CASE WHEN v_has_mvp AND v_has_tech_stack THEN 'done' WHEN v_has_mvp OR v_has_tech_stack THEN 'started' ELSE 'not_started' END),
    jsonb_build_object('key','gtm_strategist','stage','LAUNCH','status',CASE WHEN v_has_gtm THEN 'done' ELSE 'not_started' END),
    jsonb_build_object('key','traction_engine','stage','TRACTION','status',CASE WHEN v_traction_ready THEN 'done' WHEN v_has_traction THEN 'started' ELSE 'not_started' END),
    jsonb_build_object('key','pitch_deck_analyzer','stage','FUNDRAISING','status',CASE WHEN v_has_pitch THEN 'done' ELSE 'not_started' END)
  );

  v_stages_completed :=
    (CASE WHEN COALESCE((v_progress->>'identity_completed_at')::text, '') <> '' OR v_has_icp THEN 1 ELSE 0 END) +
    (CASE WHEN COALESCE((v_progress->>'prototype_completed_at')::text, '') <> '' OR v_has_waitlist THEN 1 ELSE 0 END) +
    (CASE WHEN COALESCE((v_progress->>'validating_completed_at')::text, '') <> '' OR v_has_pmf THEN 1 ELSE 0 END) +
    (CASE WHEN COALESCE((v_progress->>'building_completed_at')::text, '') <> '' OR (v_has_mvp AND v_has_tech_stack) THEN 1 ELSE 0 END) +
    (CASE WHEN COALESCE((v_progress->>'launch_completed_at')::text, '') <> '' OR v_has_gtm THEN 1 ELSE 0 END) +
    (CASE WHEN COALESCE((v_progress->>'traction_completed_at')::text, '') <> '' OR v_traction_ready THEN 1 ELSE 0 END) +
    (CASE WHEN COALESCE((v_progress->>'fundraising_completed_at')::text, '') <> '' OR v_has_pitch THEN 1 ELSE 0 END);

  v_stages := jsonb_build_array(
    jsonb_build_object('key','IDENTITY','complete',COALESCE(v_progress->>'identity_completed_at','')<>'' OR v_has_icp,'current',v_current_stage='IDENTITY'),
    jsonb_build_object('key','PROTOTYPE','complete',COALESCE(v_progress->>'prototype_completed_at','')<>'' OR v_has_waitlist,'current',v_current_stage='PROTOTYPE'),
    jsonb_build_object('key','VALIDATING','complete',COALESCE(v_progress->>'validating_completed_at','')<>'' OR v_has_pmf,'current',v_current_stage='VALIDATING'),
    jsonb_build_object('key','BUILDING','complete',COALESCE(v_progress->>'building_completed_at','')<>'' OR (v_has_mvp AND v_has_tech_stack),'current',v_current_stage='BUILDING'),
    jsonb_build_object('key','LAUNCH','complete',COALESCE(v_progress->>'launch_completed_at','')<>'' OR v_has_gtm,'current',v_current_stage='LAUNCH'),
    jsonb_build_object('key','TRACTION','complete',COALESCE(v_progress->>'traction_completed_at','')<>'' OR v_traction_ready,'current',v_current_stage='TRACTION'),
    jsonb_build_object('key','FUNDRAISING','complete',COALESCE(v_progress->>'fundraising_completed_at','')<>'' OR v_has_pitch,'current',v_current_stage='FUNDRAISING')
  );

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'saveId', ms.id,
           'mentorId', m.id,
           'name', m.name,
           'picture', m.picture,
           'expertise', COALESCE(m.expertise, ARRAY[]::text[]),
           'savedAt', ms.created_at
         ) ORDER BY ms.created_at DESC), '[]'::jsonb)
    INTO v_saved_mentors
  FROM (
    SELECT * FROM public.mentor_saves WHERE user_id = v_user ORDER BY created_at DESC LIMIT 3
  ) ms
  JOIN public.mentors m ON m.id = ms.mentor_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', dc.id,
           'title', dc.title,
           'scheduledAt', dc.scheduled_at,
           'status', dc.status,
           'meetingUrl', dc.meeting_url
         ) ORDER BY dc.scheduled_at), '[]'::jsonb)
    INTO v_bookings
  FROM (
    SELECT * FROM public.demo_calls
    WHERE user_id = v_user AND scheduled_at >= v_now AND status NOT IN ('cancelled', 'completed')
    ORDER BY scheduled_at LIMIT 3
  ) dc;

  SELECT count(*)::integer INTO v_active_cofounder_posts
  FROM public.cofounder_posts WHERE user_id = v_user AND status = 'active';

  SELECT count(*)::integer INTO v_available_services
  FROM public.services WHERE is_active = true;

  IF v_unread_count > 0 THEN
    v_follow_ups := jsonb_build_array(jsonb_build_object(
      'key', 'people:unread-messages', 'kind', 'human_reply', 'toolKey', 'messages',
      'entityId', v_unread_conversation, 'title', v_unread_count || CASE WHEN v_unread_count=1 THEN ' unread reply' ELSE ' unread replies' END,
      'description', 'Continue the conversation before it goes cold.', 'urgency', 'high',
      'reasonCodes', jsonb_build_array('waiting_human_response'), 'estimatedMinutes', 5,
      'dueAt', NULL, 'actionKind', 'mark_conversation_read'
    ));
  END IF;

  SELECT pmf_score INTO v_pmf_score FROM public.pmf_analysis_results
  WHERE user_id = v_user AND pmf_score IS NOT NULL ORDER BY created_at DESC LIMIT 1;

  SELECT max(combined_score) FILTER (WHERE rn=1), max(combined_score) FILTER (WHERE rn=2)
    INTO v_traction_score, v_traction_previous
  FROM (
    SELECT combined_score, row_number() OVER (ORDER BY week_start_date DESC) rn
    FROM public.traction_engine_weekly_logs WHERE user_id = v_user
  ) scores
  WHERE rn <= 2;

  SELECT count(*)::integer INTO v_demo_signups
  FROM public.demo_studio_signups ds
  JOIN public.demo_studio_projects dp ON dp.id = ds.project_id
  WHERE dp.owner_id = v_user;

  SELECT count(*)::integer INTO v_waitlist_signups
  FROM public.waitlist_signups ws
  JOIN public.waitlist_pages wp ON wp.id = ws.waitlist_page_id
  WHERE wp.user_id = v_user;

  SELECT
    (SELECT count(*) FROM public.demo_studio_demos WHERE owner_id = v_user AND status = 'published')::integer +
    (SELECT count(*) FROM public.mvp_projects WHERE user_id = v_user AND deployment_status = 'deployed')::integer
    INTO v_published_products;

  SELECT jsonb_build_object('id', r.id, 'label', 'Monthly revenue', 'value', COALESCE(r.mrr, r.total_revenue, 0), 'unit', 'currency', 'updatedAt', r.updated_at)
    INTO v_revenue
  FROM public.revenue_metrics r WHERE r.user_id = v_user ORDER BY r.metric_date DESC LIMIT 1;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', k.id, 'label', k.goal_name, 'value', COALESCE(k.current_value, 0),
           'target', k.target_value, 'unit', k.unit, 'trend', k.trend_percentage, 'updatedAt', k.updated_at
         ) ORDER BY k.updated_at DESC NULLS LAST), '[]'::jsonb)
    INTO v_kpis
  FROM (SELECT * FROM public.kpi_goals WHERE user_id=v_user AND COALESCE(is_active,true) ORDER BY updated_at DESC NULLS LAST LIMIT 4) k;

  SELECT ((SELECT count(*) FROM public.vc_views WHERE user_id=v_user AND viewed_at>=v_month_start) +
          (SELECT count(*) FROM public.accelerator_views WHERE user_id=v_user AND viewed_at>=v_month_start))::integer
    INTO v_investor_activity;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', f.id, 'kind', f.file_kind, 'title', f.title, 'summary', f.summary,
           'sourceTool', f.source_table, 'sourceId', f.source_id, 'updatedAt', f.updated_at
         ) ORDER BY f.updated_at DESC), '[]'::jsonb)
    INTO v_artifacts
  FROM (SELECT * FROM public.dashboard_files WHERE user_id=v_user ORDER BY updated_at DESC LIMIT 6) f;

  SELECT (SELECT count(*) FROM public.user_bookmarks WHERE user_id=v_user) +
         (SELECT count(*) FROM public.user_funding_bookmarks WHERE user_id=v_user)
    INTO v_saved_content_count;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', a.id, 'type', a.activity_type, 'sourceTool', a.source_tool,
           'entityType', a.source_entity_type, 'entityId', a.source_entity_id,
           'data', COALESCE(a.activity_data, '{}'::jsonb)
             - 'email' - 'full_name' - 'name' - 'content' - 'message'
             - 'ip' - 'ip_address' - 'website_url' - 'user_id',
           'occurredAt', a.created_at
         ) ORDER BY a.created_at DESC), '[]'::jsonb)
    INTO v_recent_activity
  FROM (SELECT * FROM public.user_activity_log WHERE user_id=v_user ORDER BY created_at DESC LIMIT 12) a;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', pr.id, 'key', COALESCE(pr.metadata->>'recommendation_key', pr.id::text),
           'title', pr.title, 'description', pr.description, 'reason', pr.reason,
           'priority', COALESCE(pr.priority, 1), 'toolKey', pr.metadata->>'tool_key',
           'actionUrl', pr.action_url, 'expiresAt', pr.expires_at
         ) ORDER BY pr.priority DESC, pr.created_at DESC), '[]'::jsonb)
    INTO v_recommendations
  FROM (
    SELECT * FROM public.personalized_recommendations
    WHERE user_id=v_user AND COALESCE(is_dismissed,false)=false AND COALESCE(is_completed,false)=false
      AND (expires_at IS NULL OR expires_at > v_now)
    ORDER BY priority DESC, created_at DESC LIMIT 5
  ) pr;

  SELECT jsonb_build_object(
           'key', 'task:' || t.id, 'kind', 'task', 'toolKey', COALESCE(t.source_tool, 'tasks'),
           'entityId', t.id, 'title', t.task_text, 'description', t.task_description,
           'urgency', CASE WHEN t.task_date < v_today THEN 'high' ELSE COALESCE(t.priority, 'medium') END,
           'reasonCodes', jsonb_build_array(CASE WHEN t.task_date < v_today THEN 'overdue_deadline' ELSE 'due_today' END),
           'estimatedMinutes', COALESCE(t.effort_estimate, 15), 'dueAt', t.deadline_time,
           'actionKind', 'complete_task'
         )
    INTO v_primary_action
  FROM public.daily_tasks t
  WHERE t.user_id=v_user AND t.task_date <= v_today AND COALESCE(t.is_completed,false)=false
    AND COALESCE(t.recommendation_status,'') <> 'dismissed'
  ORDER BY CASE WHEN t.task_date < v_today THEN 0 ELSE 1 END,
           CASE COALESCE(t.priority,'medium') WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
           t.deadline_time NULLS LAST, t.created_at
  LIMIT 1;

  IF v_primary_action IS NULL AND v_unread_count > 0 THEN
    v_primary_action := v_follow_ups->0;
  END IF;

  IF v_primary_action IS NULL AND jsonb_array_length(v_recommendations) > 0 THEN
    v_primary_action := jsonb_build_object(
      'key', 'recommendation:' || (v_recommendations->0->>'key'), 'kind', 'recommendation',
      'toolKey', COALESCE(v_recommendations->0->>'toolKey','dashboard'), 'entityId', v_recommendations->0->>'id',
      'title', v_recommendations->0->>'title', 'description', v_recommendations->0->>'description',
      'urgency', 'medium', 'reasonCodes', jsonb_build_array('personalized_recommendation'),
      'estimatedMinutes', 15, 'dueAt', v_recommendations->0->>'expiresAt', 'actionKind', 'open_tool'
    );
  END IF;

  IF v_primary_action IS NULL THEN
    v_primary_action := CASE
      WHEN NOT v_has_icp THEN jsonb_build_object('key','foundation:icp','kind','journey','toolKey','icp_builder','entityId',NULL,'title','Define and save your ICP','description','Customer clarity makes every later decision sharper.','urgency','high','reasonCodes',jsonb_build_array('current_stage_blocker'),'estimatedMinutes',20,'dueAt',NULL,'actionKind','open_tool')
      WHEN NOT v_has_waitlist THEN jsonb_build_object('key','foundation:demo','kind','journey','toolKey','demo_studio','entityId',NULL,'title','Publish a demand page','description','Turn positioning into a measurable market signal.','urgency','high','reasonCodes',jsonb_build_array('journey_progression'),'estimatedMinutes',30,'dueAt',NULL,'actionKind','open_tool')
      WHEN NOT v_has_pmf THEN jsonb_build_object('key','foundation:pmf','kind','journey','toolKey','pmf_lab','entityId',NULL,'title','Capture validation evidence','description','Use real evidence before committing to a larger build.','urgency','high','reasonCodes',jsonb_build_array('current_stage_blocker'),'estimatedMinutes',20,'dueAt',NULL,'actionKind','open_tool')
      WHEN NOT v_has_mvp THEN jsonb_build_object('key','foundation:mvp','kind','journey','toolKey','mvp_builder','entityId',NULL,'title','Scope your smallest useful MVP','description','Translate validated demand into a focused product.','urgency','medium','reasonCodes',jsonb_build_array('journey_progression'),'estimatedMinutes',30,'dueAt',NULL,'actionKind','open_tool')
      WHEN NOT v_has_gtm THEN jsonb_build_object('key','foundation:gtm','kind','journey','toolKey','gtm_strategist','entityId',NULL,'title','Save your go-to-market plan','description','Choose the channels and launch plays you will execute.','urgency','medium','reasonCodes',jsonb_build_array('journey_progression'),'estimatedMinutes',25,'dueAt',NULL,'actionKind','open_tool')
      ELSE jsonb_build_object('key','momentum:traction','kind','journey','toolKey','traction_engine','entityId',NULL,'title','Log this week''s traction','description','Keep growth and retention evidence current.','urgency','medium','reasonCodes',jsonb_build_array('stale_business_signal'),'estimatedMinutes',15,'dueAt',NULL,'actionKind','open_tool')
    END;
  END IF;

  SELECT COALESCE(jsonb_agg(action), '[]'::jsonb) INTO v_secondary_actions
  FROM (
    SELECT jsonb_build_object(
      'key','task:'||t.id,'kind','task','toolKey',COALESCE(t.source_tool,'tasks'),'entityId',t.id,
      'title',t.task_text,'description',t.task_description,'urgency',COALESCE(t.priority,'medium'),
      'reasonCodes',jsonb_build_array('due_today'),'estimatedMinutes',COALESCE(t.effort_estimate,15),
      'dueAt',t.deadline_time,'actionKind','complete_task'
    ) action
    FROM public.daily_tasks t
    WHERE t.user_id=v_user AND t.task_date=v_today AND COALESCE(t.is_completed,false)=false
      AND ('task:'||t.id) <> COALESCE(v_primary_action->>'key','')
    ORDER BY t.created_at LIMIT 3
  ) secondary;

  RETURN jsonb_build_object(
    'version', 1,
    'generatedAt', v_now,
    'profile', COALESCE(v_profile, '{}'::jsonb),
    'entitlements', jsonb_build_object('plan', v_plan, 'dashboardMode', v_plan),
    'focus', jsonb_build_object(
      'primaryAction', v_primary_action, 'secondaryActions', v_secondary_actions,
      'dueToday', v_due_today, 'overdueCount', v_overdue_count,
      'routine', v_routine, 'dailyMission', v_daily_mission, 'weeklyMission', v_weekly_mission
    ),
    'journey', jsonb_build_object(
      'currentStage', v_current_stage, 'stages', v_stages, 'tools', v_tools,
      'progressPercent', round((v_stages_completed::numeric / 7) * 100)
    ),
    'people', jsonb_build_object(
      'unreadMessages', v_unread_count, 'savedMentors', v_saved_mentors,
      'upcomingBookings', v_bookings, 'followUps', v_follow_ups,
      'activeCofounderPosts', v_active_cofounder_posts, 'availableServices', v_available_services
    ),
    'business', jsonb_build_object(
      'pmfScore', v_pmf_score, 'tractionScore', v_traction_score,
      'tractionDelta', CASE WHEN v_traction_score IS NOT NULL AND v_traction_previous IS NOT NULL THEN v_traction_score-v_traction_previous ELSE NULL END,
      'demoSignups', v_demo_signups, 'waitlistSignups', v_waitlist_signups,
      'publishedProducts', v_published_products, 'revenue', v_revenue,
      'kpis', v_kpis, 'investorActivity', v_investor_activity
    ),
    'workspace', jsonb_build_object(
      'recentArtifacts', v_artifacts, 'savedContentCount', v_saved_content_count,
      'recentActivity', v_recent_activity
    ),
    'recommendations', v_recommendations
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_snapshot_v1(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_snapshot_v1(text) TO authenticated;

COMMENT ON FUNCTION public.get_dashboard_snapshot_v1(text) IS
  'Versioned, authenticated dashboard read model. Source product tables remain authoritative.';
