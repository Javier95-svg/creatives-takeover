-- Retention P1: notification preferences center.
--
-- Now that daily nudges (routine reminders, push, retention email) default ON, give
-- founders one place to control each channel. Absence of a row = all-on, so this
-- changes nothing until a user opts out. The senders honor these flags.

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT true,
  routine_reminders boolean NOT NULL DEFAULT true,
  task_reminders boolean NOT NULL DEFAULT true,
  retention_emails boolean NOT NULL DEFAULT true,
  product_updates boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_prefs_select_own" ON public.notification_preferences;
CREATE POLICY "notif_prefs_select_own" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_prefs_upsert_own" ON public.notification_preferences;
CREATE POLICY "notif_prefs_upsert_own" ON public.notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_prefs_update_own" ON public.notification_preferences;
CREATE POLICY "notif_prefs_update_own" ON public.notification_preferences
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Helper: read a single boolean preference, defaulting to true when unset.
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
      WHEN 'task_reminders' THEN (SELECT task_reminders FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'retention_emails' THEN (SELECT retention_emails FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'product_updates' THEN (SELECT product_updates FROM public.notification_preferences WHERE user_id = p_user_id)
      ELSE true
    END,
    true
  );
$$;

-- Push bridge respects push_enabled.
CREATE OR REPLACE FUNCTION public.push_on_new_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text := (SELECT value FROM private.service_config WHERE key = 'supabase_url');
  v_key text := (SELECT value FROM private.service_config WHERE key = 'supabase_service_key');
BEGIN
  IF v_url IS NULL OR v_key IS NULL THEN RETURN NEW; END IF;
  IF NOT public.notif_pref_enabled(NEW.user_id, 'push_enabled') THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.push_subscriptions s WHERE s.user_id = NEW.user_id) THEN RETURN NEW; END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_url || '/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
      body := jsonb_build_object(
        'userId', NEW.user_id,
        'title', 'Creatives Takeover',
        'message', COALESCE(NEW.metadata->>'message', 'You have a new update'),
        'url', COALESCE(NEW.metadata->>'route', '/dashboard'),
        'tag', NEW.notification_type
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[push_on_new_notification] non-fatal failure user=% msg=%', NEW.user_id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Dormant win-back respects retention_emails.
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
      p.id AS user_id, au.email AS email, p.full_name AS full_name,
      GREATEST(0, (EXTRACT(EPOCH FROM now() - COALESCE(p.last_activity_at, au.last_sign_in_at, p.created_at)) / 86400)::int) AS days_dormant
    FROM public.profiles p
    JOIN auth.users au ON au.id = p.id
    WHERE au.email IS NOT NULL
      AND COALESCE(p.last_activity_at, au.last_sign_in_at, p.created_at) <= now() - interval '30 days'
      AND NOT EXISTS (SELECT 1 FROM public.mentors m WHERE m.user_id = p.id)
      AND public.notif_pref_enabled(p.id, 'retention_emails')
      AND NOT EXISTS (
        SELECT 1 FROM public.retention_email_log l
        WHERE l.user_id = p.id AND l.sequence LIKE 'reengagement%' AND l.sent_at >= now() - interval '30 days'
      )
      AND (SELECT count(*) FROM public.retention_email_log l WHERE l.user_id = p.id AND l.sent_at >= now() - interval '7 days') < 3
  LOOP
    PERFORM net.http_post(
      url := v_url || '/functions/v1/send-retention-email',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
      body := jsonb_build_object(
        'userId', r.user_id, 'email', r.email, 'fullName', r.full_name,
        'sequence', CASE WHEN r.days_dormant >= 60 THEN 'reengagement_60d' ELSE 'reengagement_30d' END
      )
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
