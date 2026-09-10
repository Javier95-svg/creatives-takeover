-- Route every new community thread to an admin so it gets a human reply.
--
-- The topic layer's binding constraint is answer rate, not volume: an
-- unanswered thread is worse than an empty feed, because the founder took a
-- visible risk and got silence. Across 350 accounts the feed has produced six
-- posts and one comment, so nobody can rely on other members noticing. Until
-- there is enough traffic for peers to answer each other, a human is on the
-- hook for every thread, and this trigger is what puts the thread in front of
-- them.
--
-- The notification row is also the push delivery: community_notifications
-- bridges to web push when the recipient has push enabled.

CREATE OR REPLACE FUNCTION public.notify_admins_of_new_community_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recipient RECORD;
  thread_title text;
BEGIN
  thread_title := COALESCE(NULLIF(btrim(NEW.title), ''), 'Untitled thread');

  FOR recipient IN
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'admin'
      AND ur.user_id IS DISTINCT FROM NEW.user_id
  LOOP
    INSERT INTO public.community_notifications (
      user_id, actor_id, notification_type, post_id, read, metadata
    )
    VALUES (
      recipient.user_id,
      NEW.user_id,
      'community_thread_awaiting_reply',
      NEW.id,
      false,
      jsonb_build_object(
        'message', 'New thread needs a reply within 24h: ' || thread_title,
        'route', '/mentorship/progress',
        'topic', NEW.tags[1],
        'postId', NEW.id
      )
    );
  END LOOP;

  RETURN NEW;
EXCEPTION
  -- A failed notification must never cost a founder their post. Matches the
  -- non-fatal auto-share in MilestonesTimeline: the artifact is saved even when
  -- the downstream broadcast fails.
  WHEN OTHERS THEN
    RAISE WARNING 'notify_admins_of_new_community_thread failed for post %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS notify_admins_on_new_community_thread ON public.community_posts;

CREATE TRIGGER notify_admins_on_new_community_thread
AFTER INSERT ON public.community_posts
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_of_new_community_thread();