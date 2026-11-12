-- AI provider health check (2026-11-11).
-- One row per AI provider, written by the ai-provider-health edge function,
-- which emails the admins when a provider starts failing or recovers.
-- Runs daily at 07:00 UTC. Admins can read the table; only the service role writes.
BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_provider_health (
  provider text PRIMARY KEY,
  ok boolean NOT NULL,
  configured boolean NOT NULL DEFAULT true,
  message text,
  affects text,
  latency_ms integer,
  checked_at timestamptz NOT NULL DEFAULT now(),
  last_ok_at timestamptz,
  failing_since timestamptz
);

ALTER TABLE public.ai_provider_health ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_provider_health_admin_read" ON public.ai_provider_health;
CREATE POLICY "ai_provider_health_admin_read" ON public.ai_provider_health
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON public.ai_provider_health FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.ai_provider_health FROM authenticated;
GRANT SELECT ON public.ai_provider_health TO authenticated;
GRANT ALL ON public.ai_provider_health TO service_role;

CREATE OR REPLACE FUNCTION public.dispatch_ai_provider_health_check()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_url text := (SELECT value FROM private.service_config WHERE key = 'supabase_url');
  v_key text := (SELECT value FROM private.service_config WHERE key = 'supabase_service_key');
BEGIN
  IF v_url IS NULL OR v_key IS NULL THEN RETURN; END IF;
  PERFORM net.http_post(
    url := v_url || '/functions/v1/ai-provider-health',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
END;
$$;
REVOKE ALL ON FUNCTION public.dispatch_ai_provider_health_check() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_ai_provider_health_check() TO service_role;

-- cron.schedule with a job name updates the job if it already exists.
SELECT cron.schedule('ai-provider-health-daily', '0 7 * * *',
  'SELECT public.dispatch_ai_provider_health_check()');

COMMIT;
