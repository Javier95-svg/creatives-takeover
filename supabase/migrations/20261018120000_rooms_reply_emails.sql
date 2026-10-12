-- Rooms: tell the author by email when someone replies to their post.
--
-- A reply already rings the bell (notify_post_comment), but a founder who
-- signs in once a month never sees it, and the conversation ends there. Each
-- reply from someone else now queues a return cue for the post's author, which
-- process-return-cues sends as the rooms_reply email:
--
-- * At most one email per post per day. More replies before it goes out are
--   counted into the same email ("3 new replies to your post").
-- * Sent 30 minutes after the reply, and not at all if the author opens the
--   post first (complete_rooms_reply_cues_v1, called by the post page).
-- * The bell notification stays with notify_post_comment, so the cue is marked
--   delivered in the app from the start and never adds a second one.
-- * A reply email needs 12 hours since the last email rather than 48, and the
--   weekly cap is 5 rather than 3: it answers the founder's own question, so it
--   is worth more than a nudge. Unsubscribes and email preferences still apply.

ALTER TABLE public.user_return_cues DROP CONSTRAINT IF EXISTS user_return_cues_source_section_check;
ALTER TABLE public.user_return_cues ADD CONSTRAINT user_return_cues_source_section_check
  CHECK (source_section = ANY (ARRAY['dashboard', 'bizmap', 'insighta', 'network', 'resources', 'community']));

CREATE OR REPLACE FUNCTION public.queue_rooms_reply_cue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post public.community_posts%ROWTYPE;
  v_name text;
BEGIN
  IF NEW.hidden_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_post FROM public.community_posts WHERE id = NEW.post_id;
  -- Nobody is emailed about their own reply, or about a hidden post.
  IF NOT FOUND OR v_post.user_id IS NULL OR v_post.user_id = NEW.user_id OR v_post.hidden_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT left(COALESCE(NULLIF(btrim(p.full_name), ''), NULLIF(btrim(p.username), ''), 'A member'), 60)
  INTO v_name
  FROM public.profiles p WHERE p.id = NEW.user_id;

  INSERT INTO public.user_return_cues AS cue (
    user_id, source_section, entity_type, entity_id, reason_key, scheduled_for,
    cta_url, status, dedupe_key, metadata, in_app_delivered_at
  ) VALUES (
    v_post.user_id, 'community', 'community_post', v_post.id::text, 'rooms_reply_received',
    now() + interval '30 minutes',
    '/rooms/posts/' || v_post.id::text, 'scheduled',
    'rooms-reply:' || v_post.id::text || ':' || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
    jsonb_build_object('name', COALESCE(v_name, 'A member'), 'postTitle', left(COALESCE(v_post.title, ''), 120), 'replies', 1, 'kind', 'rooms'),
    now()
  )
  ON CONFLICT (user_id, dedupe_key) DO UPDATE SET
    -- Still waiting: count this reply into the same email. Already opened by
    -- the author: start a fresh email for the replies since.
    scheduled_for = CASE WHEN cue.status = 'scheduled' THEN cue.scheduled_for ELSE now() + interval '30 minutes' END,
    metadata = cue.metadata || jsonb_build_object(
      'name', COALESCE(v_name, 'A member'),
      'replies', CASE WHEN cue.status = 'scheduled' THEN COALESCE((cue.metadata->>'replies')::integer, 1) + 1 ELSE 1 END
    ),
    status = 'scheduled',
    completed_at = NULL,
    updated_at = now()
  WHERE cue.email_delivered_at IS NULL
    AND cue.status IN ('scheduled', 'completed');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_rooms_reply_cue ON public.post_comments;
CREATE TRIGGER queue_rooms_reply_cue
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.queue_rooms_reply_cue();

REVOKE ALL ON FUNCTION public.queue_rooms_reply_cue() FROM PUBLIC, anon, authenticated;

-- The author opened the post, so the replies are read: no email needed.
CREATE OR REPLACE FUNCTION public.complete_rooms_reply_cues_v1(p_post_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;
  UPDATE public.user_return_cues
  SET status = 'completed', completed_at = now(), updated_at = now()
  WHERE user_id = auth.uid()
    AND reason_key = 'rooms_reply_received'
    AND entity_type = 'community_post'
    AND entity_id = p_post_id::text
    AND status = 'scheduled'
    AND email_delivered_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_rooms_reply_cues_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_rooms_reply_cues_v1(uuid) TO authenticated;

-- As in 20261016120000, with the reply email's own spacing and weekly cap.
CREATE OR REPLACE FUNCTION public.claim_due_return_cues_v1(p_limit integer DEFAULT 50)
 RETURNS TABLE(cue_id uuid, user_id uuid, email text, full_name text, reason_key text, source_section text, cta_url text, send_email boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE v_cue public.user_return_cues%ROWTYPE; v_email_allowed boolean; v_reply boolean;
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
    v_reply := v_cue.reason_key = 'rooms_reply_received';

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
        WHERE recent.user_id = v_cue.user_id
          AND recent.sent_at >= now() - CASE WHEN v_reply THEN interval '12 hours' ELSE interval '48 hours' END
      )
      AND (
        SELECT count(*) FROM public.retention_email_log weekly
        WHERE weekly.user_id = v_cue.user_id AND weekly.sent_at >= now() - interval '7 days'
      ) < CASE WHEN v_reply THEN 5 ELSE 3 END
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
