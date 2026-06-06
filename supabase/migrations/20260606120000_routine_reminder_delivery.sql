-- Deliver the routine reminders that the dashboard's "Nudge me to check in"
-- preference promises. Previously the preference was stored but never acted on.
-- Mirrors the existing process_task_overdue_reminders pattern: in-app
-- notifications via community_notifications (shown in the NotificationBell),
-- gated, de-duplicated, and run on an hourly cron.
--
-- A founder is reminded at most once per day, only if:
--   - they enabled routine reminders,
--   - the current hour (UTC, best-effort) has reached their preferred time,
--   - they have a routine configured,
--   - they have logged NO routine activity today, and
--   - they have not already been reminded today.

CREATE OR REPLACE FUNCTION public.process_routine_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted INTEGER := 0;
BEGIN
  WITH eligible AS (
    SELECT p.id AS user_id
    FROM public.profiles p
    WHERE COALESCE(((p.routine_reminder_preferences)::jsonb ->> 'enabled')::boolean, false) = true
      AND p.routine_config IS NOT NULL
      AND EXTRACT(HOUR FROM now())::int >=
          COALESCE(NULLIF(split_part((p.routine_reminder_preferences)::jsonb ->> 'time', ':', 1), '')::int, 9)
      AND NOT EXISTS (
        SELECT 1
        FROM public.routine_task_completions c
        WHERE c.user_id = p.id
          AND c.period_date = current_date
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.community_notifications n
        WHERE n.user_id = p.id
          AND n.notification_type = 'routine_reminder'
          AND n.created_at::date = current_date
      )
  ),
  inserted AS (
    INSERT INTO public.community_notifications (user_id, actor_id, notification_type, read, metadata)
    SELECT
      e.user_id,
      e.user_id,
      'routine_reminder',
      false,
      jsonb_build_object(
        'message', 'Your founder routine is waiting. Check off today''s habits to keep your streak alive.',
        'route', '/dashboard/routine',
        'image_url', '/lovable-uploads/new-favicon.png'
      )
    FROM eligible e
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM inserted;

  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.process_routine_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_routine_reminders() TO service_role;

-- Hourly cron; the per-user time + once-per-day guards live in the function.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'routine-reminders-hourly') THEN
    PERFORM cron.unschedule('routine-reminders-hourly');
  END IF;
END;
$$;

SELECT cron.schedule(
  'routine-reminders-hourly',
  '0 * * * *',
  $$SELECT public.process_routine_reminders();$$
);
