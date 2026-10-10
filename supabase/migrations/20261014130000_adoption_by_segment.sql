-- Adoption by segment: Founders and Builders measured separately.
--
-- admin_adoption_metrics() takes an optional segment ('founder' or 'builder').
-- With one, every figure in the report covers that segment's accounts only,
-- so the page can compare the two side by side and filter its tables. The
-- summary adds how many of those accounts stated their segment (the rest are
-- inferred, see 20261014120000), the median time from sign-up to a first real
-- action, and how many builders moved to Founder at a milestone.
--
-- Everything else is unchanged from 20261013120000. The old one-argument
-- signature is dropped so a call with p_weeks only is not ambiguous.

DROP FUNCTION IF EXISTS public.admin_adoption_metrics(integer);

CREATE OR REPLACE FUNCTION public.admin_adoption_metrics(p_weeks integer DEFAULT 12, p_segment text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_weeks integer := LEAST(GREATEST(COALESCE(p_weeks, 12), 4), 52);
  v_segment text := CASE WHEN p_segment IN ('founder', 'builder') THEN p_segment END;
  v_result jsonb;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  WITH accounts AS (
    SELECT u.id AS user_id, u.created_at, p.segment_stated_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.email NOT ILIKE '%@creatives-takeover.com'
      AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role::text = 'admin')
      AND (v_segment IS NULL OR p.user_type = v_segment)
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
      'accounts', (SELECT count(*) FROM accounts),
      -- Accounts that chose their segment; the rest are inferred labels.
      'statedAccounts', (SELECT count(*) FROM accounts WHERE segment_stated_at IS NOT NULL),
      -- Hours from sign-up to a first real action, for sign-ups in the report window.
      'medianHoursToFirstResult', (
        SELECT round((percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM f.first_at - a.created_at) / 3600))::numeric, 1)
        FROM accounts a JOIN first_action f USING (user_id)
        WHERE a.created_at >= date_trunc('week', now()) - make_interval(weeks => v_weeks - 1) AND f.first_at >= a.created_at),
      -- Builders who moved to Founder at a milestone, not label corrections.
      'builderToFounder', (
        SELECT count(DISTINCT l.user_id) FROM public.user_activity_log l JOIN accounts a USING (user_id)
        WHERE l.activity_type = 'segment_stated' AND l.activity_data->>'from' = 'builder'
          AND l.activity_data->>'to' = 'founder' AND l.activity_data->>'source' = 'graduation'),
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

REVOKE ALL ON FUNCTION public.admin_adoption_metrics(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adoption_metrics(integer, text) TO authenticated;
