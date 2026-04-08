-- Discovery call lifecycle tracking with immutable events, cycle counters,
-- and billing-aware quota/credit enforcement.

CREATE OR REPLACE FUNCTION public.is_discovery_call_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = p_user_id
      AND LOWER(email) = 'admin@creatives-takeover.com'
  );
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'discovery_call_status'
  ) THEN
    CREATE TYPE public.discovery_call_status AS ENUM (
      'intent_created',
      'scheduled',
      'completed',
      'cancelled_early',
      'cancelled_late',
      'founder_no_show',
      'mentor_no_show'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.discovery_call_cycle_counters (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  billing_period_start DATE NOT NULL,
  billing_period_end TIMESTAMPTZ NOT NULL,
  subscription_tier_snapshot TEXT NOT NULL,
  included_calls_booked INTEGER NOT NULL DEFAULT 0 CHECK (included_calls_booked >= 0),
  overage_calls_booked INTEGER NOT NULL DEFAULT 0 CHECK (overage_calls_booked >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, billing_period_start)
);

CREATE TABLE IF NOT EXISTS public.discovery_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE RESTRICT,
  mentor_name_snapshot TEXT NOT NULL,
  provider_name TEXT NOT NULL DEFAULT 'calendly',
  provider_booking_url TEXT,
  provider_event_id TEXT,
  provider_invitee_id TEXT,
  status public.discovery_call_status NOT NULL DEFAULT 'intent_created',
  booking_source TEXT,
  scheduled_for TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  meeting_url TEXT,
  billing_period_start DATE,
  billing_period_end TIMESTAMPTZ,
  subscription_tier_snapshot TEXT,
  included_call_limit INTEGER,
  counted_in_cycle BOOLEAN NOT NULL DEFAULT false,
  counted_at TIMESTAMPTZ,
  count_released_at TIMESTAMPTZ,
  consumption_mode TEXT NOT NULL DEFAULT 'none' CHECK (consumption_mode IN ('none', 'included', 'overage', 'unlimited')),
  credit_charge_amount INTEGER NOT NULL DEFAULT 0 CHECK (credit_charge_amount >= 0),
  credits_charged BOOLEAN NOT NULL DEFAULT false,
  credits_refunded BOOLEAN NOT NULL DEFAULT false,
  credits_refunded_at TIMESTAMPTZ,
  used_from_quota INTEGER NOT NULL DEFAULT 0 CHECK (used_from_quota >= 0),
  used_from_balance INTEGER NOT NULL DEFAULT 0 CHECK (used_from_balance >= 0),
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.discovery_call_events (
  id BIGSERIAL PRIMARY KEY,
  discovery_call_id UUID NOT NULL REFERENCES public.discovery_calls(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS discovery_calls_provider_event_id_key
  ON public.discovery_calls (provider_event_id)
  WHERE provider_event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS discovery_calls_provider_invitee_id_key
  ON public.discovery_calls (provider_invitee_id)
  WHERE provider_invitee_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS discovery_calls_founder_idempotency_key
  ON public.discovery_calls (founder_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS discovery_calls_founder_created_idx
  ON public.discovery_calls (founder_id, created_at DESC);

CREATE INDEX IF NOT EXISTS discovery_calls_founder_status_idx
  ON public.discovery_calls (founder_id, status, scheduled_for DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS discovery_calls_mentor_scheduled_idx
  ON public.discovery_calls (mentor_id, scheduled_for DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS discovery_call_events_call_created_idx
  ON public.discovery_call_events (discovery_call_id, created_at ASC);

ALTER TABLE public.discovery_call_cycle_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_call_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own discovery call counters" ON public.discovery_call_cycle_counters;
CREATE POLICY "Users can view their own discovery call counters"
  ON public.discovery_call_cycle_counters
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_discovery_call_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own discovery calls" ON public.discovery_calls;
CREATE POLICY "Users can view their own discovery calls"
  ON public.discovery_calls
  FOR SELECT
  USING (founder_id = auth.uid() OR public.is_discovery_call_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own discovery call events" ON public.discovery_call_events;
CREATE POLICY "Users can view their own discovery call events"
  ON public.discovery_call_events
  FOR SELECT
  USING (
    public.is_discovery_call_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.discovery_calls dc
      WHERE dc.id = discovery_call_events.discovery_call_id
        AND dc.founder_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.set_discovery_call_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_discovery_calls_updated_at ON public.discovery_calls;
CREATE TRIGGER trg_discovery_calls_updated_at
  BEFORE UPDATE ON public.discovery_calls
  FOR EACH ROW
  EXECUTE FUNCTION public.set_discovery_call_updated_at();

CREATE OR REPLACE FUNCTION public.set_discovery_call_counter_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_discovery_call_cycle_counters_updated_at ON public.discovery_call_cycle_counters;
CREATE TRIGGER trg_discovery_call_cycle_counters_updated_at
  BEFORE UPDATE ON public.discovery_call_cycle_counters
  FOR EACH ROW
  EXECUTE FUNCTION public.set_discovery_call_counter_updated_at();

CREATE OR REPLACE FUNCTION public.prevent_discovery_call_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Discovery call events are immutable';
END;
$$;

DROP TRIGGER IF EXISTS trg_discovery_call_events_immutable ON public.discovery_call_events;
CREATE TRIGGER trg_discovery_call_events_immutable
  BEFORE UPDATE OR DELETE ON public.discovery_call_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_discovery_call_event_mutation();

CREATE OR REPLACE FUNCTION public.log_discovery_call_event(
  p_discovery_call_id UUID,
  p_event_type TEXT,
  p_actor_user_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.discovery_call_events (
    discovery_call_id,
    event_type,
    actor_user_id,
    payload
  ) VALUES (
    p_discovery_call_id,
    p_event_type,
    p_actor_user_id,
    COALESCE(p_payload, '{}'::jsonb)
  );
END;
$$;

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
    CASE public.normalize_subscription_tier(p_plan)
      WHEN 'rookie' THEN 1
      WHEN 'starter' THEN 2
      WHEN 'rising' THEN 3
      ELSE NULL
    END AS included_limit,
    CASE public.normalize_subscription_tier(p_plan)
      WHEN 'rookie' THEN 'starter'
      WHEN 'starter' THEN 'rising'
      ELSE NULL
    END AS upgrade_target,
    CASE public.normalize_subscription_tier(p_plan)
      WHEN 'rising' THEN 10
      ELSE 0
    END AS overage_credit_cost,
    public.normalize_subscription_tier(p_plan) = 'pro' AS has_unlimited;
$$;

CREATE OR REPLACE FUNCTION public.sync_discovery_call_usage_legacy(
  p_user_id UUID,
  p_period_date DATE,
  p_delta INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_period_date IS NULL OR p_delta = 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.user_monthly_quotas (user_id, month)
  VALUES (p_user_id, p_period_date)
  ON CONFLICT (user_id, month) DO NOTHING;

  UPDATE public.user_monthly_quotas
  SET discovery_calls_used = GREATEST(0, discovery_calls_used + p_delta),
      updated_at = now()
  WHERE user_id = p_user_id
    AND month = p_period_date;
END;
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
  v_remaining_included INTEGER := 0;
  v_requires_credits BOOLEAN := false;
  v_can_book_now BOOLEAN := false;
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
  v_remaining_included := CASE
    WHEN v_policy.has_unlimited THEN NULL
    WHEN v_policy.included_limit IS NULL THEN 0
    ELSE GREATEST(0, v_policy.included_limit - COALESCE(v_counter.included_calls_booked, 0))
  END;

  IF v_policy.has_unlimited THEN
    v_can_book_now := true;
  ELSIF v_remaining_included > 0 THEN
    v_can_book_now := true;
  ELSIF v_policy.normalized_plan = 'rising' THEN
    v_requires_credits := true;
    v_can_book_now := v_total_credits >= v_policy.overage_credit_cost;
  ELSE
    v_can_book_now := false;
  END IF;

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
    'remainingIncluded', v_remaining_included,
    'requiresCredits', v_requires_credits,
    'canBookNow', v_can_book_now,
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
      'errorCode', CASE
        WHEN COALESCE((v_quota_status ->> 'requiresCredits')::BOOLEAN, false) THEN 'INSUFFICIENT_CREDITS'
        ELSE 'PLAN_UPGRADE_REQUIRED'
      END,
      'error', CASE
        WHEN COALESCE((v_quota_status ->> 'requiresCredits')::BOOLEAN, false)
          THEN format('You need %s credits to book another discovery call this cycle.', COALESCE(v_quota_status ->> 'overageCreditCost', '0'))
        ELSE 'You have reached your discovery call limit for this billing cycle.'
      END,
      'requiredTier', v_quota_status ->> 'upgradeTarget',
      'requiredCredits', COALESCE((v_quota_status ->> 'overageCreditCost')::INTEGER, 0),
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
      'mentorId', p_mentor_id
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
  v_counter RECORD;
  v_deduction JSONB;
  v_charge_amount INTEGER := 0;
  v_consumption_mode TEXT := 'none';
  v_increment_included INTEGER := 0;
  v_increment_overage INTEGER := 0;
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
      'scheduledFor', v_call.scheduled_for
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

  SELECT *
  INTO v_counter
  FROM public.discovery_call_cycle_counters
  WHERE user_id = v_call.founder_id
    AND billing_period_start = v_period.period_start_date
  FOR UPDATE;

  IF v_policy.has_unlimited THEN
    v_consumption_mode := 'unlimited';
    v_increment_included := 1;
  ELSIF COALESCE(v_counter.included_calls_booked, 0) < COALESCE(v_policy.included_limit, 0) THEN
    v_consumption_mode := 'included';
    v_increment_included := 1;
  ELSIF v_policy.normalized_plan = 'rising' THEN
    v_consumption_mode := 'overage';
    v_increment_overage := 1;
    v_charge_amount := COALESCE(v_policy.overage_credit_cost, 0);

    v_deduction := public.deduct_credits_atomic(
      v_call.founder_id,
      v_charge_amount,
      'Discovery Call',
      p_call_id::TEXT,
      jsonb_build_object(
        'idempotencyKey', format('discovery-call-finalize:%s', p_call_id),
        'discoveryCallId', p_call_id,
        'bookingStage', 'scheduled'
      )
    );

    IF COALESCE((v_deduction ->> 'success')::BOOLEAN, false) = false THEN
      RETURN jsonb_build_object(
        'success', false,
        'errorCode', COALESCE(v_deduction ->> 'errorCode', 'INSUFFICIENT_CREDITS'),
        'error', COALESCE(v_deduction ->> 'error', 'Unable to deduct credits for discovery call overage.'),
        'requiredCredits', v_charge_amount
      );
    END IF;
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'errorCode', 'PLAN_UPGRADE_REQUIRED',
      'error', 'You have reached your discovery call limit for this billing cycle.',
      'requiredTier', v_policy.upgrade_target
    );
  END IF;

  UPDATE public.discovery_call_cycle_counters
  SET included_calls_booked = included_calls_booked + v_increment_included,
      overage_calls_booked = overage_calls_booked + v_increment_overage,
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
      included_call_limit = v_policy.included_limit,
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

CREATE OR REPLACE FUNCTION public.update_discovery_call_status(
  p_call_id UUID,
  p_new_status public.discovery_call_status,
  p_actor_user_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_call RECORD;
  v_counter RECORD;
  v_should_release BOOLEAN := false;
  v_refunded BOOLEAN := false;
BEGIN
  IF p_call_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'errorCode', 'INVALID_REQUEST',
      'error', 'Call ID is required.'
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

  IF v_call.status = p_new_status THEN
    RETURN jsonb_build_object(
      'success', true,
      'callId', p_call_id,
      'status', p_new_status
    );
  END IF;

  IF p_new_status IN ('completed', 'cancelled_late', 'founder_no_show', 'mentor_no_show')
     AND v_call.status <> 'scheduled' THEN
    RETURN jsonb_build_object(
      'success', false,
      'errorCode', 'INVALID_STATE',
      'error', 'Only scheduled discovery calls can transition to this status.'
    );
  END IF;

  v_should_release := p_new_status IN ('cancelled_early', 'mentor_no_show')
    AND COALESCE(v_call.counted_in_cycle, false) = true
    AND v_call.billing_period_start IS NOT NULL;

  IF v_should_release THEN
    SELECT *
    INTO v_counter
    FROM public.discovery_call_cycle_counters
    WHERE user_id = v_call.founder_id
      AND billing_period_start = v_call.billing_period_start
    FOR UPDATE;

    IF FOUND THEN
      UPDATE public.discovery_call_cycle_counters
      SET included_calls_booked = CASE
            WHEN v_call.consumption_mode IN ('included', 'unlimited')
              THEN GREATEST(0, included_calls_booked - 1)
            ELSE included_calls_booked
          END,
          overage_calls_booked = CASE
            WHEN v_call.consumption_mode = 'overage'
              THEN GREATEST(0, overage_calls_booked - 1)
            ELSE overage_calls_booked
          END,
          updated_at = now()
      WHERE user_id = v_call.founder_id
        AND billing_period_start = v_call.billing_period_start;
    END IF;

    PERFORM public.sync_discovery_call_usage_legacy(v_call.founder_id, v_call.billing_period_start, -1);

    IF v_call.credits_charged = true
       AND v_call.credits_refunded = false
       AND COALESCE(v_call.credit_charge_amount, 0) > 0 THEN
      UPDATE public.user_credits
      SET monthly_quota = monthly_quota + COALESCE(v_call.used_from_quota, 0),
          balance = balance + COALESCE(v_call.used_from_balance, 0),
          updated_at = now()
      WHERE user_id = v_call.founder_id;

      INSERT INTO public.credit_transactions (
        user_id,
        amount,
        tx_type,
        reason,
        feature,
        session_id,
        metadata
      ) VALUES (
        v_call.founder_id,
        COALESCE(v_call.credit_charge_amount, 0),
        'refund',
        'Discovery call refund after non-counting cancellation',
        'Discovery Call',
        v_call.id,
        jsonb_build_object(
          'discoveryCallId', v_call.id,
          'restoredToQuota', COALESCE(v_call.used_from_quota, 0),
          'restoredToBalance', COALESCE(v_call.used_from_balance, 0),
          'refundReason', p_new_status
        )
      );

      v_refunded := true;
    END IF;
  END IF;

  UPDATE public.discovery_calls
  SET status = p_new_status,
      cancelled_at = CASE
        WHEN p_new_status IN ('cancelled_early', 'cancelled_late', 'founder_no_show', 'mentor_no_show') THEN now()
        ELSE cancelled_at
      END,
      cancelled_reason = CASE
        WHEN NULLIF(TRIM(COALESCE(p_reason, '')), '') IS NOT NULL THEN p_reason
        ELSE cancelled_reason
      END,
      counted_in_cycle = CASE WHEN v_should_release THEN false ELSE counted_in_cycle END,
      count_released_at = CASE WHEN v_should_release THEN now() ELSE count_released_at END,
      credits_refunded = CASE WHEN v_refunded THEN true ELSE credits_refunded END,
      credits_refunded_at = CASE WHEN v_refunded THEN now() ELSE credits_refunded_at END,
      metadata = jsonb_strip_nulls(COALESCE(metadata, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb))
  WHERE id = p_call_id;

  PERFORM public.log_discovery_call_event(
    p_call_id,
    p_new_status::TEXT,
    COALESCE(p_actor_user_id, v_call.founder_id),
    jsonb_strip_nulls(jsonb_build_object(
      'reason', NULLIF(TRIM(COALESCE(p_reason, '')), ''),
      'releasedCycleUsage', v_should_release,
      'refundedCredits', v_refunded
    ) || COALESCE(p_metadata, '{}'::jsonb))
  );

  RETURN jsonb_build_object(
    'success', true,
    'callId', p_call_id,
    'status', p_new_status,
    'releasedCycleUsage', v_should_release,
    'refundedCredits', v_refunded
  );
END;
$$;

CREATE OR REPLACE VIEW public.discovery_call_admin_overview AS
SELECT
  dc.id,
  dc.status,
  dc.booking_source,
  dc.scheduled_for,
  dc.duration_minutes,
  dc.billing_period_start,
  dc.subscription_tier_snapshot,
  dc.consumption_mode,
  dc.credit_charge_amount,
  dc.credits_charged,
  dc.credits_refunded,
  dc.created_at,
  dc.updated_at,
  dc.cancelled_at,
  dc.cancelled_reason,
  dc.provider_name,
  dc.provider_event_id,
  dc.provider_invitee_id,
  dc.meeting_url,
  founder.id AS founder_id,
  founder.full_name AS founder_name,
  founder_sub.email AS founder_email,
  mentor.id AS mentor_id,
  mentor.name AS mentor_name,
  mentor.user_id AS mentor_user_id
FROM public.discovery_calls dc
LEFT JOIN public.profiles founder ON founder.id = dc.founder_id
LEFT JOIN public.subscribers founder_sub ON founder_sub.user_id = founder.id
LEFT JOIN public.mentors mentor ON mentor.id = dc.mentor_id;
