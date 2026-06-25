-- Bell notification for newly published Podcast ("Founders Unleashed") episodes.
-- Mirrors the Newspaper all-users broadcast (notify_all_users_on_newspaper_publish,
-- restored in 20260608130000): on a new published episode, drop one in-app
-- notification into every user's bell. Adapts to podcast_episodes' boolean
-- `is_published` (vs the stories_articles text `status`) and derives the avatar
-- image from the YouTube thumbnail.

CREATE OR REPLACE FUNCTION public.notify_all_users_on_podcast_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  -- Notify on insert only when already published.
  IF TG_OP = 'INSERT' AND NEW.is_published IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  -- Notify on updates only for draft -> published transitions.
  IF TG_OP = 'UPDATE' AND NOT (NEW.is_published = true AND OLD.is_published IS DISTINCT FROM true) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(
    auth.uid(),
    (
      SELECT u.id
      FROM auth.users u
      WHERE lower(COALESCE(u.email, '')) = 'admin@creatives-takeover.com'
      ORDER BY u.created_at ASC
      LIMIT 1
    ),
    (
      SELECT u.id
      FROM auth.users u
      ORDER BY u.created_at ASC
      LIMIT 1
    )
  )
  INTO v_actor_id;

  IF v_actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.community_notifications (
    user_id,
    actor_id,
    notification_type,
    read,
    metadata
  )
  SELECT
    u.id,
    v_actor_id,
    'podcast_episode_published',
    false,
    jsonb_build_object(
      'episode_id', NEW.id,
      'title', NEW.title,
      'image_url', 'https://i.ytimg.com/vi/' || NEW.youtube_video_id || '/hqdefault.jpg',
      'thumbnail_url', 'https://i.ytimg.com/vi/' || NEW.youtube_video_id || '/hqdefault.jpg',
      'message', 'New podcast episode: ' || NEW.title,
      'route', '/podcast'
    )
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.community_notifications n
    WHERE n.user_id = u.id
      AND n.notification_type = 'podcast_episode_published'
      AND COALESCE(n.metadata->>'episode_id', '') = NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_podcast_publish_notify_all_users ON public.podcast_episodes;
CREATE TRIGGER on_podcast_publish_notify_all_users
AFTER INSERT OR UPDATE ON public.podcast_episodes
FOR EACH ROW
EXECUTE FUNCTION public.notify_all_users_on_podcast_publish();
