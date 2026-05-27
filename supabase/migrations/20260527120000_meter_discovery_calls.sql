-- Make Discovery Calls credit-metered for every plan.
-- Users can open unlimited confirmed bookings as long as they have 10 credits.

CREATE OR REPLACE FUNCTION public.get_discovery_call_policy(p_plan TEXT)
RETURNS TABLE(
  normalized_plan TEXT,
  included_limit INTEGER,
  upgrade_target TEXT,
  overage_credit_cost INTEGER,
  has_unlimited BOOLEAN
)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    public.normalize_subscription_tier(p_plan) AS normalized_plan,
    NULL::INTEGER AS included_limit,
    NULL::TEXT AS upgrade_target,
    10 AS overage_credit_cost,
    true AS has_unlimited;
$$;

CREATE OR REPLACE FUNCTION public.get_discovery_call_quota_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period RECORD;
  v_policy RECORD;
  v_counter RECORD;
  v_total_credits INTEGER := 0;
  v_used_calls INTEGER := 0;
BEGIN
  SELECT *
  INTO v_period
  FROM public.get_user_billing_period(p_user_id);

  SELECT *
  INTO v_policy
  FROM public.get_discovery_call_policy(v_period.subscription_tier);

  SELECT *
  INTO v_counter
  FROM public.discovery_call_cycle_counters
  WHERE user_id = p_user_id
    AND billing_period_start = v_period.period_start_date;

  SELECT COALESCE(balance, 0) + COALESCE(monthly_quota, 0)
  INTO v_total_credits
  FROM public.user_credits
  WHERE user_id = p_user_id;

  v_used_calls := COALESCE(v_counter.included_calls_booked, 0) + COALESCE(v_counter.overage_calls_booked, 0);

  RETURN jsonb_build_object(
    'success', true,
    'plan', v_policy.normalized_plan,
    'billingPeriodStart', v_period.period_start_date,
    'billingPeriodEnd', v_period.period_end,
    'includedLimit', v_policy.included_limit,
    'upgradeTarget', v_policy.upgrade_target,
    'overageCreditCost', v_policy.overage_credit_cost,
    'hasUnlimited', v_policy.has_unlimited,
    'includedCallsBooked', COALESCE(v_counter.included_calls_booked, 0),
    'overageCallsBooked', COALESCE(v_counter.overage_calls_booked, 0),
    'usedCalls', v_used_calls,
    'remainingIncluded', NULL,
    'requiresCredits', true,
    'canBookNow', COALESCE(v_total_credits, 0) >= COALESCE(v_policy.overage_credit_cost, 10),
    'totalCreditsAvailable', COALESCE(v_total_credits, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_discovery_call_intent(
  p_founder_id UUID,
  p_mentor_id UUID,
  p_source TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
  v_mentor RECORD;
  v_call RECORD;
  v_quota_status JSONB;
BEGIN
  IF p_founder_id IS NULL OR p_mentor_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'errorCode', 'INVALID_REQUEST',
      'error', 'Founder and mentor are required.'
    );
  END IF;

  IF NULLIF(TRIM(COALESCE(p_idempotency_key, '')), '') IS NOT NULL THEN
    SELECT *
    INTO v_existing
    FROM public.discovery_calls
    WHERE founder_id = p_founder_id
      AND idempotency_key = NULLIF(TRIM(p_idempotency_key), '')
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'callId', v_existing.id,
        'status', v_existing.status,
        'providerBookingUrl', v_existing.provider_booking_url
      );
    END IF;
  END IF;

  SELECT id, name, calendly_url, is_active
  INTO v_mentor
  FROM public.mentors
  WHERE id = p_mentor_id;

  IF NOT FOUND OR COALESCE(v_mentor.is_active, false) = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'errorCode', 'MENTOR_UNAVAILABLE',
      'error', 'This mentor is not currently available for discovery calls.'
    );
  END IF;

  IF NULLIF(TRIM(COALESCE(v_mentor.calendly_url, '')), '') IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'errorCode', 'MENTOR_UNAVAILABLE',
      'error', 'This mentor does not have a booking link configured yet.'
    );
  END IF;

  v_quota_status := public.get_discovery_call_quota_status(p_founder_id);

  IF COALESCE((v_quota_status ->> 'canBookNow')::BOOLEAN, false) = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'errorCode', 'INSUFFICIENT_CREDITS',
      'error', format('You need %s credits to book a discovery call.', COALESCE(v_quota_status ->> 'overageCreditCost', '10')),
      'requiredCredits', COALESCE((v_quota_status ->> 'overageCreditCost')::INTEGER, 10),
      'quotaStatus', v_quota_status
    );
  END IF;

  INSERT INTO public.discovery_calls (
    founder_id,
    mentor_id,
    mentor_name_snapshot,
    provider_name,
    provider_booking_url,
    status,
    booking_source,
    idempotency_key,
    metadata
  ) VALUES (
    p_founder_id,
    p_mentor_id,
    v_mentor.name,
    'calendly',
    v_mentor.calendly_url,
    'intent_created',
    NULLIF(TRIM(COALESCE(p_source, '')), ''),
    NULLIF(TRIM(COALESCE(p_idempotency_key, '')), ''),
    jsonb_strip_nulls(COALESCE(p_metadata, '{}'::jsonb))
  )
  RETURNING * INTO v_call;

  PERFORM public.log_discovery_call_event(
    v_call.id,
    'intent_created',
    p_founder_id,
    jsonb_build_object(
      'source', NULLIF(TRIM(COALESCE(p_source, '')), ''),
      'mentorId', p_mentor_id,
      'requiredCredits', COALESCE((v_quota_status ->> 'overageCreditCost')::INTEGER, 10)
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'callId', v_call.id,
    'status', v_call.status,
    'providerBookingUrl', v_call.provider_booking_url,
    'quotaStatus', v_quota_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_discovery_call_booking(
  p_call_id UUID,
  p_scheduled_for TIMESTAMPTZ,
  p_duration_minutes INTEGER DEFAULT 30,
  p_provider_name TEXT DEFAULT 'calendly',
  p_provider_event_id TEXT DEFAULT NULL,
  p_provider_invitee_id TEXT DEFAULT NULL,
  p_meeting_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_call RECORD;
  v_period RECORD;
  v_policy RECORD;
  v_deduction JSONB;
  v_charge_amount INTEGER := 10;
  v_consumption_mode TEXT := 'overage';
BEGIN
  IF p_call_id IS NULL OR p_scheduled_for IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'errorCode', 'INVALID_REQUEST',
      'error', 'Call ID and scheduled time are required.'
    );
  END IF;

  IF p_duration_minutes IS NULL OR p_duration_minutes <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'errorCode', 'INVALID_REQUEST',
      'error', 'Duration must be greater than zero.'
    );
  END IF;

  SELECT *
  INTO v_call
  FROM public.discovery_calls
  WHERE id = p_call_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'errorCode', 'NOT_FOUND',
      'error', 'Discovery call not found.'
    );
  END IF;

  IF v_call.status = 'scheduled' THEN
    RETURN jsonb_build_object(
      'success', true,
      'callId', v_call.id,
      'status', v_call.status,
      'scheduledFor', v_call.scheduled_for,
      'chargedCredits', COALESCE(v_call.credit_charge_amount, 0)
    );
  END IF;

  IF v_call.status <> 'intent_created' THEN
    RETURN jsonb_build_object(
      'success', false,
      'errorCode', 'INVALID_STATE',
      'error', format('Discovery call is already in status %s.', v_call.status)
    );
  END IF;

  SELECT *
  INTO v_period
  FROM public.get_user_billing_period(v_call.founder_id, p_scheduled_for);

  SELECT *
  INTO v_policy
  FROM public.get_discovery_call_policy(v_period.subscription_tier);

  v_charge_amount := COALESCE(v_policy.overage_credit_cost, 10);

  INSERT INTO public.discovery_call_cycle_counters (
    user_id,
    billing_period_start,
    billing_period_end,
    subscription_tier_snapshot
  ) VALUES (
    v_call.founder_id,
    v_period.period_start_date,
    v_period.period_end,
    v_policy.normalized_plan
  )
  ON CONFLICT (user_id, billing_period_start) DO NOTHING;

  v_deduction := public.deduct_credits_atomic(
    v_call.founder_id,
    v_charge_amount,
    'Discovery Call',
    p_call_id::TEXT,
    jsonb_build_object(
      'idempotencyKey', format('discovery-call-finalize:%s', p_call_id),
      'discoveryCallId', p_call_id,
      'bookingStage', 'scheduled',
      'creditCost', v_charge_amount,
      'credit_cost', v_charge_amount
    )
  );

  IF COALESCE((v_deduction ->> 'success')::BOOLEAN, false) = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'errorCode', COALESCE(v_deduction ->> 'errorCode', 'INSUFFICIENT_CREDITS'),
      'error', COALESCE(v_deduction ->> 'error', 'Unable to deduct credits for this discovery call.'),
      'requiredCredits', v_charge_amount
    );
  END IF;

  UPDATE public.discovery_call_cycle_counters
  SET overage_calls_booked = overage_calls_booked + 1,
      billing_period_end = v_period.period_end,
      subscription_tier_snapshot = v_policy.normalized_plan,
      updated_at = now()
  WHERE user_id = v_call.founder_id
    AND billing_period_start = v_period.period_start_date;

  PERFORM public.sync_discovery_call_usage_legacy(v_call.founder_id, v_period.period_start_date, 1);

  UPDATE public.discovery_calls
  SET status = 'scheduled',
      scheduled_for = p_scheduled_for,
      duration_minutes = p_duration_minutes,
      provider_name = COALESCE(NULLIF(TRIM(COALESCE(p_provider_name, '')), ''), provider_name),
      provider_event_id = COALESCE(NULLIF(TRIM(COALESCE(p_provider_event_id, '')), ''), provider_event_id),
      provider_invitee_id = COALESCE(NULLIF(TRIM(COALESCE(p_provider_invitee_id, '')), ''), provider_invitee_id),
      meeting_url = COALESCE(NULLIF(TRIM(COALESCE(p_meeting_url, '')), ''), meeting_url),
      billing_period_start = v_period.period_start_date,
      billing_period_end = v_period.period_end,
      subscription_tier_snapshot = v_policy.normalized_plan,
      included_call_limit = NULL,
      counted_in_cycle = true,
      counted_at = now(),
      consumption_mode = v_consumption_mode,
      credit_charge_amount = v_charge_amount,
      credits_charged = v_charge_amount > 0,
      used_from_quota = COALESCE((v_deduction ->> 'usedFromQuota')::INTEGER, 0),
      used_from_balance = COALESCE((v_deduction ->> 'usedFromBalance')::INTEGER, 0),
      metadata = jsonb_strip_nulls(COALESCE(metadata, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb))
  WHERE id = p_call_id;

  PERFORM public.log_discovery_call_event(
    p_call_id,
    'scheduled',
    v_call.founder_id,
    jsonb_build_object(
      'scheduledFor', p_scheduled_for,
      'durationMinutes', p_duration_minutes,
      'consumptionMode', v_consumption_mode,
      'chargedCredits', v_charge_amount
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'callId', p_call_id,
    'status', 'scheduled',
    'consumptionMode', v_consumption_mode,
    'chargedCredits', v_charge_amount,
    'billingPeriodStart', v_period.period_start_date
  );
END;
$$;
