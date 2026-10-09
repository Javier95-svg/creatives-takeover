-- Product adoption, per account, from first-party data only. It reads what the
-- app already records for signed-in users (retention_tool_activity: a tool
-- opened, or started with a first input), the results each tool saves in its
-- own table, and user_activity_log. None of it depends on cookie consent or
-- PostHog, and results come from the tools' tables, so nothing has to be
-- instrumented for them to count, past results included.
--
-- Internal accounts (admins, @creatives-takeover.com) are excluded. Admin only:
-- the check is here, not just on the page.

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
  results AS (
    SELECT user_id, 'icp_builder'::text AS tool, created_at FROM public.icp_analysis_results
    UNION ALL SELECT owner_id, 'demo_studio', created_at FROM public.demo_studio_projects
    UNION ALL SELECT user_id, 'pmf_lab', created_at FROM public.pmf_interviews
    UNION ALL SELECT user_id, 'pmf_lab', created_at FROM public.pmf_surveys
    UNION ALL SELECT user_id, 'pmf_lab', created_at FROM public.pmf_analysis_results
    UNION ALL SELECT user_id, 'mvp_builder', created_at FROM public.mvp_projects
    UNION ALL SELECT user_id, 'tech_stack', created_at FROM public.tech_stack_reports
    UNION ALL SELECT user_id, 'gtm_strategist', created_at FROM public.gtm_plans
    UNION ALL SELECT founder_id, 'first_customer_sprint', created_at FROM public.first_customer_sprints
    UNION ALL SELECT user_id, 'directories', updated_at FROM public.gtm_directory_actions
    UNION ALL SELECT user_id, 'traction_engine', created_at FROM public.traction_engine_weekly_logs
    UNION ALL SELECT user_id, 'pitch_deck_analyzer', created_at FROM public.pitch_deck_analyses
    UNION ALL SELECT user_id, 'insighta_research', created_at FROM public.insighta_pipeline_items
  ),
  account_results AS (
    SELECT r.* FROM results r JOIN accounts a USING (user_id)
  ),
  activity AS (
    SELECT t.user_id, t.occurred_at AS at FROM public.retention_tool_activity t JOIN accounts a USING (user_id)
    UNION ALL SELECT user_id, created_at FROM account_results
    UNION ALL SELECT l.user_id, l.created_at FROM public.user_activity_log l JOIN accounts a USING (user_id)
  ),
  tool_activity AS (
    SELECT t.* FROM public.retention_tool_activity t JOIN accounts a USING (user_id)
  ),
  weeks AS (
    SELECT generate_series(
      date_trunc('week', now()) - make_interval(weeks => v_weeks - 1),
      date_trunc('week', now()),
      interval '1 week'
    ) AS week_start
  ),
  first_result AS (
    SELECT user_id, min(created_at) AS first_at FROM account_results GROUP BY user_id
  )
  SELECT jsonb_build_object(
    'generatedAt', now(),
    'summary', jsonb_build_object(
      'activeAccounts7d', (SELECT count(DISTINCT user_id) FROM activity WHERE at > now() - interval '7 days'),
      'activeAccounts30d', (SELECT count(DISTINCT user_id) FROM activity WHERE at > now() - interval '30 days'),
      'newAccounts30d', (SELECT count(*) FROM accounts WHERE created_at > now() - interval '30 days'),
      'newAccountsActivated30d', (
        SELECT count(*) FROM accounts a JOIN first_result f USING (user_id)
        WHERE a.created_at > now() - interval '30 days' AND f.first_at <= a.created_at + interval '7 days'),
      'accountsWithResultEver', (SELECT count(*) FROM first_result)
    ),
    'weekly', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'week', w.week_start::date,
        'newAccounts', (SELECT count(*) FROM accounts a WHERE a.created_at >= w.week_start AND a.created_at < w.week_start + interval '1 week'),
        'activeAccounts', (SELECT count(DISTINCT user_id) FROM activity x WHERE x.at >= w.week_start AND x.at < w.week_start + interval '1 week'),
        'accountsWithResult', (SELECT count(DISTINCT user_id) FROM account_results r WHERE r.created_at >= w.week_start AND r.created_at < w.week_start + interval '1 week')
      ) ORDER BY w.week_start), '[]'::jsonb)
      FROM weeks w
    ),
    'tools', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'tool', k.tool,
        'opened30d', (SELECT count(DISTINCT user_id) FROM tool_activity t WHERE t.tool = k.tool AND t.status = 'opened' AND t.occurred_at > now() - interval '30 days'),
        'started30d', (SELECT count(DISTINCT user_id) FROM tool_activity t WHERE t.tool = k.tool AND t.status IN ('progress', 'completed') AND t.occurred_at > now() - interval '30 days'),
        'withResult30d', (SELECT count(DISTINCT user_id) FROM account_results r WHERE r.tool = k.tool AND r.created_at > now() - interval '30 days'),
        'results30d', (SELECT count(*) FROM account_results r WHERE r.tool = k.tool AND r.created_at > now() - interval '30 days'),
        'withResultEver', (SELECT count(DISTINCT user_id) FROM account_results r WHERE r.tool = k.tool)
      ) ORDER BY k.tool), '[]'::jsonb)
      FROM (SELECT tool FROM account_results UNION SELECT tool FROM tool_activity) k
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
          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM first_result f WHERE f.user_id = a.user_id AND f.first_at <= a.created_at + interval '7 days')) AS activated,
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
