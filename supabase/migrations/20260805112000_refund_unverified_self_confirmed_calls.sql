-- The legacy founder confirmation treated an external-calendar open as proof of
-- booking. Refund every charged self-confirmed record that lacks provider proof.
WITH candidates AS (
  SELECT *
  FROM public.discovery_calls
  WHERE status = 'scheduled'
    AND credits_charged = true
    AND credits_refunded = false
    AND credit_charge_amount > 0
    AND provider_event_id IS NULL
    AND provider_invitee_id IS NULL
    AND (provider_name = 'self_confirmed' OR metadata ->> 'selfConfirmed' = 'true')
  FOR UPDATE
), restored AS (
  UPDATE public.user_credits uc
  SET monthly_quota = uc.monthly_quota + c.used_from_quota,
      balance = uc.balance + c.used_from_balance,
      updated_at = now()
  FROM candidates c
  WHERE uc.user_id = c.founder_id
  RETURNING c.id
), transactions AS (
  INSERT INTO public.credit_transactions (
    user_id, amount, tx_type, reason, feature, session_id, metadata
  )
  SELECT
    c.founder_id,
    c.credit_charge_amount,
    'refund',
    'Revenue P0 refund: self-confirmed call had no provider booking evidence',
    'Discovery Call',
    c.id,
    jsonb_build_object(
      'discoveryCallId', c.id,
      'restoredToQuota', c.used_from_quota,
      'restoredToBalance', c.used_from_balance,
      'refundReason', 'unverified_self_confirmation'
    )
  FROM candidates c
  RETURNING session_id
), updated_calls AS (
  UPDATE public.discovery_calls dc
  SET status = 'expired',
      counted_in_cycle = false,
      count_released_at = now(),
      credits_refunded = true,
      credits_refunded_at = now(),
      cancelled_at = now(),
      cancelled_reason = 'Unverified self-confirmed booking',
      updated_at = now(),
      metadata = COALESCE(dc.metadata, '{}'::jsonb) || jsonb_build_object(
        'revenueP0RefundedAt', now(),
        'successfulBooking', false
      )
  FROM candidates c
  WHERE dc.id = c.id
  RETURNING dc.id
)
INSERT INTO public.discovery_call_events (discovery_call_id, event_type, actor_user_id, payload)
SELECT id, 'expired', NULL, jsonb_build_object(
  'reason', 'unverified_self_confirmation',
  'refundedCredits', true,
  'successfulBooking', false
)
FROM updated_calls;

-- Release legacy cycle counters without allowing negative counts.
UPDATE public.discovery_call_cycle_counters counter
SET included_calls_booked = GREATEST(0, counter.included_calls_booked - released.included_count),
    overage_calls_booked = GREATEST(0, counter.overage_calls_booked - released.overage_count),
    updated_at = now()
FROM (
  SELECT founder_id, billing_period_start,
    count(*) FILTER (WHERE consumption_mode IN ('included', 'unlimited'))::integer AS included_count,
    count(*) FILTER (WHERE consumption_mode = 'overage')::integer AS overage_count
  FROM public.discovery_calls
  WHERE metadata ? 'revenueP0RefundedAt'
    AND billing_period_start IS NOT NULL
  GROUP BY founder_id, billing_period_start
) released
WHERE counter.user_id = released.founder_id
  AND counter.billing_period_start = released.billing_period_start;
