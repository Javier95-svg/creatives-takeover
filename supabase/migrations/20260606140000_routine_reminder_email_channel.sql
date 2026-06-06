-- Add an EMAIL channel to the founder routine reminder, so it can pull an
-- absent user back into the product (the in-app community_notifications nudge
-- from 20260606120000 only reaches users who are already in the app).
--
-- Routed through the existing retention email stack (send-retention-email +
-- retention_email_log + Resend) via net.http_post.
--
-- SERVICE CONFIG: the previous net.http_post jobs in this project tried to read
-- the project URL + service key from current_setting('app.settings.*'), but that
-- GUC can only be set with privileges Supabase does not grant us — so those jobs
-- (send-weekly-scorecards, etc.) have been failing every run. Instead we read
-- them from a locked-down private.service_config table. The SECRET VALUES are
-- inserted out-of-band (not in this migration / not in git); this file only
-- creates the empty table and the readers.
--
-- ADOPTION NUDGE (not streak protection): usage data shows ~308 founders have a
-- routine configured but almost none ever log a daily check-in. So the email
-- targets the real gap — getting dormant founders to START — not protecting
-- streaks that do not exist.
--
-- Anti-fatigue: opt-in only; dormant only (no daily check-in in 3+ days);
-- past the founder's preferred hour; at most one routine email every 3 days;
-- global cap of 3 retention emails per 7 days.

-- 1. Locked-down config store for server-side secrets (values set out-of-band).
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.service_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE private.service_config FROM PUBLIC, anon, authenticated;

-- 2. Routine adoption-nudge email.
CREATE OR REPLACE FUNCTION public.process_routine_reminder_emails()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url text := (SELECT value FROM private.service_config WHERE key = 'supabase_url');
  v_supabase_key text := (SELECT value FROM private.service_config WHERE key = 'supabase_service_key');
  v_sent integer := 0;
  v_headline text;
  r record;
BEGIN
  IF v_supabase_url IS NULL OR v_supabase_key IS NULL THEN
    RAISE EXCEPTION 'private.service_config missing supabase_url or supabase_service_key';
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
      AND (lc.last_checkin IS NULL OR lc.last_checkin <= current_date - 3)
      AND NOT EXISTS (
        SELECT 1 FROM public.retention_email_log l
        WHERE l.user_id = p.id
          AND l.sequence = 'routine_reminder'
          AND l.sent_at >= now() - interval '3 days'
      )
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

-- NOTE: the pre-existing send-weekly-scorecards / process-icp-sprint-emails jobs
-- have the same broken app.settings.* GUC dependency and have been failing every
-- run. Repairing them is tracked separately (they edit shared functions and turn
-- dormant email back on, so they need their own explicit sign-off).
