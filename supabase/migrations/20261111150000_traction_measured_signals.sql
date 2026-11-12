-- Traction Engine: pre-fill from what the platform measured, verify it on save,
-- and retire invented revenue data (Phase 5 of the 2026-11-11 capability plan).
--
-- 1. founder_weekly_signals_for(user, week): for one founder and one week, the
--    visitor cohort of their published MVP apps (first visit that week) and how
--    many came back within 7 and 30 days, plus that week's signups (MVP lead
--    forms, demo pages, waitlists), survey responses and qualified GTM pipeline
--    entries. Internal: clients call get_founder_weekly_signals_v1, which is
--    pinned to auth.uid().
-- 2. A trigger on traction_engine_weekly_logs keeps "platform_verified" honest.
--    save_traction_week stores whatever verification_mode the browser sends, so
--    a week only stays platform-verified when the cohort size equals what was
--    measured and the return counts do not exceed it; otherwise it becomes
--    founder_reported.
-- 3. initialize-dashboard (no caller since May 2026) gave each new account an
--    invented "Monthly Revenue Target" ($2,500 current of $10,000) and 30 days
--    of random revenue_metrics. Core Metrics still showed 80 founders that $2,500.
--    The untouched seeded rows move to private backups and are removed; Core
--    Metrics falls back to what the founder reported at onboarding.

