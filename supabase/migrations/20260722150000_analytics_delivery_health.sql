-- Durable, low-cardinality health telemetry for server-side analytics delivery.
-- One row per event/destination/hour avoids retaining user identifiers or event
-- payloads while still making outages, disabled destinations, and error rates
-- visible from the Supabase dashboard.

CREATE TABLE IF NOT EXISTS public.analytics_delivery_health_hourly (
  bucket_start timestamptz NOT NULL,
  destination text NOT NULL CHECK (destination IN ('posthog', 'amplitude')),
  event_name text NOT NULL CHECK (event_name ~ '^\$?[a-z][a-z0-9_]{0,119}$'),
  attempted_count bigint NOT NULL DEFAULT 0 CHECK (attempted_count >= 0),
  succeeded_count bigint NOT NULL DEFAULT 0 CHECK (succeeded_count >= 0),
  failed_count bigint NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  skipped_count bigint NOT NULL DEFAULT 0 CHECK (skipped_count >= 0),
  last_status_code integer,
  last_error_code text CHECK (last_error_code IS NULL OR length(last_error_code) <= 100),
  last_attempted_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket_start, destination, event_name),
  CHECK (attempted_count = succeeded_count + failed_count + skipped_count)
);

CREATE INDEX IF NOT EXISTS analytics_delivery_health_recent_idx
  ON public.analytics_delivery_health_hourly(destination, bucket_start DESC);

ALTER TABLE public.analytics_delivery_health_hourly ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.analytics_delivery_health_hourly FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.analytics_delivery_health_hourly TO service_role;

CREATE OR REPLACE FUNCTION public.record_analytics_delivery_health(
  p_event_name text,
  p_results jsonb,
  p_occurred_at timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delivery jsonb;
  normalized_destination text;
  normalized_status text;
  normalized_status_code integer;
  normalized_error_code text;
  normalized_bucket timestamptz := date_trunc('hour', COALESCE(p_occurred_at, now()));
BEGIN
  IF p_event_name IS NULL OR p_event_name !~ '^\$?[a-z][a-z0-9_]{0,119}$' THEN
    RAISE EXCEPTION 'Invalid analytics event name';
  END IF;

  IF jsonb_typeof(COALESCE(p_results, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Analytics delivery results must be an array';
  END IF;

  FOR delivery IN SELECT value FROM jsonb_array_elements(COALESCE(p_results, '[]'::jsonb))
  LOOP
    normalized_destination := lower(COALESCE(delivery->>'destination', ''));
    normalized_status := lower(COALESCE(delivery->>'status', ''));

    IF normalized_destination NOT IN ('posthog', 'amplitude')
      OR normalized_status NOT IN ('sent', 'failed', 'skipped') THEN
      CONTINUE;
    END IF;

    normalized_status_code := CASE
      WHEN COALESCE(delivery->>'status_code', '') ~ '^[0-9]{3}$'
        THEN (delivery->>'status_code')::integer
      ELSE NULL
    END;
    normalized_error_code := NULLIF(
      left(regexp_replace(COALESCE(delivery->>'error_code', ''), '[^a-zA-Z0-9_.:-]', '', 'g'), 100),
      ''
    );

    INSERT INTO public.analytics_delivery_health_hourly (
      bucket_start,
      destination,
      event_name,
      attempted_count,
      succeeded_count,
      failed_count,
      skipped_count,
      last_status_code,
      last_error_code,
      last_attempted_at
    ) VALUES (
      normalized_bucket,
      normalized_destination,
      p_event_name,
      1,
      CASE WHEN normalized_status = 'sent' THEN 1 ELSE 0 END,
      CASE WHEN normalized_status = 'failed' THEN 1 ELSE 0 END,
      CASE WHEN normalized_status = 'skipped' THEN 1 ELSE 0 END,
      normalized_status_code,
      normalized_error_code,
      COALESCE(p_occurred_at, now())
    )
    ON CONFLICT (bucket_start, destination, event_name) DO UPDATE SET
      attempted_count = analytics_delivery_health_hourly.attempted_count + 1,
      succeeded_count = analytics_delivery_health_hourly.succeeded_count
        + CASE WHEN normalized_status = 'sent' THEN 1 ELSE 0 END,
      failed_count = analytics_delivery_health_hourly.failed_count
        + CASE WHEN normalized_status = 'failed' THEN 1 ELSE 0 END,
      skipped_count = analytics_delivery_health_hourly.skipped_count
        + CASE WHEN normalized_status = 'skipped' THEN 1 ELSE 0 END,
      last_status_code = EXCLUDED.last_status_code,
      last_error_code = EXCLUDED.last_error_code,
      last_attempted_at = GREATEST(
        analytics_delivery_health_hourly.last_attempted_at,
        EXCLUDED.last_attempted_at
      ),
      updated_at = now();
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.record_analytics_delivery_health(text, jsonb, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_analytics_delivery_health(text, jsonb, timestamptz) TO service_role;

CREATE OR REPLACE VIEW public.analytics_delivery_health_24h
WITH (security_invoker = true)
AS
SELECT
  destination,
  event_name,
  sum(attempted_count)::bigint AS attempted_count,
  sum(succeeded_count)::bigint AS succeeded_count,
  sum(failed_count)::bigint AS failed_count,
  sum(skipped_count)::bigint AS skipped_count,
  round(
    100.0 * sum(failed_count) / NULLIF(sum(succeeded_count + failed_count), 0),
    2
  ) AS failure_rate_percent,
  max(last_attempted_at) AS last_attempted_at,
  (array_agg(last_status_code ORDER BY last_attempted_at DESC))[1] AS last_status_code,
  (array_agg(last_error_code ORDER BY last_attempted_at DESC))[1] AS last_error_code,
  CASE
    WHEN sum(succeeded_count) = 0 AND sum(failed_count) > 0 THEN 'critical'
    WHEN sum(failed_count) * 20 >= NULLIF(sum(succeeded_count + failed_count), 0) THEN 'warning'
    WHEN sum(succeeded_count) = 0 AND sum(skipped_count) > 0 THEN 'disabled'
    ELSE 'healthy'
  END AS health_status
FROM public.analytics_delivery_health_hourly
WHERE bucket_start >= date_trunc('hour', now() - interval '24 hours')
GROUP BY destination, event_name;

REVOKE ALL ON TABLE public.analytics_delivery_health_24h FROM anon, authenticated;
GRANT SELECT ON TABLE public.analytics_delivery_health_24h TO service_role;

COMMENT ON TABLE public.analytics_delivery_health_hourly IS
  'Hourly PII-free rollups of server analytics delivery outcomes by destination and event.';
COMMENT ON VIEW public.analytics_delivery_health_24h IS
  'Service-role-only 24-hour analytics delivery monitor; critical/disabled/warning rows require attention.';
