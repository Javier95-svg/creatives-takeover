-- Publishing a Newspaper story failed on the first try with "canceling
-- statement due to statement timeout" (found 2026-11-11).
--
-- The AFTER trigger on stories_articles inserted a notification for every
-- account inside the editor's own save. Its duplicate check
--   NOT EXISTS (... WHERE notification_type = 'newspaper_article_published'
--                AND COALESCE(metadata->>'article_id','') = NEW.id::text)
-- had no usable index, so it read all 88,464 notifications and their JSON:
-- 5.9 s on its own (EXPLAIN ANALYZE), before 279 inserts that each fire the
-- push trigger. The authenticated role's statement_timeout is 8 s, so a cold
-- first publish timed out and rolled back; a warm retry sometimes fit.
--
-- Fix:
-- 1. An index on exactly the expression both newspaper triggers filter on.
-- 2. Publishing only queues the article (constant time); a once-a-minute job
--    creates the notifications outside the editor's request, so publishing
--    stays fast however many accounts there are. Notifications arrive within
--    about a minute. Re-publishing an article re-queues it; the duplicate check
--    still gives each account one notification per article.

-- 1. Index ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS community_notifications_newspaper_article_idx
  ON public.community_notifications ((COALESCE(metadata->>'article_id', '')), user_id)
  WHERE notification_type = 'newspaper_article_published';

-- 2. Queue -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS private.newspaper_notification_queue (
  article_id uuid PRIMARY KEY,
  actor_id uuid,
  queued_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  notified integer,
  last_error text
);

-- Same publish rules and actor as before; it now queues instead of fanning out.
CREATE OR REPLACE FUNCTION public.notify_all_users_on_newspaper_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status IS DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;

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

  INSERT INTO private.newspaper_notification_queue (article_id, actor_id)
  VALUES (NEW.id, v_actor_id)
  ON CONFLICT (article_id) DO UPDATE
    SET actor_id = EXCLUDED.actor_id,
        queued_at = now(),
        processed_at = NULL,
        last_error = NULL;

  RETURN NEW;
END;
$function$;

-- Fans out queued articles. Runs from pg_cron, outside any user's 8 s limit.
CREATE OR REPLACE FUNCTION public.process_newspaper_notification_queue(p_limit integer DEFAULT 5)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  q record;
  a public.stories_articles;
  v_notified integer;
  v_done integer := 0;
BEGIN
  FOR q IN
    SELECT * FROM private.newspaper_notification_queue
    WHERE processed_at IS NULL
    ORDER BY queued_at
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 5), 50))
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT * INTO a FROM public.stories_articles WHERE id = q.article_id;

    -- Deleted or unpublished again before the job ran: nothing to announce.
    IF NOT FOUND OR a.status IS DISTINCT FROM 'published' THEN
      UPDATE private.newspaper_notification_queue
      SET processed_at = now(), notified = 0, last_error = NULL
      WHERE article_id = q.article_id;
      v_done := v_done + 1;
      CONTINUE;
    END IF;

    BEGIN
      INSERT INTO public.community_notifications (user_id, actor_id, notification_type, read, metadata)
      SELECT
        u.id,
        q.actor_id,
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
      FROM auth.users u
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.community_notifications n
        WHERE n.user_id = u.id
          AND n.notification_type = 'newspaper_article_published'
          AND COALESCE(n.metadata->>'article_id', '') = a.id::text
      );
      GET DIAGNOSTICS v_notified = ROW_COUNT;

      UPDATE private.newspaper_notification_queue
      SET processed_at = now(), notified = v_notified, last_error = NULL
      WHERE article_id = q.article_id;
      v_done := v_done + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Left unprocessed, so the next run retries it.
      UPDATE private.newspaper_notification_queue
      SET last_error = left(SQLSTATE || ': ' || SQLERRM, 500)
      WHERE article_id = q.article_id;
    END;
  END LOOP;

  RETURN v_done;
END;
$function$;

REVOKE ALL ON FUNCTION public.process_newspaper_notification_queue(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_newspaper_notification_queue(integer) TO service_role;

-- Every minute. cron.schedule with a job name updates the job if it exists.
SELECT cron.schedule(
  'newspaper-notifications-every-minute',
  '* * * * *',
  $cron$SELECT public.process_newspaper_notification_queue(5);$cron$
);
