-- Add an EMAIL channel to the founder routine reminder, so it can pull an
-- absent user back into the product (the in-app community_notifications nudge
-- from 20260606120000 only reaches users who are already in the app).
--
-- Routed through the existing retention email stack (send-retention-email +
-- retention_email_log + Resend) rather than a new system, mirroring the
-- trigger_send_weekly_scorecards() net.http_post pattern.
--
-- ADOPTION NUDGE (not streak protection): usage data shows ~308 founders have a
-- routine configured but almost none ever log a daily check-in (0 active
-- streaks). So the email targets the real gap — getting dormant founders to
-- START using the routine — rather than protecting streaks that do not exist.
--
-- Anti-fatigue by design:
--   * Opt-in only — routine_reminder_preferences.enabled = true.
--   * Dormant only — no daily routine check-in in the last 3 days (or ever).
--   * Past the founder's preferred hour (best-effort UTC).
--   * At most one routine email every 3 days (retention_email_log dedup).
--   * Global frequency cap — skip if the user already received 3+ retention
--     emails in the last 7 days, so routine nudges never stack on top of weekly
--     scorecards, task-overdue, churn, and lifecycle emails.

CREATE OR REPLACE FUNCTION public.process_routine_reminder_emails()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url text := current_setting('app.settings.supabase_url', true);
  v_supabase_key text := current_setting('app.settings.supabase_service_key', true);
  v_sent integer := 0;
  v_headline text;
  r record;
BEGIN
  IF v_supabase_url IS NULL OR v_supabase_key IS NULL THEN
    RAISE EXCEPTION 'Missing app.settings.supabase_url or app.settings.supabase_service_key';
  END IF;

  FOR r IN
    SELECT
      p.id           AS user_id,
      au.email       AS email,
      p.full_name    AS full_name,
      lc.last_checkin AS last_checkin
    FROM public.profiles p
    JOIN auth.users au ON au.id = p.id
    LEFT JOIN LATERAL (
      SELECT max(c.period_date)::date AS last_checkin
      FROM public.routine_task_completions c
      WHERE c.user_id = p.id
        AND c.period_type = 'daily'
        AND c.status = 'completed'
    ) lc ON true
    WHERE COALESCE(((p.routine_reminder_preferences)::jsonb ->> 'enabled')::boolean, false) = true
      AND p.routine_config IS NOT NULL
      AND au.email IS NOT NULL
      AND EXTRACT(HOUR FROM now())::int >=
          COALESCE(NULLIF(split_part((p.routine_reminder_preferences)::jsonb ->> 'time', ':', 1), '')::int, 9)
      -- dormant: never checked in, or not in the last 3 days
      AND (lc.last_checkin IS NULL OR lc.last_checkin <= current_date - 3)
      -- at most one routine email per 3 days
      AND NOT EXISTS (
        SELECT 1 FROM public.retention_email_log l
        WHERE l.user_id = p.id
          AND l.sequence = 'routine_reminder'
          AND l.sent_at >= now() - interval '3 days'
      )
      -- global cap: <3 retention emails of any kind in the last 7 days
      AND (
        SELECT count(*) FROM public.retention_email_log l
        WHERE l.user_id = p.id
          AND l.sent_at >= now() - interval '7 days'
      ) < 3
  LOOP
    v_headline := CASE
      WHEN r.last_checkin IS NULL THEN
        'You set up a founder routine but have not checked in yet. Start with one habit today.'
      ELSE
        'It has been ' || (current_date - r.last_checkin)::text ||
        ' days since your last routine check-in. Pick it back up with one habit today.'
    END;

    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-retention-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_supabase_key
      ),
      body := jsonb_build_object(
        'userId', r.user_id,
        'email', r.email,
        'fullName', r.full_name,
        'sequence', 'routine_reminder',
        'contextHeadline', v_headline,
        'ctaUrl', 'https://www.creativestakeover.com/dashboard/routine',
        'ctaLabel', 'Open my routine'
      )
    );
    v_sent := v_sent + 1;
  END LOOP;

  RETURN v_sent;
END;
$$;

REVOKE ALL ON FUNCTION public.process_routine_reminder_emails() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_routine_reminder_emails() TO service_role;

-- Hourly; the per-user time, dormancy, dedup and cap guards live in the function.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'routine-reminder-emails-hourly') THEN
    PERFORM cron.unschedule('routine-reminder-emails-hourly');
  END IF;
END;
$$;

SELECT cron.schedule(
  'routine-reminder-emails-hourly',
  '0 * * * *',
  $$SELECT public.process_routine_reminder_emails();$$
);
