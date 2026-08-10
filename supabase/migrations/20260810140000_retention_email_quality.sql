-- Human-written, stateful inactive-user retention email delivery.
--
-- This migration keeps the existing schedule ceilings, adds an atomic claim so
-- overlapping workers cannot double-send, records the exact copy version used,
-- and pauses the campaign after three unanswered touches.

ALTER TABLE public.retention_email_log
  ADD COLUMN IF NOT EXISTS campaign_key text,
  ADD COLUMN IF NOT EXISTS template_key text,
  ADD COLUMN IF NOT EXISTS template_version integer,
  ADD COLUMN IF NOT EXISTS touch_index integer,
  ADD COLUMN IF NOT EXISTS cta_url text,
  ADD COLUMN IF NOT EXISTS returned_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS send_error text,
  ADD COLUMN IF NOT EXISTS bounced_at timestamptz,
  ADD COLUMN IF NOT EXISTS complained_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'retention_email_log_delivery_status_check'
  ) THEN
    ALTER TABLE public.retention_email_log
      ADD CONSTRAINT retention_email_log_delivery_status_check
      CHECK (delivery_status IN ('pending', 'sent', 'failed'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS retention_email_log_campaign_user_sent_idx
  ON public.retention_email_log (campaign_key, user_id, sent_at DESC)
  WHERE campaign_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS retention_email_log_template_sent_idx
  ON public.retention_email_log (template_key, sent_at DESC)
  WHERE template_key IS NOT NULL AND delivery_status = 'sent';

CREATE TABLE IF NOT EXISTS public.retention_campaign_state (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_key text NOT NULL,
  touch_index integer NOT NULL DEFAULT 0 CHECK (touch_index BETWEEN 0 AND 4),
  last_sent_at timestamptz,
  paused_until timestamptz,
  exhausted_at timestamptz,
  last_returned_at timestamptz,
  pending_log_id uuid REFERENCES public.retention_email_log(id) ON DELETE SET NULL,
  claim_expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, campaign_key)
);

ALTER TABLE public.retention_campaign_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.retention_campaign_state FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.retention_campaign_state TO service_role;

COMMENT ON TABLE public.retention_campaign_state IS
  'Service-role-only state for deterministic inactive-user email progression and pause enforcement.';

CREATE OR REPLACE FUNCTION public.claim_inactive_retention_email(
  p_user_id uuid,
  p_email text,
  p_sequence text,
  p_campaign_key text DEFAULT 'inactive_return'
)
RETURNS TABLE (
  claim_status text,
  claimed_log_id uuid,
  claimed_touch_index integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state public.retention_campaign_state%ROWTYPE;
  v_log_id uuid;
  v_touch integer;
  v_recent_interval interval;
BEGIN
  IF p_user_id IS NULL OR NULLIF(trim(p_email), '') IS NULL THEN
    RETURN QUERY SELECT 'invalid_request'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF p_sequence NOT IN (
    'routine_reminder',
    'activation_day7',
    'weekly_digest',
    'reengagement',
    'reengagement_30d',
    'reengagement_60d'
  ) THEN
    RETURN QUERY SELECT 'not_inactive_sequence'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.mentors m WHERE m.user_id = p_user_id) THEN
    RETURN QUERY SELECT 'mentor_excluded'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.retention_email_log l
    WHERE l.user_id = p_user_id AND l.unsubscribed IS TRUE
  ) THEN
    RETURN QUERY SELECT 'unsubscribed'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF NOT public.notif_pref_enabled(
    p_user_id,
    CASE WHEN p_sequence = 'routine_reminder' THEN 'routine_reminders' ELSE 'retention_emails' END
  ) THEN
    RETURN QUERY SELECT 'preference_disabled'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  INSERT INTO public.retention_campaign_state (user_id, campaign_key)
  VALUES (p_user_id, p_campaign_key)
  ON CONFLICT (user_id, campaign_key) DO NOTHING;

  SELECT * INTO v_state
  FROM public.retention_campaign_state
  WHERE user_id = p_user_id AND campaign_key = p_campaign_key
  FOR UPDATE;

  IF v_state.pending_log_id IS NOT NULL AND v_state.claim_expires_at > now() THEN
    RETURN QUERY SELECT 'claim_in_progress'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF v_state.pending_log_id IS NOT NULL THEN
    UPDATE public.retention_email_log
    SET delivery_status = 'failed', send_error = COALESCE(send_error, 'claim_expired')
    WHERE id = v_state.pending_log_id AND delivery_status = 'pending';

    UPDATE public.retention_campaign_state
    SET pending_log_id = NULL, claim_expires_at = NULL, updated_at = now()
    WHERE user_id = p_user_id AND campaign_key = p_campaign_key;
  END IF;

  -- An organic platform return is also a successful reset, even when it did
  -- not arrive through the attributed email CTA.
  IF v_state.last_sent_at IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_user_id
      AND GREATEST(
        COALESCE(p.last_activity_at, '-infinity'::timestamptz),
        COALESCE(p.last_seen_at, '-infinity'::timestamptz),
        COALESCE(p.last_active_at, '-infinity'::timestamptz)
      ) > v_state.last_sent_at
  ) THEN
    UPDATE public.retention_campaign_state
    SET touch_index = 0,
        paused_until = NULL,
        exhausted_at = NULL,
        last_returned_at = GREATEST(
          COALESCE(last_returned_at, '-infinity'::timestamptz),
          now()
        ),
        updated_at = now()
    WHERE user_id = p_user_id AND campaign_key = p_campaign_key;

    v_state.touch_index := 0;
    v_state.paused_until := NULL;
    v_state.exhausted_at := NULL;
    v_state.last_sent_at := NULL;
  END IF;

  IF v_state.exhausted_at IS NOT NULL THEN
    RETURN QUERY SELECT 'campaign_exhausted'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF v_state.paused_until IS NOT NULL AND v_state.paused_until > now() THEN
    RETURN QUERY SELECT 'campaign_paused'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  -- Never send two inactive messages closer together than the fastest existing
  -- routine-reminder window, even when different workers fire together.
  IF v_state.last_sent_at IS NOT NULL AND v_state.last_sent_at >= now() - interval '3 days' THEN
    RETURN QUERY SELECT 'campaign_sent_recently'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  v_recent_interval := CASE
    WHEN p_sequence = 'routine_reminder' THEN interval '3 days'
    ELSE interval '6 days'
  END;

  IF EXISTS (
    SELECT 1 FROM public.retention_email_log l
    WHERE l.user_id = p_user_id
      AND l.sequence = p_sequence
      AND l.delivery_status IN ('pending', 'sent')
      AND l.sent_at >= now() - v_recent_interval
  ) THEN
    RETURN QUERY SELECT 'sequence_sent_recently'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF (
    SELECT count(*) FROM public.retention_email_log l
    WHERE l.user_id = p_user_id
      AND l.delivery_status IN ('pending', 'sent')
      AND l.sent_at >= now() - interval '7 days'
  ) >= 3 THEN
    RETURN QUERY SELECT 'weekly_cap_reached'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  v_touch := CASE
    WHEN v_state.touch_index < 3 THEN v_state.touch_index + 1
    WHEN v_state.touch_index = 3 AND COALESCE(v_state.paused_until, '-infinity'::timestamptz) <= now() THEN 4
    ELSE NULL
  END;

  IF v_touch IS NULL THEN
    RETURN QUERY SELECT 'campaign_exhausted'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  v_log_id := gen_random_uuid();

  INSERT INTO public.retention_email_log (
    id, user_id, email, sequence, sent_at, campaign_key, touch_index, delivery_status
  ) VALUES (
    v_log_id, p_user_id, lower(trim(p_email)), p_sequence, now(), p_campaign_key, v_touch, 'pending'
  );

  UPDATE public.retention_campaign_state
  SET pending_log_id = v_log_id,
      claim_expires_at = now() + interval '15 minutes',
      updated_at = now()
  WHERE user_id = p_user_id AND campaign_key = p_campaign_key;

  RETURN QUERY SELECT 'claimed'::text, v_log_id, v_touch;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_inactive_retention_email(
  p_log_id uuid,
  p_template_key text,
  p_template_version integer,
  p_cta_url text,
  p_resend_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log public.retention_email_log%ROWTYPE;
BEGIN
  SELECT * INTO v_log
  FROM public.retention_email_log
  WHERE id = p_log_id AND delivery_status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN RETURN false; END IF;

  UPDATE public.retention_email_log
  SET template_key = p_template_key,
      template_version = p_template_version,
      cta_url = p_cta_url,
      resend_id = p_resend_id,
      delivery_status = 'sent',
      send_error = NULL,
      sent_at = now()
  WHERE id = p_log_id;

  UPDATE public.retention_campaign_state
  SET touch_index = v_log.touch_index,
      last_sent_at = now(),
      paused_until = CASE WHEN v_log.touch_index = 3 THEN now() + interval '60 days' ELSE paused_until END,
      exhausted_at = CASE WHEN v_log.touch_index = 4 THEN now() ELSE exhausted_at END,
      pending_log_id = NULL,
      claim_expires_at = NULL,
      updated_at = now()
  WHERE user_id = v_log.user_id
    AND campaign_key = v_log.campaign_key
    AND pending_log_id = p_log_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_inactive_retention_email(
  p_log_id uuid,
  p_error text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log public.retention_email_log%ROWTYPE;
BEGIN
  SELECT * INTO v_log
  FROM public.retention_email_log
  WHERE id = p_log_id AND delivery_status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN RETURN false; END IF;

  UPDATE public.retention_email_log
  SET delivery_status = 'failed', send_error = left(COALESCE(p_error, 'send_failed'), 500)
  WHERE id = p_log_id;

  UPDATE public.retention_campaign_state
  SET pending_log_id = NULL, claim_expires_at = NULL, updated_at = now()
  WHERE user_id = v_log.user_id
    AND campaign_key = v_log.campaign_key
    AND pending_log_id = p_log_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_retention_email_return(p_log_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_campaign_key text;
BEGIN
  IF v_user_id IS NULL OR p_log_id IS NULL THEN RETURN false; END IF;

  UPDATE public.retention_email_log
  SET returned_at = COALESCE(returned_at, now())
  WHERE id = p_log_id
    AND user_id = v_user_id
    AND delivery_status = 'sent'
  RETURNING campaign_key INTO v_campaign_key;

  IF NOT FOUND THEN RETURN false; END IF;

  IF v_campaign_key IS NOT NULL THEN
    UPDATE public.retention_campaign_state
    SET touch_index = 0,
        paused_until = NULL,
        exhausted_at = NULL,
        last_returned_at = now(),
        pending_log_id = NULL,
        claim_expires_at = NULL,
        updated_at = now()
    WHERE user_id = v_user_id AND campaign_key = v_campaign_key;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_inactive_retention_email(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_inactive_retention_email(uuid, text, integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_inactive_retention_email(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_retention_email_return(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_inactive_retention_email(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_inactive_retention_email(uuid, text, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_inactive_retention_email(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_retention_email_return(uuid) TO authenticated, service_role;

-- Restore preference enforcement that was lost when the routine CTA was repaired.
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
    LEFT JOIN LATERAL (
      SELECT max(c.period_date)::date AS last_checkin
      FROM public.routine_task_completions c
      WHERE c.user_id = p.id AND c.period_type = 'daily' AND c.status = 'completed'
    ) lc ON true
    WHERE COALESCE(((p.routine_reminder_preferences)::jsonb ->> 'enabled')::boolean, false) = true
      AND public.notif_pref_enabled(p.id, 'routine_reminders')
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
          AND l.delivery_status IN ('pending', 'sent')
          AND l.sent_at >= now() - interval '3 days'
      )
      AND (
        SELECT count(*) FROM public.retention_email_log l
        WHERE l.user_id = p.id
          AND l.delivery_status IN ('pending', 'sent')
          AND l.sent_at >= now() - interval '7 days'
      ) < 3
  LOOP
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
        'sequence', 'routine_reminder'
      )
    );
    v_queued := v_queued + 1;
  END LOOP;

  RETURN v_queued;
END;
$$;

REVOKE ALL ON FUNCTION public.process_routine_reminder_emails() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_routine_reminder_emails() TO service_role;

-- The daily inactive scan is the only long-dormant orchestrator after rollout.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT jobid FROM cron.job
    WHERE jobname IN ('dormant-winback-daily', 'check-dormant-users-daily')
  LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;
EXCEPTION WHEN undefined_table THEN
  NULL;
END;
$$;

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

  SELECT count(*) FILTER (WHERE last_activity_at >= now() - interval '7 days'),
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
      'sent_30d', (SELECT count(*) FROM public.retention_email_log WHERE delivery_status='sent' AND sent_at >= now() - interval '30 days'),
      'distinct_users_30d', (SELECT count(DISTINCT user_id) FROM public.retention_email_log WHERE delivery_status='sent' AND sent_at >= now() - interval '30 days'),
      'open_rate_pct', (SELECT round(100.0 * count(*) FILTER (WHERE opened_at IS NOT NULL) / nullif(count(*),0)) FROM public.retention_email_log WHERE delivery_status='sent' AND sent_at >= now() - interval '30 days'),
      'click_rate_pct', (SELECT round(100.0 * count(*) FILTER (WHERE clicked_at IS NOT NULL) / nullif(count(*),0)) FROM public.retention_email_log WHERE delivery_status='sent' AND sent_at >= now() - interval '30 days'),
      'return_rate_pct', (SELECT round(100.0 * count(*) FILTER (WHERE returned_at IS NOT NULL AND returned_at <= sent_at + interval '7 days') / nullif(count(*),0)) FROM public.retention_email_log WHERE delivery_status='sent' AND sent_at >= now() - interval '30 days'),
      'unsubscribe_users_30d', (SELECT count(DISTINCT user_id) FROM public.retention_email_log WHERE unsubscribed IS TRUE AND sent_at >= now() - interval '30 days'),
      'bounces_30d', (SELECT count(*) FROM public.retention_email_log WHERE bounced_at IS NOT NULL AND sent_at >= now() - interval '30 days'),
      'complaints_30d', (SELECT count(*) FROM public.retention_email_log WHERE complained_at IS NOT NULL AND sent_at >= now() - interval '30 days')
    ),
    'inactive_email_comparison', jsonb_build_object(
      'current_30d', jsonb_build_object(
        'sent', (SELECT count(*) FROM public.retention_email_log WHERE delivery_status='sent' AND sequence IN ('routine_reminder','activation_day7','weekly_digest','reengagement','reengagement_30d','reengagement_60d') AND sent_at >= now() - interval '30 days'),
        'click_rate_pct', (SELECT round(100.0 * count(*) FILTER (WHERE clicked_at IS NOT NULL) / nullif(count(*),0), 1) FROM public.retention_email_log WHERE delivery_status='sent' AND sequence IN ('routine_reminder','activation_day7','weekly_digest','reengagement','reengagement_30d','reengagement_60d') AND sent_at >= now() - interval '30 days'),
        'return_rate_pct', (SELECT round(100.0 * count(*) FILTER (WHERE returned_at IS NOT NULL AND returned_at <= sent_at + interval '7 days') / nullif(count(*),0), 1) FROM public.retention_email_log WHERE delivery_status='sent' AND sequence IN ('routine_reminder','activation_day7','weekly_digest','reengagement','reengagement_30d','reengagement_60d') AND sent_at >= now() - interval '30 days')
      ),
      'previous_30d', jsonb_build_object(
        'sent', (SELECT count(*) FROM public.retention_email_log WHERE delivery_status='sent' AND sequence IN ('routine_reminder','activation_day7','weekly_digest','reengagement','reengagement_30d','reengagement_60d') AND sent_at >= now() - interval '60 days' AND sent_at < now() - interval '30 days'),
        'click_rate_pct', (SELECT round(100.0 * count(*) FILTER (WHERE clicked_at IS NOT NULL) / nullif(count(*),0), 1) FROM public.retention_email_log WHERE delivery_status='sent' AND sequence IN ('routine_reminder','activation_day7','weekly_digest','reengagement','reengagement_30d','reengagement_60d') AND sent_at >= now() - interval '60 days' AND sent_at < now() - interval '30 days')
      )
    ),
    'email_templates', COALESCE((
      SELECT jsonb_agg(to_jsonb(performance) ORDER BY performance.campaign_key, performance.template_key)
      FROM (
        SELECT
          campaign_key,
          template_key,
          template_version,
          count(*) AS sent,
          count(DISTINCT user_id) AS recipients,
          round(100.0 * count(*) FILTER (WHERE clicked_at IS NOT NULL) / nullif(count(*),0), 1) AS click_rate_pct,
          round(100.0 * count(*) FILTER (WHERE returned_at IS NOT NULL AND returned_at <= sent_at + interval '7 days') / nullif(count(*),0), 1) AS return_rate_pct,
          round(100.0 * count(*) FILTER (WHERE
            returned_at IS NOT NULL AND (
              EXISTS (
                SELECT 1 FROM public.user_activity_log a
                WHERE a.user_id = retention_email_log.user_id
                  AND a.created_at >= retention_email_log.returned_at
                  AND a.created_at <= retention_email_log.returned_at + interval '7 days'
                  AND a.activity_type IN (
                    'artifact_saved', 'artifact_resumed', 'first_message_sent', 'mentor_saved',
                    'activation_completed', 'activation_first_output_generated'
                  )
              ) OR EXISTS (
                SELECT 1 FROM public.routine_task_completions c
                WHERE c.user_id = retention_email_log.user_id
                  AND c.status = 'completed'
                  AND c.completed_at >= retention_email_log.returned_at
                  AND c.completed_at <= retention_email_log.returned_at + interval '7 days'
              )
            )
          ) / nullif(count(*),0), 1) AS meaningful_action_rate_pct,
          count(*) FILTER (WHERE unsubscribed IS TRUE) AS unsubscribes,
          count(*) FILTER (WHERE bounced_at IS NOT NULL) AS bounces,
          count(*) FILTER (WHERE complained_at IS NOT NULL) AS complaints
        FROM public.retention_email_log
        WHERE delivery_status = 'sent'
          AND campaign_key IS NOT NULL
          AND template_key IS NOT NULL
          AND sent_at >= now() - interval '30 days'
        GROUP BY campaign_key, template_key, template_version
      ) performance
    ), '[]'::jsonb),
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
