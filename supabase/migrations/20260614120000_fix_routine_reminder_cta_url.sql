-- Fix the broken CTA link in the founder routine reminder email.
--
-- The "Open my routine" CTA pointed at https://www.creativestakeover.com/dashboard/routine,
-- which is a dead link: wrong domain (creativestakeover.com vs the real
-- creatives-takeover.com) and a route that requires an authenticated session the
-- recipient (a dormant, signed-out founder) does not have.
--
-- Point it at the sign-in page instead, so recipients land on a working page,
-- authenticate, and reach their dashboard routine from there.
--
-- Only the ctaUrl literal changes; the targeting/anti-fatigue logic is unchanged
-- from 20260606150000_repair_broken_email_crons.sql.

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
        'ctaUrl', 'https://creatives-takeover.com/login',
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
