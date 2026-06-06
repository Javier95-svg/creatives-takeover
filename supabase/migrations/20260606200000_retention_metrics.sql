-- Retention P0: a single source-of-truth scoreboard so retention can be measured
-- (you can't get to 10/10 what you can't see). Admin-only, read-only.
--
-- Surfaces the funnel + channel health in one call: active/dormant counts,
-- WAU/MAU, onboarding completion, streak/task/mentor engagement, and retention
-- email reach + open/click rates (the latter populate once the Resend webhook is
-- registered).

CREATE OR REPLACE FUNCTION public.get_retention_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_result jsonb;
  v_wau integer;
  v_mau integer;
BEGIN
  SELECT lower(COALESCE((SELECT email FROM auth.users WHERE id = auth.uid()), '')) = 'admin@creatives-takeover.com'
    INTO v_is_admin;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;

  SELECT count(*) FILTER (WHERE last_activity_at >= now() - interval '7 days') ,
         count(*) FILTER (WHERE last_activity_at >= now() - interval '30 days')
    INTO v_wau, v_mau
  FROM public.profiles;

  v_result := jsonb_build_object(
    'generated_at', now(),
    'users', jsonb_build_object(
      'total_auth', (SELECT count(*) FROM auth.users),
      'active_24h', (SELECT count(*) FROM public.profiles WHERE last_activity_at >= now() - interval '1 day'),
      'active_7d', v_wau,
      'active_30d', v_mau,
      'dormant_30d', (SELECT count(*) FROM auth.users au WHERE COALESCE(
          (SELECT last_activity_at FROM public.profiles p WHERE p.id = au.id), au.last_sign_in_at, au.created_at
        ) < now() - interval '30 days'),
      'signups_7d', (SELECT count(*) FROM auth.users WHERE created_at >= now() - interval '7 days'),
      'signups_30d', (SELECT count(*) FROM auth.users WHERE created_at >= now() - interval '30 days'),
      'wau_mau_ratio_pct', CASE WHEN v_mau > 0 THEN round(100.0 * v_wau / v_mau) ELSE 0 END,
      'onboarding_completion_pct', (SELECT round(100.0 * count(*) FILTER (WHERE onboarding_completed) / nullif(count(*),0)) FROM public.profiles)
    ),
    'engagement', jsonb_build_object(
      'routine_checkins_7d', (SELECT count(DISTINCT user_id) FROM public.routine_task_completions WHERE period_type='daily' AND status='completed' AND period_date >= current_date - 7),
      'tasks_active_30d', (SELECT count(DISTINCT user_id) FROM public.daily_tasks WHERE created_at >= now() - interval '30 days'),
      'discovery_calls_30d', (SELECT count(*) FROM public.discovery_calls WHERE created_at >= now() - interval '30 days')
    ),
    'email', jsonb_build_object(
      'sent_30d', (SELECT count(*) FROM public.retention_email_log WHERE sent_at >= now() - interval '30 days'),
      'distinct_users_30d', (SELECT count(DISTINCT user_id) FROM public.retention_email_log WHERE sent_at >= now() - interval '30 days'),
      'open_rate_pct', (SELECT round(100.0 * count(*) FILTER (WHERE opened_at IS NOT NULL) / nullif(count(*),0)) FROM public.retention_email_log WHERE sent_at >= now() - interval '30 days'),
      'click_rate_pct', (SELECT round(100.0 * count(*) FILTER (WHERE clicked_at IS NOT NULL) / nullif(count(*),0)) FROM public.retention_email_log WHERE sent_at >= now() - interval '30 days')
    ),
    'notifications', jsonb_build_object(
      'sent_30d', (SELECT count(*) FROM public.community_notifications WHERE created_at >= now() - interval '30 days'),
      'read_rate_pct', (SELECT round(100.0 * count(*) FILTER (WHERE read) / nullif(count(*),0)) FROM public.community_notifications WHERE created_at >= now() - interval '30 days')
    )
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_retention_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_retention_metrics() TO authenticated, service_role;
