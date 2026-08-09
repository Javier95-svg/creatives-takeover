CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.trigger_discovery_call_worker_v2(p_worker TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_url TEXT := (SELECT value FROM private.service_config WHERE key = 'supabase_url');
  v_cron_secret TEXT := (SELECT value FROM private.service_config WHERE key = 'discovery_call_cron_secret');
BEGIN
  IF p_worker NOT IN ('process-discovery-call-deadlines', 'process-discovery-call-notifications') THEN
    RAISE EXCEPTION 'Unsupported Discovery Call worker';
  END IF;
  IF v_url IS NULL OR v_cron_secret IS NULL THEN
    RAISE EXCEPTION 'private.service_config missing supabase_url or discovery_call_cron_secret';
  END IF;
  PERFORM net.http_post(
    url := v_url || '/functions/v1/' || p_worker,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_cron_secret
    ),
    body := '{}'::jsonb
  );
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'discovery-call-v2-deadlines') THEN
    PERFORM cron.unschedule('discovery-call-v2-deadlines');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'discovery-call-v2-notifications') THEN
    PERFORM cron.unschedule('discovery-call-v2-notifications');
  END IF;
END;
$$;

SELECT cron.schedule(
  'discovery-call-v2-deadlines', '*/15 * * * *',
  $$SELECT public.trigger_discovery_call_worker_v2('process-discovery-call-deadlines');$$
);
SELECT cron.schedule(
  'discovery-call-v2-notifications', '* * * * *',
  $$SELECT public.trigger_discovery_call_worker_v2('process-discovery-call-notifications');$$
);

REVOKE ALL ON FUNCTION public.trigger_discovery_call_worker_v2(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_discovery_call_worker_v2(TEXT) TO service_role;
