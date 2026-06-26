-- Retry failed Demo Studio webhook deliveries every 5 minutes via the
-- demo-studio-webhook-retry edge function (exponential backoff, gives up at max_attempts).
-- cron.schedule is idempotent by job name. Mirrors the existing pg_cron/pg_net pattern
-- (e.g. 20251024225518). Optional CRON_SECRET guard is not sent here (function allows it
-- when the env var is unset), consistent with the project's other cron-invoked functions.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'demo-studio-webhook-retry-5min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url:='https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/demo-studio-webhook-retry',
    headers:='{"Content-Type": "application/json"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);
