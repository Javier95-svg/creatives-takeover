-- Schedule the demo-try guest drip worker (process-demo-try-drip) daily.
-- Follows the working pattern from 20260606150000_repair_broken_email_crons.sql:
-- a SECURITY DEFINER function reads the project URL + service key from
-- private.service_config (created in 20260606140000) and POSTs the edge
-- function via pg_net. The orphaned ICP guest drip is intentionally NOT
-- scheduled here — its emails lack unsubscribe links; schedule it only after
-- that gap is fixed.

CREATE OR REPLACE FUNCTION public.trigger_process_demo_try_drip()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url text := (SELECT value FROM private.service_config WHERE key = 'supabase_url');
  v_supabase_key text := (SELECT value FROM private.service_config WHERE key = 'supabase_service_key');
  http_request_id bigint;
BEGIN
  IF v_supabase_url IS NULL OR v_supabase_key IS NULL THEN
    RAISE EXCEPTION 'private.service_config missing supabase_url or supabase_service_key';
  END IF;

  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/process-demo-try-drip',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_supabase_key
    ),
    body := '{}'::jsonb
  )
  INTO http_request_id;

  RAISE LOG 'process-demo-try-drip triggered with request ID: %', http_request_id;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-demo-try-drip-daily') THEN
    PERFORM cron.unschedule('process-demo-try-drip-daily');
  END IF;
END;
$$;

SELECT cron.schedule(
  'process-demo-try-drip-daily',
  '0 9 * * *',
  $$SELECT public.trigger_process_demo_try_drip();$$
);
