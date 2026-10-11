-- Customer Discovery follow-ups, and return cues that actually arrive.
--
-- 1. pmf_discovery_leads.follow_up_at / follow_up_cue_id: when the founder
--    planned to follow up with a lead, and the return cue that reminds them.
--    The existing row policies cover the new columns.
-- 2. claim_due_return_cues_v1: a discovery follow-up's in-app notification
--    says who to follow up with (from the cue's metadata) instead of
--    "Your planned next action is ready". Everything else is unchanged.
-- 3. The process-return-cues cron job now calls with the service role key
--    from private.service_config, like the other jobs. It sent a vault secret
--    that never matched the function's CRON_SECRET, so every run answered 401
--    and no return cue (investor, mentor or other) was ever delivered. The
--    function is deployed with verify_jwt on and checks the role claim.

ALTER TABLE public.pmf_discovery_leads
  ADD COLUMN IF NOT EXISTS follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_cue_id uuid REFERENCES public.user_return_cues(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.claim_due_return_cues_v1(p_limit integer DEFAULT 50)
 RETURNS TABLE(cue_id uuid, user_id uuid, email text, full_name text, reason_key text, source_section text, cta_url text, send_email boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE v_cue public.user_return_cues%ROWTYPE; v_email_allowed boolean;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501'; END IF;

  UPDATE public.user_return_cues
  SET status = 'expired', updated_at = now()
  WHERE status = 'scheduled' AND scheduled_for < now() - interval '7 days';

  FOR v_cue IN
    SELECT * FROM public.user_return_cues
    WHERE status = 'scheduled' AND scheduled_for <= now()
      AND (email_delivered_at IS NULL)
      AND (email_claimed_at IS NULL OR email_claimed_at < now() - interval '2 hours')
    ORDER BY scheduled_for
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    FOR UPDATE SKIP LOCKED
  LOOP
    IF v_cue.in_app_delivered_at IS NULL THEN
      INSERT INTO public.community_notifications(user_id, actor_id, notification_type, read, metadata)
      SELECT v_cue.user_id, v_cue.user_id, 'return_cue', false,
        jsonb_build_object(
          'cueId', v_cue.id, 'reasonKey', v_cue.reason_key,
          'sourceSection', v_cue.source_section, 'route', v_cue.cta_url,
          'title', CASE v_cue.reason_key
            WHEN 'investor_follow_up_due' THEN 'Investor follow-up due'
            WHEN 'mentor_follow_up_due' THEN 'Mentor follow-up due'
            WHEN 'discovery_follow_up_due' THEN left('Time to follow up with ' || COALESCE(NULLIF(btrim(v_cue.metadata->>'name'), ''), 'your contact'), 120)
            ELSE 'Your planned next action is ready'
          END,
          'message', CASE v_cue.reason_key
            WHEN 'discovery_follow_up_due' THEN 'Your follow-up message is ready in Customer Discovery.'
            ELSE 'Continue the action you planned while the context is still fresh.'
          END
        )
      WHERE NOT EXISTS (
        SELECT 1 FROM public.community_notifications n
        WHERE n.user_id = v_cue.user_id AND n.notification_type = 'return_cue'
          AND n.metadata->>'cueId' = v_cue.id::text
      );
    END IF;

    SELECT
      COALESCE(np.retention_emails, true)
      AND NOT EXISTS (
        SELECT 1 FROM public.retention_email_log u
        WHERE u.user_id = v_cue.user_id AND u.unsubscribed IS TRUE
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.retention_email_log recent
        WHERE recent.user_id = v_cue.user_id AND recent.sent_at >= now() - interval '48 hours'
      )
      AND (
        SELECT count(*) FROM public.retention_email_log weekly
        WHERE weekly.user_id = v_cue.user_id AND weekly.sent_at >= now() - interval '7 days'
      ) < 3
    INTO v_email_allowed
    FROM (SELECT 1) anchor
    LEFT JOIN public.notification_preferences np ON np.user_id = v_cue.user_id;

    UPDATE public.user_return_cues
    SET in_app_delivered_at = COALESCE(in_app_delivered_at, now()),
        email_claimed_at = CASE WHEN v_email_allowed THEN now() ELSE email_claimed_at END,
        updated_at = now()
    WHERE id = v_cue.id;

    RETURN QUERY SELECT v_cue.id, v_cue.user_id, u.email::text, p.full_name::text,
      v_cue.reason_key, v_cue.source_section, v_cue.cta_url, COALESCE(v_email_allowed, false)
    FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id WHERE u.id = v_cue.user_id;
  END LOOP;
END;
$function$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-return-cues-every-15-minutes') THEN
    PERFORM cron.unschedule('process-return-cues-every-15-minutes');
  END IF;
END $$;

SELECT cron.schedule(
  'process-return-cues-every-15-minutes',
  '*/15 * * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT value FROM private.service_config WHERE key = 'supabase_url') || '/functions/v1/process-return-cues',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM private.service_config WHERE key = 'supabase_service_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  $cron$
);
