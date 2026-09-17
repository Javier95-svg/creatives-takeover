-- Both email outboxes dispatch through net.http_post and rely on the edge
-- function to write the outcome back. When the request never reaches the
-- function body, nothing writes anything: the row sits in 'sending' with
-- last_error null, forever, and the requeue worker retries it silently.
--
-- That is how connection request emails went 26 for 26 with zero delivered and
-- no visible symptom. Every dispatch was returning HTTP 401, but the only place
-- that showed was net._http_response, which nobody reads.
--
-- This closes the loop: any dispatched row whose HTTP response has arrived and
-- is not 2xx gets marked failed with the status code and body. Marking it failed
-- also makes it eligible for the existing requeue workers, so the retry keeps
-- working and now carries a reason.
--
-- Rows whose response has already been purged by pg_net are marked failed too,
-- but only after an hour, so a dispatch still in flight is never touched.

CREATE OR REPLACE FUNCTION public.reconcile_email_outbox_dispatches(p_limit integer DEFAULT 200)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_limit integer := GREATEST(1, LEAST(COALESCE(p_limit, 200), 1000));
  v_connection integer := 0;
  v_dm integer := 0;
BEGIN
  WITH stale AS (
    SELECT q.id,
           CASE
             WHEN r.id IS NULL THEN 'No HTTP response recorded within an hour of dispatch'
             ELSE 'HTTP ' || r.status_code || ': ' || COALESCE(left(r.content, 300), COALESCE(r.error_msg, ''))
           END AS reason
    FROM public.connection_request_email_notifications q
    LEFT JOIN net._http_response r ON r.id = q.net_request_id
    WHERE q.status = 'sending'
      AND q.net_request_id IS NOT NULL
      AND (
        (r.id IS NOT NULL AND (r.status_code IS NULL OR r.status_code < 200 OR r.status_code > 299))
        OR (r.id IS NULL AND q.updated_at < now() - interval '1 hour')
      )
    ORDER BY q.updated_at ASC
    LIMIT v_limit
  )
  UPDATE public.connection_request_email_notifications q
  SET status = 'failed', last_error = stale.reason
  FROM stale
  WHERE q.id = stale.id;
  GET DIAGNOSTICS v_connection = ROW_COUNT;

  WITH stale AS (
    SELECT q.id,
           CASE
             WHEN r.id IS NULL THEN 'No HTTP response recorded within an hour of dispatch'
             ELSE 'HTTP ' || r.status_code || ': ' || COALESCE(left(r.content, 300), COALESCE(r.error_msg, ''))
           END AS reason
    FROM public.message_email_notifications q
    LEFT JOIN net._http_response r ON r.id = q.net_request_id
    WHERE q.status = 'sending'
      AND q.net_request_id IS NOT NULL
      AND (
        (r.id IS NOT NULL AND (r.status_code IS NULL OR r.status_code < 200 OR r.status_code > 299))
        OR (r.id IS NULL AND q.updated_at < now() - interval '1 hour')
      )
    ORDER BY q.updated_at ASC
    LIMIT v_limit
  )
  UPDATE public.message_email_notifications q
  SET status = 'failed', last_error = stale.reason
  FROM stale
  WHERE q.id = stale.id;
  GET DIAGNOSTICS v_dm = ROW_COUNT;

  RETURN jsonb_build_object('connectionRequests', v_connection, 'directMessages', v_dm);
END;
$function$;

REVOKE ALL ON FUNCTION public.reconcile_email_outbox_dispatches(integer) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.reconcile_email_outbox_dispatches(integer) IS
  'Marks dispatched outbox rows failed when their HTTP response was not 2xx, or never arrived, so a delivery failure records a reason instead of sitting silently in sending.';

-- Runs between requeue passes so a failure is visible before the next retry.
SELECT cron.unschedule('reconcile-email-outbox')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reconcile-email-outbox');

SELECT cron.schedule(
  'reconcile-email-outbox',
  '*/5 * * * *',
  $$SELECT public.reconcile_email_outbox_dispatches();$$
);
