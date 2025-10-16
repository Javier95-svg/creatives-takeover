-- Setup pg_cron for nightly memory summarization
-- This will run at 2 AM daily to summarize conversations older than 7 days

-- First, enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to trigger the memory-manager edge function
CREATE OR REPLACE FUNCTION public.trigger_memory_summarization()
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
  -- Get Supabase URL from environment (you'll need to set this)
  supabase_url := current_setting('app.settings.supabase_url', true);
  supabase_key := current_setting('app.settings.supabase_service_key', true);
  
  -- Make HTTP request to memory-manager edge function
  -- This uses pg_net extension for async HTTP requests
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/memory-manager?action=summarize',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || supabase_key
    ),
    body := jsonb_build_object(
      'daysOld', 7
    )
  ) INTO http_request_id;
  
  RAISE LOG 'Memory summarization triggered with request ID: %', http_request_id;
END;
$$;

-- Schedule the cron job to run daily at 2 AM
-- Syntax: minute hour day month weekday
SELECT cron.schedule(
  'nightly-memory-summarization',
  '0 2 * * *',  -- Every day at 2:00 AM
  $$SELECT public.trigger_memory_summarization();$$
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.trigger_memory_summarization() TO postgres;
GRANT USAGE ON SCHEMA cron TO postgres;