-- 1. Measured signals -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.founder_weekly_signals_for(p_user uuid, p_week_start date)
RETURNS TABLE(
  week_start date,
  cohort_new_visitors integer,
  cohort_back_7d integer,
  cohort_back_30d integer,
  total_visitors integer,
  signups integer,
  mvp_leads integer,
  demo_signups integer,
  waitlist_signups integer,
  survey_responses integer,
  pipeline_qualified integer,
  pipeline_customers integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH bounds AS (
    SELECT p_week_start AS d0,
           p_week_start + 6 AS d6,
           p_week_start::timestamptz AS t0,
           (p_week_start + 7)::timestamptz AS t7
  ),
  visits AS (
    SELECT visitor_id, visit_date FROM public.mvp_app_visits WHERE user_id = p_user
  ),
  firsts AS (
    SELECT visitor_id, min(visit_date) AS first_date FROM visits GROUP BY visitor_id
  ),
  cohort AS (
    SELECT f.visitor_id, f.first_date FROM firsts f, bounds b WHERE f.first_date BETWEEN b.d0 AND b.d6
  ),
  leads AS (
    SELECT count(*)::integer AS n FROM public.mvp_app_leads l, bounds b
    WHERE l.user_id = p_user AND l.created_at >= b.t0 AND l.created_at < b.t7
  ),
  demo AS (
    SELECT count(*)::integer AS n
    FROM public.demo_studio_signups s
    JOIN public.demo_studio_projects p ON p.id = s.project_id, bounds b
    WHERE p.owner_id = p_user AND COALESCE(s.owner_view, false) = false
      AND s.created_at >= b.t0 AND s.created_at < b.t7
  ),
  waitlist AS (
    SELECT count(*)::integer AS n
    FROM public.waitlist_signups s
    JOIN public.waitlist_pages w ON w.id = s.waitlist_page_id, bounds b
    WHERE w.user_id = p_user AND s.created_at >= b.t0 AND s.created_at < b.t7
  ),
  surveys AS (
    SELECT count(*)::integer AS n
    FROM public.pmf_survey_responses r
    JOIN public.pmf_surveys v ON v.id = r.survey_id, bounds b
    WHERE v.user_id = p_user AND r.created_at >= b.t0 AND r.created_at < b.t7
  ),
  pipeline AS (
    SELECT count(*) FILTER (WHERE e.stage IN ('qualified', 'opportunity', 'customer'))::integer AS qualified,
           count(*) FILTER (WHERE e.stage = 'customer')::integer AS customers
    FROM public.gtm_pipeline_entries e, bounds b
    WHERE e.user_id = p_user AND COALESCE(e.occurred_at, e.created_at::date) BETWEEN b.d0 AND b.d6
  )
  SELECT
    p_week_start,
    (SELECT count(*) FROM cohort)::integer,
    (SELECT count(*) FROM cohort c WHERE EXISTS (
      SELECT 1 FROM visits v WHERE v.visitor_id = c.visitor_id
        AND v.visit_date > c.first_date AND v.visit_date <= c.first_date + 7))::integer,
    (SELECT count(*) FROM cohort c WHERE EXISTS (
      SELECT 1 FROM visits v WHERE v.visitor_id = c.visitor_id
        AND v.visit_date > c.first_date AND v.visit_date <= c.first_date + 30))::integer,
    (SELECT count(*) FROM firsts)::integer,
    (SELECT n FROM leads) + (SELECT n FROM demo) + (SELECT n FROM waitlist),
    (SELECT n FROM leads),
    (SELECT n FROM demo),
    (SELECT n FROM waitlist),
    (SELECT n FROM surveys),
    (SELECT qualified FROM pipeline),
    (SELECT customers FROM pipeline);
$$;

REVOKE ALL ON FUNCTION public.founder_weekly_signals_for(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.founder_weekly_signals_for(uuid, date) TO service_role;

CREATE OR REPLACE FUNCTION public.get_founder_weekly_signals_v1(p_week_start date)
RETURNS TABLE(
  week_start date,
  cohort_new_visitors integer,
  cohort_back_7d integer,
  cohort_back_30d integer,
  total_visitors integer,
  signups integer,
  mvp_leads integer,
  demo_signups integer,
  waitlist_signups integer,
  survey_responses integer,
  pipeline_qualified integer,
  pipeline_customers integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.founder_weekly_signals_for(auth.uid(), p_week_start)
  WHERE auth.uid() IS NOT NULL AND p_week_start IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_founder_weekly_signals_v1(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_founder_weekly_signals_v1(date) TO authenticated, service_role;

-- 2. Platform verification is checked, not claimed --------------------------
CREATE OR REPLACE FUNCTION public.enforce_traction_platform_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_week date;
  v_signals record;
BEGIN
  IF NEW.verification_mode IS DISTINCT FROM 'platform_verified'
     AND COALESCE(NEW.score_breakdown->>'retentionSource', '') <> 'platform' THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_week := (NEW.score_breakdown #>> '{retention,cohortWeekStart}')::date;
  EXCEPTION WHEN others THEN
    v_week := NULL;
  END;
  IF v_week IS NOT NULL THEN
    SELECT * INTO v_signals FROM public.founder_weekly_signals_for(NEW.user_id, v_week);
  END IF;

  -- Return counts only grow while a window is open, so a lower claimed count
  -- is never an overstatement; the cohort itself must match exactly.
  IF v_week IS NULL
     OR v_signals.cohort_new_visitors IS NULL
     OR v_signals.cohort_new_visitors = 0
     OR NEW.new_users <> v_signals.cohort_new_visitors
     OR NEW.seven_day_active_users > v_signals.cohort_back_7d
     OR NEW.thirty_day_active_users > v_signals.cohort_back_30d THEN
    NEW.verification_mode := 'founder_reported';
    NEW.score_breakdown := jsonb_set(COALESCE(NEW.score_breakdown, '{}'::jsonb), '{retentionSource}', '"manual"');
  ELSE
    NEW.verification_mode := 'platform_verified';
    NEW.score_breakdown := jsonb_set(COALESCE(NEW.score_breakdown, '{}'::jsonb), '{retentionSource}', '"platform"');
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_traction_platform_verification() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_traction_platform_verification ON public.traction_engine_weekly_logs;
CREATE TRIGGER enforce_traction_platform_verification
  BEFORE INSERT OR UPDATE ON public.traction_engine_weekly_logs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_traction_platform_verification();

-- 3. Retire invented revenue data, keeping backups ---------------------------
-- Restore, if ever needed:
--   INSERT INTO public.kpi_goals SELECT * FROM private.kpi_goals_seeded_20261111;
--   INSERT INTO public.revenue_metrics SELECT * FROM private.revenue_metrics_seeded_20261111;
CREATE TABLE IF NOT EXISTS private.kpi_goals_seeded_20261111 (LIKE public.kpi_goals INCLUDING ALL);
CREATE TABLE IF NOT EXISTS private.revenue_metrics_seeded_20261111 (LIKE public.revenue_metrics INCLUDING ALL);

-- Exactly initialize-dashboard's seed, never edited by the founder.
WITH seeded AS (
  DELETE FROM public.kpi_goals g
  WHERE g.goal_type = 'revenue'
    AND g.goal_name = 'Monthly Revenue Target'
    AND g.current_value = 2500
    AND g.target_value = 10000
    AND g.trend_percentage = 15.3
    AND g.updated_at <= g.created_at + interval '1 minute'
  RETURNING g.*
)
INSERT INTO private.kpi_goals_seeded_20261111 SELECT * FROM seeded ON CONFLICT DO NOTHING;

-- Only users whose revenue history is the seeded 30 days written in one go.
WITH seeded_users AS (
  SELECT user_id FROM public.revenue_metrics
  GROUP BY user_id
  HAVING count(*) = 30 AND max(created_at) - min(created_at) < interval '1 minute'
), seeded AS (
  DELETE FROM public.revenue_metrics r
  USING seeded_users s
  WHERE r.user_id = s.user_id
  RETURNING r.*
)
INSERT INTO private.revenue_metrics_seeded_20261111 SELECT * FROM seeded ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
