-- Retention P0: win back the long-dormant base.
--
-- Audit finding: 192 of 232 users (83%) are dormant >30 days, yet only 24 users
-- received any retention email in 30 days. check-dormant-users only targets
-- narrow windows (signed up 24-25h ago, started BizMap 48-49h ago, last seen
-- 7-8 days ago), so anyone dormant 30+ days is never contacted. The
-- reengagement_30d / reengagement_60d email sequences already exist in
-- send-retention-email but nothing ever triggered them.
--
-- This adds the missing long-dormant win-back: a daily cron that emails each
-- dormant founder reengagement_30d (30-59 days idle) or reengagement_60d (60+),
-- routed through send-retention-email (which already excludes mentors), at most
-- once per 30 days, and never more than 3 retention emails per user per 7 days.

CREATE OR REPLACE FUNCTION public.process_dormant_winback()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text := (SELECT value FROM private.service_config WHERE key = 'supabase_url');
  v_key text := (SELECT value FROM private.service_config WHERE key = 'supabase_service_key');
  v_count integer := 0;
  r record;
BEGIN
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE EXCEPTION 'private.service_config missing supabase_url or supabase_service_key';
  END IF;

  FOR r IN
    SELECT
      p.id AS user_id,
      au.email AS email,
      p.full_name AS full_name,
      GREATEST(0, (EXTRACT(EPOCH FROM now() - COALESCE(p.last_activity_at, au.last_sign_in_at, p.created_at)) / 86400)::int) AS days_dormant
    FROM public.profiles p
    JOIN auth.users au ON au.id = p.id
    WHERE au.email IS NOT NULL
      -- idle for at least 30 days (best available signal)
      AND COALESCE(p.last_activity_at, au.last_sign_in_at, p.created_at) <= now() - interval '30 days'
      -- mentors are excluded from retention email
      AND NOT EXISTS (SELECT 1 FROM public.mentors m WHERE m.user_id = p.id)
      -- at most one win-back per 30 days
      AND NOT EXISTS (
        SELECT 1 FROM public.retention_email_log l
        WHERE l.user_id = p.id
          AND l.sequence LIKE 'reengagement%'
          AND l.sent_at >= now() - interval '30 days'
      )
      -- global cap: <3 retention emails of any kind in the last 7 days
      AND (
        SELECT count(*) FROM public.retention_email_log l
        WHERE l.user_id = p.id AND l.sent_at >= now() - interval '7 days'
      ) < 3
  LOOP
    PERFORM net.http_post(
      url := v_url || '/functions/v1/send-retention-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body := jsonb_build_object(
        'userId', r.user_id,
        'email', r.email,
        'fullName', r.full_name,
        'sequence', CASE WHEN r.days_dormant >= 60 THEN 'reengagement_60d' ELSE 'reengagement_30d' END
      )
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.process_dormant_winback() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_dormant_winback() TO service_role;

-- Daily at 16:00 UTC; per-user 30-day cadence + cap live in the function.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dormant-winback-daily') THEN
    PERFORM cron.unschedule('dormant-winback-daily');
  END IF;
END;
$$;

SELECT cron.schedule(
  'dormant-winback-daily',
  '0 16 * * *',
  $$SELECT public.process_dormant_winback();$$
);
