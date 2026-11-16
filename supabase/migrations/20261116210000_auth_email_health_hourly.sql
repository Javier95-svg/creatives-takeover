-- Hourly check of the SMTP login Supabase Auth sends through (2026-11-16).
--
-- That login (a Resend API key) was rejected and every email signup failed
-- with "Error sending confirmation email" until an outside tester noticed.
-- ai-provider-health's auth_email check logs in to the SMTP server without
-- sending anything and emails the admins when it starts failing or recovers.
-- The daily job still runs every check; this one runs only auth_email.
BEGIN;

CREATE OR REPLACE FUNCTION public.dispatch_auth_email_health_check()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_url text := (SELECT value FROM private.service_config WHERE key = 'supabase_url');
  v_key text := (SELECT value FROM private.service_config WHERE key = 'supabase_service_key');
BEGIN
  IF v_url IS NULL OR v_key IS NULL THEN RETURN; END IF;
  PERFORM net.http_post(
    url := v_url || '/functions/v1/ai-provider-health',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    body := '{"only":["auth_email"]}'::jsonb,
    timeout_milliseconds := 30000
  );
END;
$$;
REVOKE ALL ON FUNCTION public.dispatch_auth_email_health_check() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_auth_email_health_check() TO service_role;

-- cron.schedule with a job name updates the job if it already exists.
SELECT cron.schedule('ai-provider-health-auth-email-hourly', '17 * * * *',
  'SELECT public.dispatch_auth_email_health_check()');

COMMIT;
