CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

UPDATE public.profiles
SET last_seen_at = COALESCE(last_seen_at, last_activity_at, last_active_at, updated_at)
WHERE last_seen_at IS NULL;

CREATE OR REPLACE FUNCTION public.sync_profiles_last_seen_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.last_seen_at := COALESCE(NEW.last_seen_at, NEW.last_activity_at, NEW.last_active_at, NEW.updated_at, now());
  ELSIF NEW.last_activity_at IS DISTINCT FROM OLD.last_activity_at THEN
    NEW.last_seen_at := COALESCE(NEW.last_activity_at, NEW.last_seen_at, OLD.last_seen_at);
  ELSIF NEW.last_active_at IS DISTINCT FROM OLD.last_active_at THEN
    NEW.last_seen_at := COALESCE(NEW.last_active_at, NEW.last_seen_at, OLD.last_seen_at);
  ELSIF NEW.last_seen_at IS NULL THEN
    NEW.last_seen_at := COALESCE(OLD.last_seen_at, NEW.last_activity_at, NEW.last_active_at, NEW.updated_at);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profiles_last_seen_at ON public.profiles;
CREATE TRIGGER sync_profiles_last_seen_at
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profiles_last_seen_at();

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at
  ON public.profiles (last_seen_at DESC);

CREATE TABLE IF NOT EXISTS public.re_engagement_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stage_at_send public.bizmap_stage NOT NULL,
  opened BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_re_engagement_emails_user_sent_at
  ON public.re_engagement_emails (user_id, sent_at DESC);

ALTER TABLE public.re_engagement_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own re_engagement_emails" ON public.re_engagement_emails;
CREATE POLICY "Users can view own re_engagement_emails"
  ON public.re_engagement_emails
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert re_engagement_emails" ON public.re_engagement_emails;
CREATE POLICY "Service role can insert re_engagement_emails"
  ON public.re_engagement_emails
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can update re_engagement_emails" ON public.re_engagement_emails;
CREATE POLICY "Service role can update re_engagement_emails"
  ON public.re_engagement_emails
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.trigger_check_inactive_users()
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
    url := supabase_url || '/functions/v1/check-inactive-users',
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

  RAISE LOG 'check-inactive-users triggered with request ID: %', http_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.trigger_check_inactive_users() TO postgres;
GRANT USAGE ON SCHEMA cron TO postgres;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'check-inactive-users-daily'
  ) THEN
    PERFORM cron.unschedule('check-inactive-users-daily');
  END IF;
END;
$$;

SELECT cron.schedule(
  'check-inactive-users-daily',
  '0 10 * * *',
  $$SELECT public.trigger_check_inactive_users();$$
);
