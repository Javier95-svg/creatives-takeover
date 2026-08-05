WITH expired_calls AS (
  UPDATE public.discovery_calls
  SET status = 'expired',
      updated_at = now(),
      metadata = jsonb_strip_nulls(
        COALESCE(metadata, '{}'::jsonb)
        || jsonb_build_object('expiredAutomaticallyAt', now(), 'expirationReason', 'intent_unconfirmed_after_24_hours')
      )
  WHERE status = 'intent_created'
    AND created_at < now() - interval '24 hours'
  RETURNING id
)
INSERT INTO public.discovery_call_events (discovery_call_id, event_type, actor_user_id, payload)
SELECT id, 'expired', NULL, jsonb_build_object(
  'reason', 'intent_unconfirmed_after_24_hours',
  'successfulBooking', false
)
FROM expired_calls;
