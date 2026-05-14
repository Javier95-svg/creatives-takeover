ALTER TABLE public.subscription_tiers
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_link TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_link_monthly TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_link_yearly TEXT;

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

  v_previous_tier := COALESCE(v_previous_tier, 'rookie');
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
      'grant_inserted', false
    );
  END IF;

  UPDATE public.profiles
     SET subscription_tier = v_tier
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
    v_monthly_credits,
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
    balance = EXCLUDED.balance,
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
    v_monthly_credits,
    'grant',
    'Subscription tier activation credit allocation',
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
      'new_tier', v_tier
    )
  );

  RETURN jsonb_build_object(
    'status', 'applied',
    'user_id', p_user_id,
    'tier', v_tier,
    'previous_tier', v_previous_tier,
    'monthly_credits', v_monthly_credits,
    'grant_inserted', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.downgrade_stripe_subscription_to_rookie(
  p_user_id UUID DEFAULT NULL,
  p_stripe_customer_id TEXT DEFAULT NULL,
  p_stripe_subscription_id TEXT DEFAULT NULL,
  p_stripe_event_id TEXT DEFAULT NULL,
  p_stripe_event_type TEXT DEFAULT 'customer.subscription.deleted'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := p_user_id;
  v_rookie_credits INTEGER := 25;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF v_user_id IS NULL AND NULLIF(btrim(COALESCE(p_stripe_customer_id, '')), '') IS NOT NULL THEN
    SELECT s.user_id
      INTO v_user_id
      FROM public.subscribers s
     WHERE s.stripe_customer_id = p_stripe_customer_id
     ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
     LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'no_user',
      'stripe_customer_id', p_stripe_customer_id,
      'stripe_subscription_id', p_stripe_subscription_id
    );
  END IF;

  SELECT COALESCE(st.monthly_credits, 25)
    INTO v_rookie_credits
    FROM public.subscription_tiers st
   WHERE st.tier_name = 'rookie'
   LIMIT 1;

  v_rookie_credits := COALESCE(v_rookie_credits, 25);

  UPDATE public.profiles
     SET subscription_tier = 'rookie'
   WHERE id = v_user_id;

  UPDATE public.user_credits
     SET subscription_tier = 'rookie',
         monthly_quota = v_rookie_credits
   WHERE user_id = v_user_id;

  UPDATE public.subscribers
     SET subscribed = false,
         subscription_tier = 'rookie',
         subscription_end = NULL,
         stripe_customer_id = NULL,
         current_period_start = v_now,
         current_period_end = v_now + interval '1 month',
         updated_at = v_now
   WHERE user_id = v_user_id
      OR (
        NULLIF(btrim(COALESCE(p_stripe_customer_id, '')), '') IS NOT NULL
        AND stripe_customer_id = p_stripe_customer_id
      );

  RETURN jsonb_build_object(
    'status', 'downgraded',
    'user_id', v_user_id,
    'tier', 'rookie',
    'monthly_credits', v_rookie_credits,
    'stripe_event_id', p_stripe_event_id,
    'stripe_event_type', p_stripe_event_type
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_stripe_subscription_checkout(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stripe_subscription_checkout(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

REVOKE ALL ON FUNCTION public.downgrade_stripe_subscription_to_rookie(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.downgrade_stripe_subscription_to_rookie(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- Fill these values after creating live Stripe monthly recurring prices and payment links.
-- UPDATE public.subscription_tiers
-- SET stripe_payment_link_monthly = '[STARTER_PAYMENT_LINK]',
--     stripe_payment_link = '[STARTER_PAYMENT_LINK]',
--     stripe_price_id = '[STARTER_PRICE_ID]'
-- WHERE tier_name = 'starter';
--
-- UPDATE public.subscription_tiers
-- SET stripe_payment_link_monthly = '[RISING_PAYMENT_LINK]',
--     stripe_payment_link = '[RISING_PAYMENT_LINK]',
--     stripe_price_id = '[RISING_PRICE_ID]'
-- WHERE tier_name = 'rising';
--
-- UPDATE public.subscription_tiers
-- SET stripe_payment_link_monthly = '[PRO_PAYMENT_LINK]',
--     stripe_payment_link = '[PRO_PAYMENT_LINK]',
--     stripe_price_id = '[PRO_PRICE_ID]'
-- WHERE tier_name = 'pro';
