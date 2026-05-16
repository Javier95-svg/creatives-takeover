CREATE OR REPLACE FUNCTION public.apply_stripe_subscription_checkout(
  p_user_id UUID,
  p_email TEXT,
  p_stripe_customer_id TEXT,
  p_stripe_subscription_id TEXT,
  p_stripe_price_id TEXT,
  p_stripe_event_id TEXT,
  p_stripe_event_type TEXT,
  p_billing_cycle TEXT DEFAULT 'monthly',
  p_subscription_end TIMESTAMPTZ DEFAULT NULL,
  p_billing_anchor_at TIMESTAMPTZ DEFAULT NULL,
  p_current_period_start TIMESTAMPTZ DEFAULT NULL,
  p_current_period_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_previous_tier TEXT;
  v_monthly_credits INTEGER;
  v_previous_monthly_quota INTEGER := 0;
  v_preserved_balance INTEGER := 0;
  v_quota_grant_amount INTEGER := 0;
  v_event_type TEXT := NULLIF(btrim(COALESCE(p_stripe_event_type, 'checkout.session.completed')), '');
  v_billing_cycle TEXT := CASE
    WHEN lower(btrim(COALESCE(p_billing_cycle, 'monthly'))) IN ('year', 'yearly') THEN 'yearly'
    ELSE 'monthly'
  END;
  v_now TIMESTAMPTZ := now();
  v_anchor_at TIMESTAMPTZ;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_grant_exists BOOLEAN := false;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  IF NULLIF(btrim(COALESCE(p_stripe_price_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Stripe price ID is required';
  END IF;

  IF NULLIF(btrim(COALESCE(p_stripe_event_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Stripe event ID is required';
  END IF;

  SELECT st.tier_name, st.monthly_credits
    INTO v_tier, v_monthly_credits
    FROM public.subscription_tiers st
   WHERE st.stripe_price_id = p_stripe_price_id
     AND st.tier_name IN ('starter', 'rising', 'pro')
   LIMIT 1;

  IF v_tier IS NULL THEN
    RAISE EXCEPTION 'No paid subscription tier found for Stripe price ID: %', p_stripe_price_id;
  END IF;

  SELECT subscription_tier
    INTO v_previous_tier
    FROM public.profiles
   WHERE id = p_user_id
   FOR UPDATE;

  SELECT COALESCE(uc.monthly_quota, 0), COALESCE(uc.balance, 0)
    INTO v_previous_monthly_quota, v_preserved_balance
    FROM public.user_credits uc
   WHERE uc.user_id = p_user_id
   FOR UPDATE;

  v_previous_tier := COALESCE(v_previous_tier, 'rookie');
  v_previous_monthly_quota := COALESCE(v_previous_monthly_quota, 0);
  v_preserved_balance := COALESCE(v_preserved_balance, 0);
  v_quota_grant_amount := GREATEST(v_monthly_credits - v_previous_monthly_quota, 0);
  v_anchor_at := COALESCE(p_billing_anchor_at, p_current_period_start, v_now);
  v_period_start := COALESCE(p_current_period_start, v_now);
  v_period_end := COALESCE(p_current_period_end, p_subscription_end, v_now + interval '1 month');

  SELECT EXISTS (
    SELECT 1
      FROM public.credit_transactions ct
     WHERE ct.user_id = p_user_id
       AND ct.tx_type = 'grant'
       AND ct.feature = 'Subscription - ' || v_tier
       AND ct.metadata ->> 'stripe_event_id' = p_stripe_event_id
  ) INTO v_grant_exists;

  IF v_grant_exists THEN
    RETURN jsonb_build_object(
      'status', 'already_applied',
      'user_id', p_user_id,
      'tier', v_tier,
      'previous_tier', v_previous_tier,
      'monthly_credits', v_monthly_credits,
      'preserved_balance', v_preserved_balance,
      'quota_grant_amount', 0,
      'grant_inserted', false
    );
  END IF;

  UPDATE public.profiles
     SET subscription_tier = v_tier,
         credit_balance = v_preserved_balance
   WHERE id = p_user_id;

  INSERT INTO public.user_credits (
    user_id,
    balance,
    monthly_quota,
    subscription_tier,
    last_reset_at,
    last_credit_grant,
    billing_anchor_at,
    current_period_start,
    current_period_end
  ) VALUES (
    p_user_id,
    v_preserved_balance,
    v_monthly_credits,
    v_tier,
    v_now,
    v_now,
    v_anchor_at,
    v_period_start,
    v_period_end
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    balance = v_preserved_balance,
    monthly_quota = EXCLUDED.monthly_quota,
    subscription_tier = EXCLUDED.subscription_tier,
    last_reset_at = EXCLUDED.last_reset_at,
    last_credit_grant = EXCLUDED.last_credit_grant,
    billing_anchor_at = EXCLUDED.billing_anchor_at,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end;

  INSERT INTO public.subscribers (
    user_id,
    email,
    stripe_customer_id,
    subscribed,
    subscription_tier,
    subscription_end,
    billing_anchor_at,
    current_period_start,
    current_period_end,
    updated_at
  ) VALUES (
    p_user_id,
    NULLIF(btrim(COALESCE(p_email, '')), ''),
    NULLIF(btrim(COALESCE(p_stripe_customer_id, '')), ''),
    true,
    v_tier,
    p_subscription_end,
    v_anchor_at,
    v_period_start,
    v_period_end,
    v_now
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, public.subscribers.email),
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    subscribed = true,
    subscription_tier = EXCLUDED.subscription_tier,
    subscription_end = EXCLUDED.subscription_end,
    billing_anchor_at = EXCLUDED.billing_anchor_at,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    updated_at = v_now;

  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    tx_type,
    reason,
    feature,
    metadata
  ) VALUES (
    p_user_id,
    v_quota_grant_amount,
    'grant',
    'Subscription tier activation monthly quota allocation',
    'Subscription - ' || v_tier,
    jsonb_build_object(
      'source', 'stripe_webhook',
      'stripe_event_id', p_stripe_event_id,
      'stripe_event_type', v_event_type,
      'stripe_customer_id', p_stripe_customer_id,
      'stripe_subscription_id', p_stripe_subscription_id,
      'stripe_price_id', p_stripe_price_id,
      'billing_cycle', v_billing_cycle,
      'previous_tier', v_previous_tier,
      'new_tier', v_tier,
      'previous_monthly_quota', v_previous_monthly_quota,
      'new_monthly_quota', v_monthly_credits,
      'preserved_balance', v_preserved_balance,
      'quota_grant_amount', v_quota_grant_amount
    )
  );

  RETURN jsonb_build_object(
    'status', 'applied',
    'user_id', p_user_id,
    'tier', v_tier,
    'previous_tier', v_previous_tier,
    'monthly_credits', v_monthly_credits,
    'previous_monthly_quota', v_previous_monthly_quota,
    'preserved_balance', v_preserved_balance,
    'quota_grant_amount', v_quota_grant_amount,
    'grant_inserted', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_stripe_subscription_checkout(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stripe_subscription_checkout(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
