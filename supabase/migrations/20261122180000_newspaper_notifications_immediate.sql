-- Newspaper bell notifications arrive seconds after publishing again (2026-11-22).
--
-- 20261111180000 moved the fan-out out of the editor's save and into a job
-- that runs once a minute, so publishing could no longer time out. Since then
-- every notification waited for the next tick: 13 to 49 s after publishing
-- for the six articles since 2026-11-12, against about 0 s for the 27 before.
-- The bell itself was fine; it refetches within a second of the rows arriving.
--
-- Fix: keep the queue (publishing stays constant time) but, when an article is
-- queued, also ask the database to process the queue straight away through
-- pg_net. pg_net sends the request after the publish commits, from its own
-- connection, so the editor's save never waits for it and never sees its
-- errors. The fan-out itself takes 1 to 4 s for ~280 accounts.
--
-- The every-minute job stays as the safety net: if the request fails or times
-- out, the article is still unprocessed and the next tick picks it up.
-- FOR UPDATE SKIP LOCKED keeps the two from processing the same article, and
-- the per-account duplicate check gives each account one notification.

CREATE OR REPLACE FUNCTION public.notify_all_users_on_newspaper_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid;
  v_url text;
  v_key text;
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

  -- Process now instead of at the next minute. Never let this fail the publish.
  BEGIN
    SELECT value INTO v_url FROM private.service_config WHERE key = 'supabase_url';
    SELECT value INTO v_key FROM private.service_config WHERE key = 'supabase_service_key';
    IF v_url IS NOT NULL AND v_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_url || '/rest/v1/rpc/process_newspaper_notification_queue',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', v_key,
          'Authorization', 'Bearer ' || v_key
        ),
        body := jsonb_build_object('p_limit', 5),
        timeout_milliseconds := 30000
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[notify_all_users_on_newspaper_publish] immediate processing not requested: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
