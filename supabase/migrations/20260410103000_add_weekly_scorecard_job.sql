CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_send_weekly_scorecards()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url TEXT;
  supabase_key TEXT;
  http_request_id BIGINT;
BEGIN
  supabase_url := current_setting('app.settings.supabase_url', true);
  supabase_key := current_setting('app.settings.supabase_service_key', true);

  IF supabase_url IS NULL OR supabase_key IS NULL THEN
    RAISE EXCEPTION 'Missing app.settings.supabase_url or app.settings.supabase_service_key';
  END IF;

  SELECT net.http_post(
    url := supabase_url || '/functions/v1/send-weekly-scorecards',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || supabase_key
    ),
    body := jsonb_build_object(
      'source', 'cron',
      'triggered_at', now()
    )
  )
  INTO http_request_id;

  RAISE LOG 'send-weekly-scorecards triggered with request ID: %', http_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.trigger_send_weekly_scorecards() TO postgres;
GRANT USAGE ON SCHEMA cron TO postgres;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'send-weekly-scorecards-sunday'
  ) THEN
    PERFORM cron.unschedule('send-weekly-scorecards-sunday');
  END IF;
END;
$$;

-- Sunday 18:00 UTC. Adjust app.settings or job cadence if the product standardizes on a different founder timezone.
SELECT cron.schedule(
  'send-weekly-scorecards-sunday',
  '0 18 * * 0',
  $$SELECT public.trigger_send_weekly_scorecards();$$
);