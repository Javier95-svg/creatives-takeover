-- Keep the in-app article notification's image in sync with the article banner.
--
-- notify_all_users_on_newspaper_publish() snapshots banner_image_url, title and
-- slug into community_notifications.metadata at the moment an article goes
-- draft -> published. Editing the banner afterwards updates stories_articles but
-- leaves every already-fanned-out notification holding the original image, so the
-- bell keeps showing the old banner forever.
--
-- This adds an AFTER UPDATE trigger that rewrites the stored metadata whenever
-- the article's banner, title or slug changes, plus a one-time backfill for rows
-- that have already drifted.
--
-- Scope note: the notification EMAIL (dispatch_article_notification_email) is a
-- one-shot pg_net send at publish time with no outbox, so mail already delivered
-- cannot be corrected here. Only the in-app notification is repairable.

CREATE OR REPLACE FUNCTION public.sync_newspaper_notification_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only the three fields the notification actually renders.
  IF NEW.banner_image_url IS NOT DISTINCT FROM OLD.banner_image_url
     AND NEW.title IS NOT DISTINCT FROM OLD.title
     AND NEW.slug IS NOT DISTINCT FROM OLD.slug THEN
    RETURN NEW;
  END IF;

  UPDATE public.community_notifications
  SET metadata = COALESCE(metadata, '{}'::jsonb)
    || jsonb_build_object(
         'title', NEW.title,
         'slug', NEW.slug,
         'banner_image_url', NEW.banner_image_url,
         'image_url', NEW.banner_image_url,
         'message', 'New Newspaper article: ' || NEW.title,
         'route', '/newspaper/' || NEW.slug
       )
  WHERE notification_type = 'newspaper_article_published'
    AND COALESCE(metadata->>'article_id', '') = NEW.id::text;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block an article edit because the notification sync failed.
    RAISE LOG '[ARTICLE_NOTIFICATION_SYNC] Failed for article %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_newspaper_notification_metadata() IS
  'Rewrites community_notifications.metadata for newspaper_article_published rows when an article banner, title or slug is edited after publish.';

DROP TRIGGER IF EXISTS on_newspaper_update_sync_notifications ON public.stories_articles;
CREATE TRIGGER on_newspaper_update_sync_notifications
AFTER UPDATE ON public.stories_articles
FOR EACH ROW
EXECUTE FUNCTION public.sync_newspaper_notification_metadata();

-- One-time repair of notifications that already drifted from their article.
UPDATE public.community_notifications n
SET metadata = COALESCE(n.metadata, '{}'::jsonb)
  || jsonb_build_object(
       'title', a.title,
       'slug', a.slug,
       'banner_image_url', a.banner_image_url,
       'image_url', a.banner_image_url,
       'message', 'New Newspaper article: ' || a.title,
       'route', '/newspaper/' || a.slug
     )
FROM public.stories_articles a
WHERE n.notification_type = 'newspaper_article_published'
  AND COALESCE(n.metadata->>'article_id', '') = a.id::text
  AND (
    COALESCE(n.metadata->>'image_url', '') IS DISTINCT FROM COALESCE(a.banner_image_url, '')
    OR COALESCE(n.metadata->>'banner_image_url', '') IS DISTINCT FROM COALESCE(a.banner_image_url, '')
    OR COALESCE(n.metadata->>'title', '') IS DISTINCT FROM COALESCE(a.title, '')
    OR COALESCE(n.metadata->>'slug', '') IS DISTINCT FROM COALESCE(a.slug, '')
  );
