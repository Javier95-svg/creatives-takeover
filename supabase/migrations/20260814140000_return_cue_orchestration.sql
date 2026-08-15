-- One claim/finalize path coordinates in-app and email delivery for return cues.
ALTER TABLE public.user_return_cues
  ADD COLUMN IF NOT EXISTS email_claimed_at timestamptz;

CREATE OR REPLACE FUNCTION public.claim_due_return_cues_v1(p_limit integer DEFAULT 50)
RETURNS TABLE(
  cue_id uuid,
  user_id uuid,
  email text,
  full_name text,
  reason_key text,
  source_section text,
  cta_url text,
  send_email boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
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
            ELSE 'Your planned next action is ready'
          END,
          'message', 'Continue the action you planned while the context is still fresh.'
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
$$;

CREATE OR REPLACE FUNCTION public.finalize_return_cue_email_v1(p_cue_id uuid, p_delivered boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501'; END IF;
  UPDATE public.user_return_cues
  SET email_delivered_at = CASE WHEN p_delivered THEN now() ELSE email_delivered_at END,
      email_claimed_at = NULL,
      updated_at = now()
  WHERE id = p_cue_id AND status = 'scheduled';
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_return_cues_v1(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_return_cue_email_v1(uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_return_cues_v1(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_return_cue_email_v1(uuid,boolean) TO service_role;
