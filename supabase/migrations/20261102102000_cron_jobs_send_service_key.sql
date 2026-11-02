-- Scheduled jobs call their edge functions as our own server (2026-11-02).
--
-- These cron jobs called edge functions with no credentials, the public anon
-- key, an unset setting (app.service_role_key) or a service-role key pasted into
-- the job text. The functions now refuse anyone but our own server, so every job
-- sends the service key kept in private.service_config, as
-- process-return-cues-every-15-minutes already does.
--
-- Run before deploying rss-article-fetcher, trends-analyzer,
-- task-reminder-service, churn-reactivation-service and
-- demo-studio-webhook-retry with their new guards (see
-- docs/security/security-hardening-2026-11.md).

DO $$
DECLARE
  r record;
  v_jobid bigint;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('fetch-rss-articles-every-2-hours', 'rss-article-fetcher', 'jsonb_build_object(''time'', now())'),
      ('analyze-trends-every-4-hours', 'trends-analyzer', 'jsonb_build_object(''time'', now())'),
      ('task-reminder-every-3-hours', 'task-reminder-service', 'jsonb_build_object(''time'', now())'),
      ('churn-reactivation-weekly', 'churn-reactivation-service', '''{}''::jsonb'),
      ('demo-studio-webhook-retry-5min', 'demo-studio-webhook-retry', 'jsonb_build_object(''time'', now())'),
      ('email-sequence-daily', 'email-sequences', '''{"mode": "cron"}''::jsonb')
    ) AS jobs(jobname, fn, body_sql)
  LOOP
    SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = r.jobname;
    IF v_jobid IS NULL THEN
      RAISE NOTICE 'cron job % not found, skipped', r.jobname;
      CONTINUE;
    END IF;

    PERFORM cron.alter_job(
      v_jobid,
      command := format(
        $cmd$SELECT net.http_post(
  url := (SELECT value FROM private.service_config WHERE key = 'supabase_url') || %L,
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT value FROM private.service_config WHERE key = 'supabase_service_key')
  ),
  body := %s
);$cmd$,
        '/functions/v1/' || r.fn,
        r.body_sql
      )
    );
  END LOOP;
END $$;

-- Check: no job should still carry a pasted JWT or call a function without a key.
-- SELECT jobname FROM cron.job
-- WHERE command ILIKE '%functions/v1/%'
--   AND (command ~ 'eyJ[A-Za-z0-9_-]{10,}' OR command NOT ILIKE '%Authorization%' AND command NOT ILIKE '%x-cron-secret%');
