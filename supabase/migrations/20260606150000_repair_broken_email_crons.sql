-- Repair the two retention email cron jobs that have been failing every run, and
-- harden the routine reminder against mentor accounts.
--
-- Both jobs depended on Postgres settings (app.settings.* / app.supabase_url /
-- app.service_role_key) that cannot be set with the privileges Supabase grants
-- us, so they errored before sending anything:
--   * send-weekly-scorecards-hourly  -> trigger_send_weekly_scorecards()
--   * process-icp-sprint-emails-daily -> inline current_setting() in the cron
-- Both now read the project URL + service key from private.service_config
-- (created in 20260606140000), the same store the routine reminder uses.
--
-- Mentor exclusion: mentors are service providers, not active founders, and must
-- not receive retention email. The primary guard lives in the send-retention-email
-- edge function (the shared sender). We also exclude them here so the routine
-- reminder never even POSTs for a mentor account.

-- 1. Weekly scorecard trigger.
CREATE OR REPLACE FUNCTION public.trigger_send_weekly_scorecards()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url text := (SELECT value FROM private.service_config WHERE key = 'supabase_url');
  v_supabase_key text := (SELECT value FROM private.service_config WHERE key = 'supabase_service_key');
  http_request_id bigint;
BEGIN
  IF v_supabase_url IS NULL OR v_supabase_key IS NULL THEN
    RAISE EXCEPTION 'private.service_config missing supabase_url or supabase_service_key';
  END IF;

  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/send-weekly-scorecards',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_supabase_key
    ),
    body := jsonb_build_object('source', 'cron', 'triggered_at', now())
  )
  INTO http_request_id;

  RAISE LOG 'send-weekly-scorecards triggered with request ID: %', http_request_id;
END;
$$;

-- 2. ICP sprint emails trigger (replaces the broken inline cron command).
CREATE OR REPLACE FUNCTION public.trigger_process_icp_sprint_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url text := (SELECT value FROM private.service_config WHERE key = 'supabase_url');
  v_supabase_key text := (SELECT value FROM private.service_config WHERE key = 'supabase_service_key');
  http_request_id bigint;
BEGIN
  IF v_supabase_url IS NULL OR v_supabase_key IS NULL THEN
    RAISE EXCEPTION 'private.service_config missing supabase_url or supabase_service_key';
  END IF;

  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/process-icp-sprint-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_supabase_key
    ),
    body := '{}'::jsonb
  )
  INTO http_request_id;

  RAISE LOG 'process-icp-sprint-emails triggered with request ID: %', http_request_id;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-icp-sprint-emails-daily') THEN
    PERFORM cron.unschedule('process-icp-sprint-emails-daily');
  END IF;
END;
$$;

SELECT cron.schedule(
  'process-icp-sprint-emails-daily',
  '0 9 * * *',
  $$SELECT public.trigger_process_icp_sprint_emails();$$
);

-- 3. Exclude mentors from the routine reminder at source (defense in depth).
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
      AND NOT EXISTS (SELECT 1 FROM public.mentors m WHERE m.user_id = p.id)
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
