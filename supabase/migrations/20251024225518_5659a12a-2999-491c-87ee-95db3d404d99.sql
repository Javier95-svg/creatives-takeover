-- Enable pg_cron and pg_net extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule RSS article fetcher to run every 2 hours
SELECT cron.schedule(
  'fetch-rss-articles-every-2-hours',
  '0 */2 * * *', -- Every 2 hours at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/rss-article-fetcher',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Schedule trends analyzer to run every 4 hours (offset by 1 hour from RSS)
SELECT cron.schedule(
  'analyze-trends-every-4-hours',
  '0 1,5,9,13,17,21 * * *', -- Every 4 hours at minute 0, starting at 1am
  $$
  SELECT
    net.http_post(
        url:='https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/trends-analyzer',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Schedule cleanup of expired articles daily at 3am
SELECT cron.schedule(
  'cleanup-expired-articles-daily',
  '0 3 * * *', -- Daily at 3am
  $$
  UPDATE trends 
  SET is_active = false 
  WHERE expires_at < now() AND is_active = true;
  $$
);