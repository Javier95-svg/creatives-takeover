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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'send-weekly-scorecards-hourly'
  ) THEN
    PERFORM cron.unschedule('send-weekly-scorecards-hourly');
  END IF;
END;
$$;

SELECT cron.schedule(
  'send-weekly-scorecards-hourly',
  '0 * * * *',
  $$SELECT public.trigger_send_weekly_scorecards();$$
);
