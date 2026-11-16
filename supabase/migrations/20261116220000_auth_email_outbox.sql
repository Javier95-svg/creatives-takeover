-- Supabase Auth emails through a queue and Resend's API (2026-11-16).
--
-- Supabase sent auth emails over SMTP while the request waited. On
-- 2026-11-16 the SMTP key was rejected and every email signup failed with
-- "Error sending confirmation email". Now:
--   1. The Send Email hook (Postgres) calls public.queue_auth_email, which
--      only stores the email and returns, so signup never waits on email.
--   2. A trigger wakes auth-email-worker, which sends through Resend's API
--      and retries for about an hour (backoff below).
--   3. auth-email-sweeper (every minute) wakes the worker for retries and
--      deletes rows after 30 days; ai-provider-health checks the queue every
--      10 minutes and alerts the admins.
-- Enable in Supabase: Authentication > Hooks > Send Email > Postgres >
-- public.queue_auth_email.
BEGIN;

CREATE TABLE IF NOT EXISTS public.auth_email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- No foreign key: the hook can run before the new user's row is committed.
  user_id UUID,
  email_action_type TEXT NOT NULL,
  -- { email, new_email, email_data }; token fields are removed once sent.
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 8 CHECK (max_attempts BETWEEN 1 AND 12),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lease_until TIMESTAMPTZ,
  resend_ids TEXT[],
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS auth_email_outbox_due_idx ON public.auth_email_outbox (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS auth_email_outbox_created_idx ON public.auth_email_outbox (created_at);

-- Tokens live here until sent: nobody but the service role reads the table.
ALTER TABLE public.auth_email_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_email_outbox FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.auth_email_outbox TO service_role;

-- Wakes the worker (pg_net sends after the transaction commits).
CREATE OR REPLACE FUNCTION public.kick_auth_email_worker()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_url text := (SELECT value FROM private.service_config WHERE key = 'supabase_url');
  v_key text := (SELECT value FROM private.service_config WHERE key = 'supabase_service_key');
BEGIN
  IF v_url IS NULL OR v_key IS NULL THEN RETURN; END IF;
  PERFORM net.http_post(
    url := v_url || '/functions/v1/auth-email-worker',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
END;
$$;
REVOKE ALL ON FUNCTION public.kick_auth_email_worker() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kick_auth_email_worker() TO service_role;

CREATE OR REPLACE FUNCTION public.auth_email_outbox_kick_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.kick_auth_email_worker();
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS auth_email_outbox_kick ON public.auth_email_outbox;
CREATE TRIGGER auth_email_outbox_kick
  AFTER INSERT ON public.auth_email_outbox
  FOR EACH STATEMENT EXECUTE FUNCTION public.auth_email_outbox_kick_trigger();

-- The Send Email hook. Must stay fast and must not fail: it only stores.
CREATE OR REPLACE FUNCTION public.queue_auth_email(event jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.auth_email_outbox (user_id, email_action_type, payload)
  VALUES (
    NULLIF(event->'user'->>'id', '')::uuid,
    COALESCE(event->'email_data'->>'email_action_type', 'unknown'),
    jsonb_build_object(
      'email', event->'user'->>'email',
      'new_email', event->'user'->>'new_email',
      'email_data', event->'email_data'
    )
  );
  RETURN '{}'::jsonb;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_auth_email(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_auth_email(jsonb) TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.queue_auth_email(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_auth_emails(p_limit INTEGER DEFAULT 20)
RETURNS SETOF public.auth_email_outbox LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- A worker that died mid-send leaves a lease behind; let it be retried.
  UPDATE public.auth_email_outbox
  SET status = 'pending', lease_until = NULL, last_error = COALESCE(last_error, 'Recovered an expired claim')
  WHERE status = 'sending' AND lease_until < now();

  RETURN QUERY
  UPDATE public.auth_email_outbox AS o
  SET status = 'sending', lease_until = now() + interval '2 minutes', attempt_count = o.attempt_count + 1
  WHERE o.id IN (
    SELECT id FROM public.auth_email_outbox
    WHERE status = 'pending' AND next_attempt_at <= now() AND attempt_count < max_attempts
    ORDER BY next_attempt_at, created_at
    LIMIT GREATEST(1, LEAST(p_limit, 50))
    FOR UPDATE SKIP LOCKED
  )
  RETURNING o.*;
END;
$$;

-- Backoff after attempt n: 30s, 1m, 2m, 5m, 10m, 15m, 30m, then failed
-- (8 attempts over about 64 minutes). A permanent error fails at once.
CREATE OR REPLACE FUNCTION public.complete_auth_email(
  p_id UUID, p_ok BOOLEAN, p_resend_ids TEXT[] DEFAULT NULL, p_error TEXT DEFAULT NULL, p_permanent BOOLEAN DEFAULT false
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_attempt INTEGER; v_max INTEGER;
BEGIN
  SELECT attempt_count, max_attempts INTO v_attempt, v_max FROM public.auth_email_outbox WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF p_ok THEN
    UPDATE public.auth_email_outbox
    SET status = 'sent', sent_at = now(), lease_until = NULL, last_error = NULL, resend_ids = p_resend_ids,
        -- Keep who and what for the record, drop the tokens.
        payload = jsonb_build_object('email', payload->>'email', 'new_email', payload->>'new_email',
          'email_data', jsonb_build_object('email_action_type', payload->'email_data'->>'email_action_type'))
    WHERE id = p_id;
    RETURN;
  END IF;

  UPDATE public.auth_email_outbox
  SET status = CASE WHEN p_permanent OR v_attempt >= v_max THEN 'failed' ELSE 'pending' END,
      lease_until = NULL,
      last_error = left(COALESCE(p_error, 'Unknown error'), 500),
      resend_ids = COALESCE(p_resend_ids, resend_ids),
      next_attempt_at = now() + CASE v_attempt
        WHEN 1 THEN interval '30 seconds'
        WHEN 2 THEN interval '1 minute'
        WHEN 3 THEN interval '2 minutes'
        WHEN 4 THEN interval '5 minutes'
        WHEN 5 THEN interval '10 minutes'
        WHEN 6 THEN interval '15 minutes'
        ELSE interval '30 minutes'
      END
  WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sweep_auth_email_outbox()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.auth_email_outbox WHERE created_at < now() - interval '30 days';
  IF EXISTS (
    SELECT 1 FROM public.auth_email_outbox
    WHERE (status = 'pending' AND next_attempt_at <= now() AND attempt_count < max_attempts)
       OR (status = 'sending' AND lease_until < now())
  ) THEN
    PERFORM public.kick_auth_email_worker();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_auth_emails(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_auth_email(UUID, BOOLEAN, TEXT[], TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sweep_auth_email_outbox() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auth_email_outbox_kick_trigger() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_auth_emails(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_auth_email(UUID, BOOLEAN, TEXT[], TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.sweep_auth_email_outbox() TO service_role;

-- cron.schedule with a job name updates the job if it already exists.
SELECT cron.schedule('auth-email-sweeper', '* * * * *', 'SELECT public.sweep_auth_email_outbox()');
-- The auth email health check, every 10 minutes instead of hourly (job name kept).
SELECT cron.schedule('ai-provider-health-auth-email-hourly', '*/10 * * * *',
  'SELECT public.dispatch_auth_email_health_check()');

COMMIT;
