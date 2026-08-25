-- Routine dashboard upgrade: independent delivery channels, canonical local
-- scheduling, and a snapshot count for the dashboard sidebar.

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS routine_in_app_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS routine_email_enabled boolean NOT NULL DEFAULT true;

UPDATE public.notification_preferences
SET
  routine_in_app_enabled = routine_reminders,
  routine_email_enabled = routine_reminders
WHERE routine_in_app_enabled IS DISTINCT FROM routine_reminders
   OR routine_email_enabled IS DISTINCT FROM routine_reminders;

CREATE OR REPLACE FUNCTION public.notif_pref_enabled(p_user_id uuid, p_channel text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    CASE p_channel
      WHEN 'push_enabled' THEN (SELECT push_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'routine_reminders' THEN (SELECT routine_reminders FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'routine_in_app_enabled' THEN (SELECT routine_in_app_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'routine_email_enabled' THEN (SELECT routine_email_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'task_reminders' THEN (SELECT task_reminders FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'retention_emails' THEN (SELECT retention_emails FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'product_updates' THEN (SELECT product_updates FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'investor_updates' THEN (SELECT investor_updates FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'dm_email_enabled' THEN (SELECT dm_email_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'dm_push_enabled' THEN (SELECT dm_push_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      ELSE true
    END,
    true
  );
$$;

CREATE OR REPLACE FUNCTION public.process_routine_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_inserted integer := 0;
BEGIN
  WITH eligible AS (
    SELECT p.id AS user_id, local_now.local_date, zone.name AS timezone
    FROM public.profiles p
    CROSS JOIN LATERAL (
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM pg_timezone_names WHERE name = NULLIF(p.user_preferences->>'timezone', '')
      ) THEN p.user_preferences->>'timezone' ELSE 'UTC' END AS name
    ) zone
    CROSS JOIN LATERAL (
      SELECT (now() AT TIME ZONE zone.name)::date AS local_date,
             EXTRACT(hour FROM now() AT TIME ZONE zone.name)::int AS local_hour
    ) local_now
    WHERE COALESCE((p.routine_reminder_preferences->>'enabled')::boolean, false)
      AND public.notif_pref_enabled(p.id, 'routine_in_app_enabled')
      AND p.routine_config IS NOT NULL
      AND local_now.local_hour >= COALESCE(NULLIF(split_part(p.routine_reminder_preferences->>'time', ':', 1), '')::int, 9)
      AND NOT EXISTS (
        SELECT 1 FROM public.routine_task_completions c
        WHERE c.user_id = p.id AND c.period_date = local_now.local_date
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.community_notifications n
        WHERE n.user_id = p.id
          AND n.notification_type = 'routine_reminder'
          AND (n.created_at AT TIME ZONE zone.name)::date = local_now.local_date
      )
  ), inserted AS (
    INSERT INTO public.community_notifications (user_id, actor_id, notification_type, read, metadata)
    SELECT user_id, user_id, 'routine_reminder', false,
      jsonb_build_object(
        'message', 'Your founder routine is waiting. Check off today''s habits to keep your streak alive.',
        'route', '/dashboard/routine',
        'image_url', '/lovable-uploads/new-favicon.png'
      )
    FROM eligible
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM inserted;
  RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_routine_reminder_emails()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url text := (SELECT value FROM private.service_config WHERE key = 'supabase_url');
  v_supabase_key text := (SELECT value FROM private.service_config WHERE key = 'supabase_service_key');
  v_queued integer := 0;
  r record;
BEGIN
  IF v_supabase_url IS NULL OR v_supabase_key IS NULL THEN
    RAISE EXCEPTION 'private.service_config missing supabase_url or supabase_service_key';
  END IF;

  FOR r IN
    SELECT p.id AS user_id, au.email, p.full_name
    FROM public.profiles p
    JOIN auth.users au ON au.id = p.id
    CROSS JOIN LATERAL (
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM pg_timezone_names WHERE name = NULLIF(p.user_preferences->>'timezone', '')
      ) THEN p.user_preferences->>'timezone' ELSE 'UTC' END AS name
    ) zone
    CROSS JOIN LATERAL (
      SELECT (now() AT TIME ZONE zone.name)::date AS local_date,
             EXTRACT(hour FROM now() AT TIME ZONE zone.name)::int AS local_hour
    ) local_now
    LEFT JOIN LATERAL (
      SELECT max(c.period_date)::date AS last_checkin
      FROM public.routine_task_completions c
      WHERE c.user_id = p.id AND c.period_type = 'daily' AND c.status = 'completed'
    ) lc ON true
    WHERE COALESCE((p.routine_reminder_preferences->>'enabled')::boolean, false)
      AND public.notif_pref_enabled(p.id, 'routine_email_enabled')
      AND p.routine_config IS NOT NULL
      AND au.email IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.mentors m WHERE m.user_id = p.id)
      AND local_now.local_hour >= COALESCE(NULLIF(split_part(p.routine_reminder_preferences->>'time', ':', 1), '')::int, 9)
      AND (lc.last_checkin IS NULL OR lc.last_checkin <= local_now.local_date - 3)
      AND NOT EXISTS (
        SELECT 1 FROM public.retention_email_log l
        WHERE l.user_id = p.id AND l.sequence = 'routine_reminder'
          AND l.delivery_status IN ('pending', 'sent') AND l.sent_at >= now() - interval '3 days'
      )
      AND (SELECT count(*) FROM public.retention_email_log l
           WHERE l.user_id = p.id AND l.delivery_status IN ('pending', 'sent')
             AND l.sent_at >= now() - interval '7 days') < 3
  LOOP
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-retention-email',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_supabase_key),
      body := jsonb_build_object('userId', r.user_id, 'email', r.email, 'fullName', r.full_name, 'sequence', 'routine_reminder')
    );
    v_queued := v_queued + 1;
  END LOOP;
  RETURN v_queued;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_snapshot_v4(p_timezone text DEFAULT 'UTC')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_timezone text := 'UTC';
  v_today date;
  v_week_start date;
  v_pending integer := 0;
  v_snapshot jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NULLIF(p.user_preferences->>'timezone', ''))
      THEN p.user_preferences->>'timezone'
    WHEN EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_timezone) THEN p_timezone
    ELSE 'UTC'
  END INTO v_timezone
  FROM public.profiles p WHERE p.id = v_user;

  v_timezone := COALESCE(v_timezone, 'UTC');
  v_today := (now() AT TIME ZONE v_timezone)::date;
  v_week_start := date_trunc('week', v_today::timestamp)::date;
  v_snapshot := public.get_dashboard_snapshot_v3(v_timezone);

  WITH active_items AS (
    SELECT item->>'id' AS id,
           CASE WHEN COALESCE(item->>'cadence', 'daily') = 'weekly' THEN 'weekly' ELSE 'daily' END AS period_type,
           CASE WHEN COALESCE(item->>'cadence', 'daily') = 'weekly' THEN v_week_start ELSE v_today END AS period_date
    FROM public.profiles p
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.routine_config->'tasks', '[]'::jsonb)) item
    WHERE p.id = v_user
      AND COALESCE(item->>'active', 'true') <> 'false'
      AND (
        COALESCE(item->>'cadence', 'daily') = 'weekly'
        OR COALESCE(item->'days', '[]'::jsonb) @> jsonb_build_array(EXTRACT(DOW FROM v_today)::integer)
      )
  )
  SELECT count(*)::integer INTO v_pending
  FROM active_items i
  WHERE NOT EXISTS (
    SELECT 1 FROM public.routine_task_completions c
    WHERE c.user_id = v_user AND c.routine_task_id = i.id
      AND c.period_type = i.period_type AND c.period_date = i.period_date
      AND c.status = 'completed'
  );

  RETURN jsonb_set(v_snapshot, '{focus,routine,pendingCount}', to_jsonb(v_pending), true);
END;
$$;

REVOKE ALL ON FUNCTION public.process_routine_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_routine_reminders() TO service_role;
REVOKE ALL ON FUNCTION public.process_routine_reminder_emails() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_routine_reminder_emails() TO service_role;
REVOKE ALL ON FUNCTION public.get_dashboard_snapshot_v4(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_snapshot_v4(text) TO authenticated;
