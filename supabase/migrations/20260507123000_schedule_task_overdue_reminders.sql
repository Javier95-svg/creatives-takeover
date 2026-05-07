CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'task-overdue-reminders-hourly'
  ) THEN
    PERFORM cron.unschedule('task-overdue-reminders-hourly');
  END IF;
END;
$$;

SELECT cron.schedule(
  'task-overdue-reminders-hourly',
  '0 * * * *',
  $$SELECT public.process_task_overdue_reminders(NULL);$$
);
