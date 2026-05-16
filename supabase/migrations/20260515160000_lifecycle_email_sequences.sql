-- Full lifecycle email sequence support.
-- Adds tracking fields for retention emails and prepares daily cron scheduling.

ALTER TABLE public.retention_email_log
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS unsubscribed boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS retention_email_log_resend_id_idx
  ON public.retention_email_log (resend_id)
  WHERE resend_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS retention_email_log_unsubscribed_user_idx
  ON public.retention_email_log (user_id, unsubscribed)
  WHERE unsubscribed = true;

CREATE INDEX IF NOT EXISTS retention_email_log_sequence_user_idx
  ON public.retention_email_log (sequence, user_id, sent_at);

COMMENT ON COLUMN public.retention_email_log.opened_at IS
  'First known Resend open timestamp for this lifecycle email.';

COMMENT ON COLUMN public.retention_email_log.clicked_at IS
  'First known Resend click timestamp for this lifecycle email.';

COMMENT ON COLUMN public.retention_email_log.unsubscribed IS
  'When true for any row belonging to a user, lifecycle email sends are suppressed for that user.';

-- Optional production cron setup.
-- Run this manually in Supabase SQL Editor after replacing <SERVICE_ROLE_KEY>.
-- The service role key must never be committed to the repo.
--
-- CREATE EXTENSION IF NOT EXISTS pg_net;
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- SELECT cron.unschedule('email-sequence-daily')
-- WHERE EXISTS (
--   SELECT 1 FROM cron.job WHERE jobname = 'email-sequence-daily'
-- );
--
-- SELECT cron.schedule(
--   'email-sequence-daily',
--   '0 9 * * *',
--   $$
--     SELECT net.http_post(
--       url := 'https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/email-sequences',
--       headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
--       body := '{"mode": "cron"}'::jsonb
--     );
--   $$
-- );
