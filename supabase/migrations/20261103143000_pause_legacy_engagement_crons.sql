-- Pause generic campaigns at the scheduler as well as at their senders.
BEGIN;
DO $$
DECLARE v_job text;
BEGIN
  FOREACH v_job IN ARRAY ARRAY[
    'email-sequence-daily',
    'churn-reactivation-weekly',
    'process-demo-try-drip-daily',
    'process-icp-sprint-emails-daily'
  ] LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname=v_job) THEN
      PERFORM cron.unschedule(v_job);
    END IF;
  END LOOP;
END;
$$;
COMMIT;
