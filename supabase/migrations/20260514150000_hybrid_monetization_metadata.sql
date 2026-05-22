-- Align database-facing plan metadata with the hybrid monetization model:
-- plan gates unlock tools, credits meter generative/high-cost actions inside unlocked tools.

UPDATE public.subscription_tiers
SET features = CASE tier_name
  WHEN 'rookie' THEN '[
    "50 credits per month",
    "ICP Builder free",
    "Waitlist Maker unlocked; uses 3 credits per publish/generation",
    "Insighta Test included",
    "Newspaper included",
    "Prompt Library free models only",
    "VC Search and Accelerator Hunt browse only",
    "1 discovery call per billing cycle",
    "1 Find a Co-Founder post per billing cycle"
  ]'::jsonb
  WHEN 'starter' THEN '[
    "100 credits per month",
    "Everything in Rookie",
    "PMF Lab unlocked; uses 6 credits per full analysis and 4 credits per evidence score",
    "Email Templates full access",
    "2 VC profile views per billing cycle",
    "2 Accelerator profile views per billing cycle",
    "2 discovery calls per billing cycle",
    "2 Find a Co-Founder posts per billing cycle"
  ]'::jsonb
  WHEN 'rising' THEN '[
    "250 credits per month",
    "Everything in Starter",
    "MVP Builder unlocked; uses 5 credits per initial generation and 3 credits per refinement",
    "Tech Stack Builder unlocked; uses 3 credits per generation",
    "GTM Strategist unlocked; uses 5 credits per strategy",
    "Directories included",
    "Pitch Deck Analyzer unlocked; uses 6 credits per analysis",
    "Prompt Library full access; custom actions use credits",
    "10 VC and 10 Accelerator profile views per billing cycle",
    "3 discovery calls per billing cycle",
    "Unlimited Find a Co-Founder posts"
  ]'::jsonb
  WHEN 'pro' THEN '[
    "600 credits per month",
    "Everything in Rising",
    "Find Your Angel included",
    "Unlimited VC and Accelerator profile views",
    "Unlimited discovery calls",
    "Unlimited Find a Co-Founder posts",
    "Highest credit runway for generative tools"
  ]'::jsonb
  ELSE features
END
WHERE tier_name IN ('rookie', 'starter', 'rising', 'pro');

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
      WHEN 'rising' THEN 'pro'
      ELSE NULL
    END AS upgrade_target,
    0 AS overage_credit_cost,
    public.normalize_subscription_tier(p_plan) = 'pro' AS has_unlimited;
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

