
-- Enable required extensions (safe to run multiple times)
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Remove any existing job with the same name (idempotent)
select cron.unschedule('refresh-trends-hourly');

-- Schedule hourly refresh (top of the hour)
select
  cron.schedule(
    'refresh-trends-hourly',
    '0 * * * *',
    $$
    select
      net.http_post(
        url:='https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/trends-analyzer',
        headers:='{
          "Content-Type": "application/json",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjamxheWJqbm96cWJzb3h6Ym9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDM4MzQsImV4cCI6MjA3MTExOTgzNH0.mDo9bIJKgEYqEKkVzHawTw9eefIq3BzrywmwztBhzng"
        }'::jsonb,
        body:='{"action":"find_articles","source":"cron"}'::jsonb
      ) as request_id;
    $$
  );
