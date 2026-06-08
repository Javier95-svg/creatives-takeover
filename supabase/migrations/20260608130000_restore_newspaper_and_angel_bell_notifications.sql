-- Restore high-signal bell notifications for newly published Newspaper stories
-- and newly added angel investor profiles.
--
-- 20260606180000 removed all-user broadcasts to de-noise the bell, and
-- 20260608120000 restored investor alerts as opt-in only. Product direction has
-- changed: new Newspaper publishes and new Angel network profiles should always
-- light up the in-app bell. Keep the old noisy mentor broadcast disabled.

CREATE OR REPLACE FUNCTION public.notify_all_users_on_new_angel_banner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
BEGIN
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
    'angel_banner_created',
    false,
    jsonb_build_object(
      'angel_id', NEW.id,
      'name', NEW.name,
      'firm_name', NEW.firm_name,
      'picture', NEW.picture,
      'image_url', NEW.picture,
      'title', 'New investor in the network',
      'message', 'New investor joins our network: ' || NEW.name,
      'route', '/investors'
    )
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.community_notifications n
    WHERE n.user_id = u.id
      AND n.notification_type = 'angel_banner_created'
      AND COALESCE(n.metadata->>'angel_id', '') = NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_angel_banner_notify_all_users ON public.angel_investors;
CREATE TRIGGER on_new_angel_banner_notify_all_users
AFTER INSERT ON public.angel_investors
FOR EACH ROW
EXECUTE FUNCTION public.notify_all_users_on_new_angel_banner();

CREATE OR REPLACE FUNCTION public.notify_all_users_on_newspaper_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  -- Notify on insert only when already published.
  IF TG_OP = 'INSERT' AND NEW.status IS DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;

  -- Notify on updates only for draft -> published transitions.
  IF TG_OP = 'UPDATE' AND NOT (NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(
    NEW.author_id,
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
    'newspaper_article_published',
    false,
    jsonb_build_object(
      'article_id', NEW.id,
      'title', NEW.title,
      'slug', NEW.slug,
      'banner_image_url', NEW.banner_image_url,
      'image_url', NEW.banner_image_url,
      'message', 'New Newspaper article: ' || NEW.title,
      'route', '/newspaper/' || NEW.slug
    )
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.community_notifications n
    WHERE n.user_id = u.id
      AND n.notification_type = 'newspaper_article_published'
      AND COALESCE(n.metadata->>'article_id', '') = NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_newspaper_publish_notify_all_users ON public.stories_articles;
CREATE TRIGGER on_newspaper_publish_notify_all_users
AFTER INSERT OR UPDATE ON public.stories_articles
FOR EACH ROW
EXECUTE FUNCTION public.notify_all_users_on_newspaper_publish();

-- Backfill only recent missed Angel profiles. This catches records created
-- while the opt-in-only trigger was live without re-broadcasting older history.
WITH platform_actor AS (
  SELECT u.id
  FROM auth.users u
  WHERE lower(COALESCE(u.email, '')) = 'admin@creatives-takeover.com'
  ORDER BY u.created_at ASC
  LIMIT 1
),
recent_angels AS (
  SELECT a.*
  FROM public.angel_investors a
  WHERE a.created_at >= now() - interval '72 hours'
)
INSERT INTO public.community_notifications (
  user_id,
  actor_id,
  notification_type,
  read,
  metadata
)
SELECT
  u.id,
  COALESCE((SELECT id FROM platform_actor), u.id),
  'angel_banner_created',
  false,
  jsonb_build_object(
    'angel_id', a.id,
    'name', a.name,
    'firm_name', a.firm_name,
    'picture', a.picture,
    'image_url', a.picture,
    'title', 'New investor in the network',
    'message', 'New investor joins our network: ' || a.name,
    'route', '/investors'
  )
FROM recent_angels a
CROSS JOIN auth.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.community_notifications n
  WHERE n.user_id = u.id
    AND n.notification_type = 'angel_banner_created'
    AND COALESCE(n.metadata->>'angel_id', '') = a.id::text
);

-- Backfill only recently published Newspaper articles that missed the bell.
WITH recent_articles AS (
  SELECT sa.*
  FROM public.stories_articles sa
  WHERE sa.status = 'published'
    AND COALESCE(sa.published_at, sa.created_at) >= now() - interval '72 hours'
)
INSERT INTO public.community_notifications (
  user_id,
  actor_id,
  notification_type,
  read,
  metadata
)
SELECT
  u.id,
  COALESCE(a.author_id, u.id),
  'newspaper_article_published',
  false,
  jsonb_build_object(
    'article_id', a.id,
    'title', a.title,
    'slug', a.slug,
    'banner_image_url', a.banner_image_url,
    'image_url', a.banner_image_url,
    'message', 'New Newspaper article: ' || a.title,
    'route', '/newspaper/' || a.slug
  )
FROM recent_articles a
CROSS JOIN auth.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.community_notifications n
  WHERE n.user_id = u.id
    AND n.notification_type = 'newspaper_article_published'
    AND COALESCE(n.metadata->>'article_id', '') = a.id::text
);
