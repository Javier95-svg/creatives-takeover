-- Strategy 1: Article notification email
--
-- When a newspaper article transitions to status = 'published', fire an async
-- pg_net call to the send-article-notification-email edge function so that all
-- registered users receive an email notification.
--
-- The existing trigger notify_all_users_on_newspaper_publish() already writes
-- in-app community_notifications rows; this migration adds the email layer.

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function called by the DB trigger on article publish.
-- It is fail-open: any exception is logged but never propagates.
CREATE OR REPLACE FUNCTION public.dispatch_article_notification_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url  TEXT;
  v_service_key   TEXT;
  v_request_id    BIGINT;
BEGIN
  -- Only fire on INSERT when already published, or on UPDATE draft->published.
  IF TG_OP = 'INSERT' AND NEW.status IS DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NOT (
    NEW.status = 'published' AND
    OLD.status IS DISTINCT FROM 'published'
  ) THEN
    RETURN NEW;
  END IF;

  v_supabase_url := nullif(current_setting('app.settings.supabase_url', true), '');
  v_service_key  := nullif(current_setting('app.settings.supabase_service_key', true), '');

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE LOG '[ARTICLE_EMAIL] Missing app.settings — skipping email dispatch for article %', NEW.id;
    RETURN NEW;
  END IF;

  SELECT net.http_post(
    url     := v_supabase_url || '/functions/v1/send-article-notification-email',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body    := jsonb_build_object(
      'articleId',      NEW.id,
      'title',          NEW.title,
      'slug',           NEW.slug,
      'excerpt',        COALESCE(NEW.excerpt, ''),
      'bannerImageUrl', COALESCE(NEW.banner_image_url, ''),
      'hashtags',       COALESCE(NEW.hashtags, ARRAY[]::text[])
    )
  )
  INTO v_request_id;

  RAISE LOG '[ARTICLE_EMAIL] Dispatched for article % (slug: %), request_id: %',
    NEW.id, NEW.slug, v_request_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG '[ARTICLE_EMAIL] Failed to dispatch for article %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.dispatch_article_notification_email() IS
  'Fires send-article-notification-email edge function via pg_net when a stories_articles row is published.';

DROP TRIGGER IF EXISTS on_newspaper_publish_send_email ON public.stories_articles;
CREATE TRIGGER on_newspaper_publish_send_email
AFTER INSERT OR UPDATE ON public.stories_articles
FOR EACH ROW
EXECUTE FUNCTION public.dispatch_article_notification_email();