CREATE OR REPLACE FUNCTION public.deduct_credits_atomic(
  p_user_id uuid,
  p_amount integer,
  p_feature text,
  p_session_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_monthly_quota integer;
  v_total_available integer;
  v_used_from_quota integer := 0;
  v_used_from_balance integer := 0;
  v_new_balance integer;
  v_new_quota integer;
  v_idempotency_key text;
  v_session_uuid uuid;
  v_existing_tx record;
BEGIN
  IF p_amount IS NULL OR p_amount < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid credit amount',
      'errorCode', 'DEDUCTION_FAILED'
    );
  END IF;

  SELECT balance, monthly_quota
    INTO v_balance, v_monthly_quota
    FROM public.user_credits
   WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User credit record not found',
      'errorCode', 'USER_NOT_FOUND'
    );
  END IF;

  IF p_amount = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'newBalance', COALESCE(v_balance, 0),
      'newQuota', COALESCE(v_monthly_quota, 0),
      'usedFromQuota', 0,
      'usedFromBalance', 0
    );
  END IF;

  v_idempotency_key := NULLIF(TRIM(COALESCE(p_metadata ->> 'idempotencyKey', '')), '');

  IF v_idempotency_key IS NOT NULL THEN
    SELECT *
      INTO v_existing_tx
      FROM public.credit_transactions
     WHERE user_id = p_user_id
       AND tx_type = 'deduct'
       AND feature = p_feature
       AND metadata ->> 'idempotencyKey' = v_idempotency_key
     ORDER BY created_at DESC
     LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'newBalance', COALESCE(v_balance, 0),
        'newQuota', COALESCE(v_monthly_quota, 0),
        'usedFromQuota', COALESCE((v_existing_tx.metadata ->> 'usedFromQuota')::integer, 0),
        'usedFromBalance', COALESCE((v_existing_tx.metadata ->> 'usedFromBalance')::integer, 0)
      );
    END IF;
  END IF;

  SELECT balance, monthly_quota
    INTO v_balance, v_monthly_quota
    FROM public.user_credits
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User credit record not found',
      'errorCode', 'USER_NOT_FOUND'
    );
  END IF;

  v_total_available := COALESCE(v_balance, 0) + COALESCE(v_monthly_quota, 0);

  IF v_total_available < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'errorCode', 'INSUFFICIENT_CREDITS'
    );
  END IF;

  IF v_monthly_quota >= p_amount THEN
    v_used_from_quota := p_amount;
    v_used_from_balance := 0;
    v_new_quota := v_monthly_quota - p_amount;
    v_new_balance := v_balance;
  ELSE
    v_used_from_quota := v_monthly_quota;
    v_used_from_balance := p_amount - v_monthly_quota;
    v_new_quota := 0;
    v_new_balance := v_balance - v_used_from_balance;
  END IF;

  UPDATE public.user_credits
     SET monthly_quota = v_new_quota,
         balance = v_new_balance
   WHERE user_id = p_user_id;

  v_session_uuid := NULL;
  IF p_session_id IS NOT NULL
     AND p_session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN
    v_session_uuid := p_session_id::uuid;
  END IF;

  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    tx_type,
    reason,
    feature,
    session_id,
    metadata
  ) VALUES (
    p_user_id,
    -p_amount,
    'deduct',
    FORMAT('Used %s credits for %s', p_amount, p_feature),
    p_feature,
    v_session_uuid,
    jsonb_strip_nulls(
      COALESCE(p_metadata, '{}'::jsonb) ||
      jsonb_build_object(
        'usedFromQuota', v_used_from_quota,
        'usedFromBalance', v_used_from_balance,
        'monthlyQuotaBefore', v_monthly_quota,
        'monthly_quota_before', v_monthly_quota,
        'balanceBefore', v_balance,
        'balance_before', v_balance,
        'quotaRemaining', v_new_quota,
        'balanceRemaining', v_new_balance,
        'monthlyQuotaAfter', v_new_quota,
        'monthly_quota_after', v_new_quota,
        'balanceAfter', v_new_balance,
        'balance_after', v_new_balance
      )
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'newBalance', v_new_balance,
    'newQuota', v_new_quota,
    'usedFromQuota', v_used_from_quota,
    'usedFromBalance', v_used_from_balance
  );
EXCEPTION
  WHEN unique_violation THEN
    IF v_idempotency_key IS NOT NULL THEN
      SELECT *
        INTO v_existing_tx
        FROM public.credit_transactions
       WHERE user_id = p_user_id
         AND tx_type = 'deduct'
         AND feature = p_feature
         AND metadata ->> 'idempotencyKey' = v_idempotency_key
       ORDER BY created_at DESC
       LIMIT 1;

      IF FOUND THEN
        SELECT balance, monthly_quota
          INTO v_balance, v_monthly_quota
          FROM public.user_credits
         WHERE user_id = p_user_id;

        RETURN jsonb_build_object(
          'success', true,
          'newBalance', COALESCE(v_balance, 0),
          'newQuota', COALESCE(v_monthly_quota, 0),
          'usedFromQuota', COALESCE((v_existing_tx.metadata ->> 'usedFromQuota')::integer, 0),
          'usedFromBalance', COALESCE((v_existing_tx.metadata ->> 'usedFromBalance')::integer, 0)
        );
      END IF;
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Duplicate transaction conflict',
      'errorCode', 'DEDUCTION_FAILED'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', COALESCE(SQLERRM, 'Transaction failed'),
      'errorCode', 'DEDUCTION_FAILED'
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
  v_consumption_mode TEXT := 'none';
  v_increment_included INTEGER := 0;
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
      credit_charge_amount = 0,
      credits_charged = false,
      used_from_quota = 0,
      used_from_balance = 0,
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
      'chargedCredits', 0
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'callId', p_call_id,
    'status', 'scheduled',
    'consumptionMode', v_consumption_mode,
    'chargedCredits', 0,
    'billingPeriodStart', v_period.period_start_date
  );
END;
$$;
