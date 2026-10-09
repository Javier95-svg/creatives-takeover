-- Cookie choices per account, and active time per section, for the admin
-- adoption report.
--
-- 1. analytics_consents: each account's latest cookie choice (status, policy
--    version, when), written by record_analytics_consent() when a signed-in
--    visitor decides and on each sign-in. The report uses it to show how much
--    of the active base has allowed analytics, so time figures can be read
--    against their coverage.
-- 2. section_activity_days.engaged_seconds: active time (tab visible, input in
--    the last minute) per account, section, tool and day, written by
--    record_section_time(). Kept only for accounts whose latest choice is
--    Accept; the browser checks too before measuring anything.
-- 3. admin_adoption_metrics() adds consent coverage and time spent per section
--    and tool. Everything else is unchanged from 20261012120000.

CREATE TABLE IF NOT EXISTS public.analytics_consents (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('granted','denied')),
  version integer NOT NULL CHECK (version > 0),
  decided_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.analytics_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.analytics_consents FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.analytics_consents TO service_role;

CREATE OR REPLACE FUNCTION public.record_analytics_consent(p_status text, p_version integer, p_decided_at timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  -- A device clock cannot place a decision in the future.
  v_decided timestamptz := LEAST(COALESCE(p_decided_at, now()), now());
BEGIN
  IF v_user IS NULL THEN RETURN; END IF;
  IF p_status IS NULL OR p_status NOT IN ('granted','denied') THEN RETURN; END IF;
  IF p_version IS NULL OR p_version < 1 OR p_version > 1000 THEN RETURN; END IF;
  INSERT INTO public.analytics_consents (user_id, status, version, decided_at)
  VALUES (v_user, p_status, p_version, v_decided)
  ON CONFLICT (user_id) DO UPDATE
    SET status = EXCLUDED.status, version = EXCLUDED.version, decided_at = EXCLUDED.decided_at, updated_at = now()
    -- The latest decision wins: signing in on a device with an older choice
    -- does not overwrite a newer one made elsewhere.
    WHERE EXCLUDED.decided_at >= public.analytics_consents.decided_at;
END;
$$;
REVOKE ALL ON FUNCTION public.record_analytics_consent(text, integer, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_analytics_consent(text, integer, timestamptz) TO authenticated;

ALTER TABLE public.section_activity_days ADD COLUMN IF NOT EXISTS engaged_seconds integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.record_section_time(p_section text, p_tool text, p_seconds integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_tool text := COALESCE(p_tool, '');
  -- The browser sends about a minute at a time; anything larger is not real.
  v_seconds integer := LEAST(GREATEST(COALESCE(p_seconds, 0), 0), 300);
BEGIN
  IF v_user IS NULL OR v_seconds = 0 THEN RETURN; END IF;
  IF p_section IS NULL OR p_section NOT IN ('Dashboard','BizMap','Network','Insighta','Community','Content','Bonus') THEN RETURN; END IF;
  IF v_tool !~ '^[A-Za-z0-9 &''-]{0,60}$' THEN v_tool := ''; END IF;
  -- Time is only kept for accounts whose latest choice is Accept.
  IF NOT EXISTS (SELECT 1 FROM public.analytics_consents c WHERE c.user_id = v_user AND c.status = 'granted') THEN RETURN; END IF;
  INSERT INTO public.section_activity_days (user_id, day, section, tool, visits, engaged_seconds)
  VALUES (v_user, (now() AT TIME ZONE 'UTC')::date, p_section, v_tool, 0, v_seconds)
  ON CONFLICT (user_id, day, section, tool)
  DO UPDATE SET engaged_seconds = LEAST(public.section_activity_days.engaged_seconds + v_seconds, 86400), last_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.record_section_time(text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_section_time(text, text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_adoption_metrics(p_weeks integer DEFAULT 12)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_weeks integer := LEAST(GREATEST(COALESCE(p_weeks, 12), 4), 52);
  v_result jsonb;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  WITH accounts AS (
    SELECT u.id AS user_id, u.created_at
    FROM auth.users u
    WHERE u.email NOT ILIKE '%@creatives-takeover.com'
      AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role::text = 'admin')
  ),
  -- The sidebar's sections and tools, in sidebar order. Kept in step with
  -- src/lib/workspaceSections.ts by tests/adoption-metrics.test.ts. Pages and
  -- actions that are no sidebar tool (home, Messages, profiles, connection
  -- requests) carry a null tool and count for their section only.
  section_tools (section, section_order, tool, tool_order) AS (
    VALUES
      ('Dashboard', 1, 'Overview', 1), ('Dashboard', 1, 'Tasks', 2), ('Dashboard', 1, 'Routine', 3),
      ('Dashboard', 1, 'Files', 4), ('Dashboard', 1, 'Referrals', 5),
      ('BizMap', 2, 'ICP Builder', 1), ('BizMap', 2, 'Demo Studio', 2), ('BizMap', 2, 'PMF Lab', 3),
      ('BizMap', 2, 'MVP Builder', 4), ('BizMap', 2, 'GTM Strategist', 5), ('BizMap', 2, 'Directories', 6),
      ('Network', 3, 'Find a Mentor', 1), ('Network', 3, 'Find a Co-Founder', 2), ('Network', 3, 'Find your Angel', 3),
      ('Network', 3, 'Marketplace', 4),
      ('Insighta', 4, 'Traction Engine', 1), ('Insighta', 4, 'VC Search', 2), ('Insighta', 4, 'Pitch Deck Analyzer', 3),
      ('Insighta', 4, 'Insighta Test', 4),
      ('Community', 5, 'Rooms', 1), ('Community', 5, 'Launchpad', 2),
      ('Content', 6, 'Newspaper', 1), ('Content', 6, 'Podcast', 2),
      ('Bonus', 7, 'Accelerator Hunt', 1), ('Bonus', 7, 'Tech Stack Builder', 2)
  ),
  -- Tool activity recorded before the section log existed, mapped to sections.
  legacy_tools (tool_key, section, tool) AS (
    VALUES
      ('icp_builder', 'BizMap', 'ICP Builder'), ('demo_studio', 'BizMap', 'Demo Studio'),
      ('pmf_lab', 'BizMap', 'PMF Lab'), ('mvp_builder', 'BizMap', 'MVP Builder'),
      ('gtm_strategist', 'BizMap', 'GTM Strategist'), ('first_customer_sprint', 'BizMap', 'GTM Strategist'),
      ('directories', 'BizMap', 'Directories'), ('traction_engine', 'Insighta', 'Traction Engine'),
      ('vc_search', 'Insighta', 'VC Search'), ('pitch_deck_analyzer', 'Insighta', 'Pitch Deck Analyzer'),
      ('insighta_test', 'Insighta', 'Insighta Test'),
      ('accelerator_hunt', 'Bonus', 'Accelerator Hunt'), ('tech_stack', 'Bonus', 'Tech Stack Builder')
  ),
  visits AS (
    SELECT s.user_id, s.section, NULLIF(s.tool, '') AS tool, s.first_at AS at, s.day
    FROM public.section_activity_days s JOIN accounts a USING (user_id)
    UNION ALL
    SELECT t.user_id, m.section, m.tool, t.occurred_at, (t.occurred_at AT TIME ZONE 'UTC')::date
    FROM public.retention_tool_activity t JOIN accounts a USING (user_id) JOIN legacy_tools m ON m.tool_key = t.tool
  ),
  -- Active time, from accounts that accepted analytics, last 30 days.
  time_spent AS (
    SELECT s.user_id, s.section, NULLIF(s.tool, '') AS tool, s.engaged_seconds
    FROM public.section_activity_days s JOIN accounts a USING (user_id)
    WHERE s.engaged_seconds > 0 AND s.day > (now() AT TIME ZONE 'UTC')::date - 30
  ),
  consents AS (
    SELECT c.user_id, c.status FROM public.analytics_consents c JOIN accounts a USING (user_id)
  ),
  -- Real actions, from each section's own tables.
  raw_actions (user_id, section, tool, at) AS (
    SELECT user_id, 'Dashboard', 'Tasks'::text, completed_at FROM public.daily_tasks WHERE completed_at IS NOT NULL
    UNION ALL SELECT user_id, 'Dashboard', 'Routine', COALESCE(completed_at, created_at) FROM public.routine_task_completions
    UNION ALL SELECT referrer_user_id, 'Dashboard', 'Referrals', created_at FROM public.referrals
    UNION ALL SELECT user_id, 'BizMap', 'ICP Builder', created_at FROM public.icp_analysis_results
    UNION ALL SELECT owner_id, 'BizMap', 'Demo Studio', created_at FROM public.demo_studio_projects
    UNION ALL SELECT user_id, 'BizMap', 'PMF Lab', created_at FROM public.pmf_interviews
    UNION ALL SELECT user_id, 'BizMap', 'PMF Lab', created_at FROM public.pmf_surveys
    UNION ALL SELECT user_id, 'BizMap', 'PMF Lab', created_at FROM public.pmf_analysis_results
    UNION ALL SELECT user_id, 'BizMap', 'MVP Builder', created_at FROM public.mvp_projects
    UNION ALL SELECT user_id, 'BizMap', 'GTM Strategist', created_at FROM public.gtm_plans
    UNION ALL SELECT founder_id, 'BizMap', 'GTM Strategist', created_at FROM public.first_customer_sprints
    UNION ALL SELECT user_id, 'BizMap', 'Directories', updated_at FROM public.gtm_directory_actions
    UNION ALL SELECT founder_id, 'Network', 'Find a Mentor', created_at FROM public.discovery_calls WHERE mentor_id IS NOT NULL
    -- Onboarding recommendations save mentors automatically; only a founder's own save counts.
    UNION ALL SELECT user_id, 'Network', 'Find a Mentor', created_at FROM public.mentor_saves WHERE source = 'manual'
    UNION ALL SELECT user_id, 'Network', 'Find a Co-Founder', created_at FROM public.cofounder_posts
    UNION ALL SELECT sender_id, 'Network', 'Find a Co-Founder', created_at FROM public.cofounder_interests
    UNION ALL SELECT user_id, 'Network', 'Find a Co-Founder', created_at FROM public.cofounder_listing_saves
    UNION ALL SELECT founder_id, 'Network', 'Marketplace', created_at FROM public.discovery_calls WHERE service_id IS NOT NULL
    -- Messages and connection requests are Network activity outside any one sidebar tool.
    UNION ALL SELECT sender_id, 'Network', NULL, created_at FROM public.messages WHERE deleted_at IS NULL
    UNION ALL SELECT sender_id, 'Network', NULL, created_at FROM public.friend_requests
    UNION ALL SELECT user_id, 'Insighta', 'Traction Engine', created_at FROM public.traction_engine_weekly_logs
    UNION ALL SELECT user_id, 'Insighta', 'VC Search', created_at FROM public.insighta_pipeline_items WHERE entity_type = 'vc'
    UNION ALL SELECT user_id, 'Insighta', 'Pitch Deck Analyzer', created_at FROM public.pitch_deck_analyses
    UNION ALL SELECT user_id, 'Community', 'Rooms', created_at FROM public.community_posts
    UNION ALL SELECT user_id, 'Community', 'Rooms', created_at FROM public.post_comments
    UNION ALL SELECT user_id, 'Community', 'Rooms', created_at FROM public.user_votes
    UNION ALL SELECT owner_id, 'Community', 'Launchpad', created_at FROM public.launchpad_launches
    UNION ALL SELECT user_id, 'Community', 'Launchpad', created_at FROM public.launchpad_launch_votes
    UNION ALL SELECT user_id, 'Bonus', 'Accelerator Hunt', viewed_at FROM public.accelerator_views
    UNION ALL SELECT user_id, 'Bonus', 'Accelerator Hunt', created_at FROM public.insighta_pipeline_items WHERE entity_type = 'accelerator'
    UNION ALL SELECT user_id, 'Bonus', 'Tech Stack Builder', created_at FROM public.tech_stack_reports
  ),
  actions AS (
    SELECT r.* FROM raw_actions r JOIN accounts a USING (user_id) WHERE r.at IS NOT NULL
  ),
  -- Content has no actions: reading on two or more days counts as engaged.
  content_readers AS (
    SELECT user_id, tool, count(DISTINCT day) FILTER (WHERE at > now() - interval '30 days') AS days30, count(DISTINCT day) AS days_ever
    FROM visits WHERE section = 'Content' GROUP BY user_id, tool
  ),
  activity AS (
    SELECT user_id, at FROM visits
    UNION ALL SELECT user_id, at FROM actions
    UNION ALL SELECT l.user_id, l.created_at FROM public.user_activity_log l JOIN accounts a USING (user_id)
  ),
  active30 AS (
    SELECT DISTINCT user_id FROM activity WHERE at > now() - interval '30 days'
  ),
  first_action AS (
    SELECT user_id, min(at) AS first_at FROM actions GROUP BY user_id
  ),
  weeks AS (
    SELECT generate_series(
      date_trunc('week', now()) - make_interval(weeks => v_weeks - 1),
      date_trunc('week', now()),
      interval '1 week'
    ) AS week_start
  ),
  tool_stats AS (
    SELECT st.section, st.section_order, st.tool, st.tool_order,
      (SELECT count(DISTINCT v.user_id) FROM visits v WHERE v.section = st.section AND v.tool = st.tool AND v.at > now() - interval '30 days') AS visited30d,
      CASE WHEN st.section = 'Content'
        THEN (SELECT count(*) FROM content_readers c WHERE c.tool = st.tool AND c.days30 >= 2)
        ELSE (SELECT count(DISTINCT x.user_id) FROM actions x WHERE x.section = st.section AND x.tool = st.tool AND x.at > now() - interval '30 days')
      END AS engaged30d,
      (SELECT count(*) FROM actions x WHERE x.section = st.section AND x.tool = st.tool AND x.at > now() - interval '30 days') AS actions30d,
      CASE WHEN st.section = 'Content'
        THEN (SELECT count(*) FROM content_readers c WHERE c.tool = st.tool AND c.days_ever >= 2)
        ELSE (SELECT count(DISTINCT x.user_id) FROM actions x WHERE x.section = st.section AND x.tool = st.tool)
      END AS engaged_ever,
      (SELECT COALESCE(sum(ts.engaged_seconds), 0) FROM time_spent ts WHERE ts.section = st.section AND ts.tool = st.tool) AS seconds30d,
      (SELECT count(DISTINCT ts.user_id) FROM time_spent ts WHERE ts.section = st.section AND ts.tool = st.tool) AS timed30d
    FROM section_tools st
  )
  SELECT jsonb_build_object(
    'generatedAt', now(),
    'summary', jsonb_build_object(
      'activeAccounts7d', (SELECT count(DISTINCT user_id) FROM activity WHERE at > now() - interval '7 days'),
      'activeAccounts30d', (SELECT count(*) FROM active30),
      'newAccounts30d', (SELECT count(*) FROM accounts WHERE created_at > now() - interval '30 days'),
      'newAccountsActivated30d', (
        SELECT count(*) FROM accounts a JOIN first_action f USING (user_id)
        WHERE a.created_at > now() - interval '30 days' AND f.first_at <= a.created_at + interval '7 days'),
      'accountsWithResultEver', (SELECT count(*) FROM first_action),
      -- Cookie choices of the accounts active in the last 30 days.
      'consentGranted30d', (SELECT count(*) FROM active30 x JOIN consents c USING (user_id) WHERE c.status = 'granted'),
      'consentDenied30d', (SELECT count(*) FROM active30 x JOIN consents c USING (user_id) WHERE c.status = 'denied'),
      'timedAccounts30d', (SELECT count(DISTINCT user_id) FROM time_spent)
    ),
    'weekly', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'week', w.week_start::date,
        'newAccounts', (SELECT count(*) FROM accounts a WHERE a.created_at >= w.week_start AND a.created_at < w.week_start + interval '1 week'),
        'activeAccounts', (SELECT count(DISTINCT user_id) FROM activity x WHERE x.at >= w.week_start AND x.at < w.week_start + interval '1 week'),
        'accountsWithResult', (SELECT count(DISTINCT user_id) FROM actions r WHERE r.at >= w.week_start AND r.at < w.week_start + interval '1 week')
      ) ORDER BY w.week_start), '[]'::jsonb)
      FROM weeks w
    ),
    'sections', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'section', s.section,
        'visited30d', (SELECT count(DISTINCT v.user_id) FROM visits v WHERE v.section = s.section AND v.at > now() - interval '30 days'),
        'engaged30d', CASE WHEN s.section = 'Content'
          THEN (SELECT count(DISTINCT c.user_id) FROM content_readers c WHERE c.days30 >= 2)
          ELSE (SELECT count(DISTINCT x.user_id) FROM actions x WHERE x.section = s.section AND x.at > now() - interval '30 days') END,
        'actions30d', (SELECT count(*) FROM actions x WHERE x.section = s.section AND x.at > now() - interval '30 days'),
        'engagedEver', CASE WHEN s.section = 'Content'
          THEN (SELECT count(DISTINCT c.user_id) FROM content_readers c WHERE c.days_ever >= 2)
          ELSE (SELECT count(DISTINCT x.user_id) FROM actions x WHERE x.section = s.section) END,
        'seconds30d', (SELECT COALESCE(sum(ts.engaged_seconds), 0) FROM time_spent ts WHERE ts.section = s.section),
        'timedAccounts30d', (SELECT count(DISTINCT ts.user_id) FROM time_spent ts WHERE ts.section = s.section),
        'tools', (
          SELECT jsonb_agg(jsonb_build_object(
            'tool', t.tool, 'visited30d', t.visited30d, 'engaged30d', t.engaged30d,
            'actions30d', t.actions30d, 'engagedEver', t.engaged_ever,
            'seconds30d', t.seconds30d, 'timedAccounts30d', t.timed30d
          ) ORDER BY t.tool_order)
          FROM tool_stats t WHERE t.section = s.section
        )
      ) ORDER BY s.section_order), '[]'::jsonb)
      FROM (SELECT DISTINCT section, section_order FROM section_tools) s
    ),
    'cohorts', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'week', w.week_start::date,
        'accounts', c.accounts,
        -- Each measure is null until its window has passed for every account
        -- in the cohort, so totals only cover finished cohorts.
        'activated7d', CASE WHEN w.week_start + interval '14 days' <= now() THEN c.activated END,
        'activeWeek1', CASE WHEN w.week_start + interval '14 days' <= now() THEN c.week1 END,
        'activeWeek4', CASE WHEN w.week_start + interval '35 days' <= now() THEN c.week4 END
      ) ORDER BY w.week_start), '[]'::jsonb)
      FROM weeks w
      CROSS JOIN LATERAL (
        SELECT
          count(*) AS accounts,
          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM first_action f WHERE f.user_id = a.user_id AND f.first_at <= a.created_at + interval '7 days')) AS activated,
          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM activity x WHERE x.user_id = a.user_id AND x.at >= a.created_at + interval '7 days' AND x.at < a.created_at + interval '14 days')) AS week1,
          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM activity x WHERE x.user_id = a.user_id AND x.at >= a.created_at + interval '28 days' AND x.at < a.created_at + interval '35 days')) AS week4
        FROM accounts a
        WHERE a.created_at >= w.week_start AND a.created_at < w.week_start + interval '1 week'
      ) c
      WHERE c.accounts > 0
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adoption_metrics(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adoption_metrics(integer) TO authenticated;
