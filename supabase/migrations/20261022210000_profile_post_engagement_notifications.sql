BEGIN;

-- Likes and reposts are toggles. Keep one bell item per person, action and
-- profile post so repeatedly toggling cannot flood the author's bell.
CREATE UNIQUE INDEX IF NOT EXISTS profile_engagement_notification_once
ON public.community_notifications (
  user_id, actor_id, notification_type,
  (metadata->>'profile_source'), (metadata->>'profile_post_id')
)
WHERE notification_type IN ('like', 'repost')
  AND metadata->>'profile_source' IN ('journey', 'photo');

CREATE OR REPLACE FUNCTION public.notify_profile_post_engagement()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  post_source text;
  source_id uuid;
  post_owner uuid;
  owner_username text;
  post_text text;
  post_preview text;
  action_type text;
  action_word text;
  actor_name text;
  post_route text;
BEGIN
  post_source := CASE WHEN NEW.journey_id IS NOT NULL THEN 'journey' ELSE 'photo' END;
  source_id := COALESCE(NEW.journey_id, NEW.photo_id);
  IF TG_TABLE_NAME = 'profile_post_comments' THEN
    action_type := 'comment';
  ELSE
    action_type := NEW.kind;
  END IF;
  action_word := CASE action_type WHEN 'like' THEN 'liked' WHEN 'comment' THEN 'commented on' ELSE 'reposted' END;

  IF post_source = 'journey' THEN
    SELECT p.user_id, p.content, owner.username
    INTO post_owner, post_text, owner_username
    FROM public.profile_posts p JOIN public.profiles owner ON owner.id = p.user_id
    WHERE p.id = source_id AND p.publish_at <= now();
  ELSE
    SELECT p.user_id, p.caption, owner.username
    INTO post_owner, post_text, owner_username
    FROM public.user_photos p JOIN public.profiles owner ON owner.id = p.user_id
    WHERE p.id = source_id;
  END IF;

  IF post_owner IS NULL OR post_owner = NEW.user_id THEN RETURN NEW; END IF;

  post_preview := COALESCE(NULLIF(regexp_replace(btrim(post_text), '[[:space:]]+', ' ', 'g'), ''),
                           CASE WHEN post_source = 'photo' THEN 'Photo update' ELSE 'Project update' END);
  IF char_length(post_preview) > 72 THEN post_preview := left(post_preview, 69) || '…'; END IF;
  SELECT COALESCE(NULLIF(btrim(full_name), ''), username, 'Someone') INTO actor_name
  FROM public.profiles WHERE id = NEW.user_id;
  actor_name := COALESCE(actor_name, 'Someone');
  post_route := COALESCE('/profile/' || owner_username, '/profile')
                || '?post=' || post_source || ':' || source_id::text;

  INSERT INTO public.community_notifications (
    user_id, actor_id, notification_type, read, metadata
  ) VALUES (
    post_owner, NEW.user_id, action_type, false,
    jsonb_build_object(
      'profile_source', post_source,
      'profile_post_id', source_id,
      'post_preview', post_preview,
      'route', post_route,
      'message', actor_name || ' ' || action_word || ' your post “' || post_preview || '”'
    )
  ) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_profile_post_reaction ON public.profile_post_reactions;
CREATE TRIGGER notify_profile_post_reaction
AFTER INSERT ON public.profile_post_reactions
FOR EACH ROW EXECUTE FUNCTION public.notify_profile_post_engagement();

DROP TRIGGER IF EXISTS notify_profile_post_comment ON public.profile_post_comments;
CREATE TRIGGER notify_profile_post_comment
AFTER INSERT ON public.profile_post_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_profile_post_engagement();

-- The profile carousel retains only five posts. Remove links to posts deleted
-- by that rule or by their author, so a bell item never points to a missing post.
CREATE OR REPLACE FUNCTION public.remove_profile_post_engagement_notifications()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE post_source text;
BEGIN
  post_source := CASE WHEN TG_TABLE_NAME = 'profile_posts' THEN 'journey' ELSE 'photo' END;
  DELETE FROM public.community_notifications
  WHERE user_id = OLD.user_id
    AND notification_type IN ('like', 'comment', 'repost')
    AND metadata->>'profile_source' = post_source
    AND metadata->>'profile_post_id' = OLD.id::text;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS remove_profile_post_engagement_notifications ON public.profile_posts;
CREATE TRIGGER remove_profile_post_engagement_notifications
AFTER DELETE ON public.profile_posts
FOR EACH ROW EXECUTE FUNCTION public.remove_profile_post_engagement_notifications();

DROP TRIGGER IF EXISTS remove_profile_photo_engagement_notifications ON public.user_photos;
CREATE TRIGGER remove_profile_photo_engagement_notifications
AFTER DELETE ON public.user_photos
FOR EACH ROW EXECUTE FUNCTION public.remove_profile_post_engagement_notifications();

-- Rooms already creates these three notification types. Include the post
-- excerpt and destination there too, so posts shown on Founder IDs have the
-- same useful bell text.
CREATE OR REPLACE FUNCTION public.profile_community_post_notification_metadata(p_post_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'post_preview', left(regexp_replace(btrim(COALESCE(NULLIF(p.title, ''), p.content)), '[[:space:]]+', ' ', 'g'), 72),
    'route', '/rooms/posts/' || p.id::text
  ) FROM public.community_posts p WHERE p.id = p_post_id;
$$;

CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE post_owner uuid;
BEGIN
  SELECT user_id INTO post_owner FROM public.community_posts WHERE id = NEW.post_id;
  PERFORM public.create_community_notification(
    post_owner, NEW.user_id, 'comment', NEW.post_id, NEW.id,
    COALESCE(public.profile_community_post_notification_metadata(NEW.post_id), '{}'::jsonb)
      || jsonb_build_object('comment_content', left(NEW.content, 100))
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE post_owner uuid;
BEGIN
  IF NEW.vote_type = 'up' AND NEW.post_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.vote_type IS DISTINCT FROM NEW.vote_type) THEN
    SELECT user_id INTO post_owner FROM public.community_posts WHERE id = NEW.post_id;
    PERFORM public.create_community_notification(
      post_owner, NEW.user_id, 'like', NEW.post_id, NULL,
      COALESCE(public.profile_community_post_notification_metadata(NEW.post_id), '{}'::jsonb)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_post_liked ON public.user_votes;
CREATE TRIGGER on_post_liked
AFTER INSERT OR UPDATE OF vote_type ON public.user_votes
FOR EACH ROW EXECUTE FUNCTION public.notify_post_like();

CREATE OR REPLACE FUNCTION public.notify_post_repost()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE post_owner uuid;
BEGIN
  SELECT user_id INTO post_owner FROM public.community_posts WHERE id = NEW.post_id;
  PERFORM public.create_community_notification(
    post_owner, NEW.user_id, 'repost', NEW.post_id, NULL,
    COALESCE(public.profile_community_post_notification_metadata(NEW.post_id), '{}'::jsonb)
  );
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
