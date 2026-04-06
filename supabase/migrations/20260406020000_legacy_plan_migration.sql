-- Zero-downtime legacy plan migration.
-- Backfill stored tier aliases to canonical values, enforce canonical writes,
-- and keep compatibility wrappers for older RPC callers during rollout.

INSERT INTO public.subscription_tiers (tier_name, monthly_credits, price_cents, features)
VALUES
  (
    'rookie',
    25,
    0,
    '[
      "25 credits per month",
      "ICP Builder included for free",
      "Insighta Test and Newspaper included",
      "1 free discovery call per billing cycle",
      "1 co-founder post per billing cycle",
      "Prompt Library: Business Case only"
    ]'::jsonb
  ),
  (
    'starter',
    50,
    900,
    '[
      "50 credits per month",
      "Waitlist Maker and PMF Lab use credits",
      "2 free discovery calls per billing cycle",
      "2 co-founder posts per billing cycle",
      "2 VC profiles and 2 accelerator profiles per billing cycle",
      "Basic email templates and 5 prompt templates"
    ]'::jsonb
  ),
  (
    'rising',
    100,
    2900,
    '[
      "100 credits per month",
      "All 7 tools accessible in any order",
      "Most BizMap tools included without per-use charges",
      "MVP Builder and GTM Strategist always consume credits",
      "3 free discovery calls per billing cycle, then 10 credits each",
      "10 VC profiles and 10 accelerator profiles per billing cycle"
    ]'::jsonb
  ),
  (
    'pro',
    300,
    6500,
    '[
      "300 credits per month",
      "Everything in Rising",
      "MVP Builder and GTM Strategist always consume credits",
      "Unlimited discovery calls",
      "Unlimited VC and accelerator profile views",
      "Angels community, group office hours, and priority support"
    ]'::jsonb
  )
ON CONFLICT (tier_name) DO UPDATE
SET
  monthly_credits = EXCLUDED.monthly_credits,
  price_cents = EXCLUDED.price_cents,
  features = EXCLUDED.features;

DELETE FROM public.subscription_tiers
WHERE tier_name IN ('free', 'basic', 'creator', 'premium', 'professional', 'enterprise');

UPDATE public.profiles
SET subscription_tier = public.normalize_subscription_tier(subscription_tier)
WHERE subscription_tier IS DISTINCT FROM public.normalize_subscription_tier(subscription_tier);

UPDATE public.subscribers
SET subscription_tier = public.normalize_subscription_tier(subscription_tier)
WHERE subscription_tier IS DISTINCT FROM public.normalize_subscription_tier(subscription_tier);

UPDATE public.user_credits
SET subscription_tier = public.normalize_subscription_tier(subscription_tier)
WHERE subscription_tier IS DISTINCT FROM public.normalize_subscription_tier(subscription_tier);

UPDATE public.reactivation_outreach
SET previous_tier = public.normalize_subscription_tier(previous_tier)
WHERE previous_tier IS NOT NULL
  AND previous_tier IS DISTINCT FROM public.normalize_subscription_tier(previous_tier);

ALTER TABLE public.profiles
  ALTER COLUMN subscription_tier SET DEFAULT 'rookie';

ALTER TABLE public.subscribers
  ALTER COLUMN subscription_tier SET DEFAULT 'rookie';

ALTER TABLE public.user_credits
  ALTER COLUMN subscription_tier SET DEFAULT 'rookie';

CREATE OR REPLACE FUNCTION public.canonicalize_plan_tier_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'subscription_tiers' THEN
    NEW.tier_name := public.normalize_subscription_tier(NEW.tier_name);
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'reactivation_outreach' THEN
    IF NEW.previous_tier IS NOT NULL THEN
      NEW.previous_tier := public.normalize_subscription_tier(NEW.previous_tier);
    END IF;
    RETURN NEW;
  END IF;

  NEW.subscription_tier := public.normalize_subscription_tier(NEW.subscription_tier);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_canonicalize_subscription_tier ON public.profiles;
CREATE TRIGGER trg_profiles_canonicalize_subscription_tier
  BEFORE INSERT OR UPDATE OF subscription_tier ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.canonicalize_plan_tier_columns();

DROP TRIGGER IF EXISTS trg_subscribers_canonicalize_subscription_tier ON public.subscribers;
CREATE TRIGGER trg_subscribers_canonicalize_subscription_tier
  BEFORE INSERT OR UPDATE OF subscription_tier ON public.subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.canonicalize_plan_tier_columns();

DROP TRIGGER IF EXISTS trg_user_credits_canonicalize_subscription_tier ON public.user_credits;
CREATE TRIGGER trg_user_credits_canonicalize_subscription_tier
  BEFORE INSERT OR UPDATE OF subscription_tier ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.canonicalize_plan_tier_columns();

DROP TRIGGER IF EXISTS trg_subscription_tiers_canonicalize_tier_name ON public.subscription_tiers;
CREATE TRIGGER trg_subscription_tiers_canonicalize_tier_name
  BEFORE INSERT OR UPDATE OF tier_name ON public.subscription_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.canonicalize_plan_tier_columns();

DROP TRIGGER IF EXISTS trg_reactivation_outreach_canonicalize_previous_tier ON public.reactivation_outreach;
CREATE TRIGGER trg_reactivation_outreach_canonicalize_previous_tier
  BEFORE INSERT OR UPDATE OF previous_tier ON public.reactivation_outreach
  FOR EACH ROW
  EXECUTE FUNCTION public.canonicalize_plan_tier_columns();

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_tier_canonical_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_tier_canonical_check
  CHECK (subscription_tier IN ('rookie', 'starter', 'rising', 'pro')) NOT VALID;

ALTER TABLE public.subscribers
  DROP CONSTRAINT IF EXISTS subscribers_subscription_tier_canonical_check;
ALTER TABLE public.subscribers
  ADD CONSTRAINT subscribers_subscription_tier_canonical_check
  CHECK (subscription_tier IN ('rookie', 'starter', 'rising', 'pro')) NOT VALID;

ALTER TABLE public.user_credits
  DROP CONSTRAINT IF EXISTS user_credits_subscription_tier_canonical_check;
ALTER TABLE public.user_credits
  ADD CONSTRAINT user_credits_subscription_tier_canonical_check
  CHECK (subscription_tier IN ('rookie', 'starter', 'rising', 'pro')) NOT VALID;

ALTER TABLE public.subscription_tiers
  DROP CONSTRAINT IF EXISTS subscription_tiers_tier_name_canonical_check;
ALTER TABLE public.subscription_tiers
  ADD CONSTRAINT subscription_tiers_tier_name_canonical_check
  CHECK (tier_name IN ('rookie', 'starter', 'rising', 'pro')) NOT VALID;

ALTER TABLE public.reactivation_outreach
  DROP CONSTRAINT IF EXISTS reactivation_outreach_previous_tier_canonical_check;
ALTER TABLE public.reactivation_outreach
  ADD CONSTRAINT reactivation_outreach_previous_tier_canonical_check
  CHECK (previous_tier IS NULL OR previous_tier IN ('rookie', 'starter', 'rising', 'pro')) NOT VALID;

CREATE OR REPLACE FUNCTION public.create_user_credits_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_user_id uuid;
  grant_amount integer := 25;
BEGIN
  SELECT COALESCE(monthly_credits, 25)
  INTO grant_amount
  FROM public.subscription_tiers
  WHERE tier_name = 'rookie';

  grant_amount := COALESCE(grant_amount, 25);

  INSERT INTO public.user_credits (
    user_id,
    balance,
    monthly_quota,
    subscription_tier,
    last_reset_at,
    last_credit_grant
  )
  VALUES (NEW.id, 0, grant_amount, 'rookie', now(), now())
  ON CONFLICT (user_id) DO NOTHING
  RETURNING user_id INTO inserted_user_id;

  IF inserted_user_id IS NOT NULL THEN
    INSERT INTO public.credit_transactions (
      user_id,
      amount,
      tx_type,
      reason,
      feature,
      metadata
    ) VALUES (
      NEW.id,
      grant_amount,
      'grant',
      'Monthly Rookie allocation on signup',
      'Account Creation',
      jsonb_build_object('grantType', 'monthly_quota', 'quotaGranted', grant_amount)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_monthly_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_subscribed boolean := false;
  v_last_reset_at timestamptz;
  v_last_credit_grant timestamptz;
  v_previous_quota integer := 0;
  v_tier_credits integer := 25;
  v_last_anchor timestamptz;
  v_days_since_grant integer := 0;
  v_is_different_month boolean := false;
  v_inserted_user_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(monthly_credits, 25)
  INTO v_tier_credits
  FROM public.subscription_tiers
  WHERE tier_name = 'rookie';

  v_tier_credits := COALESCE(v_tier_credits, 25);

  INSERT INTO public.user_credits (
    user_id,
    balance,
    monthly_quota,
    subscription_tier,
    last_reset_at,
    last_credit_grant
  )
  VALUES (v_user_id, 0, v_tier_credits, 'rookie', now(), now())
  ON CONFLICT (user_id) DO NOTHING
  RETURNING user_id INTO v_inserted_user_id;

  IF v_inserted_user_id IS NOT NULL THEN
    INSERT INTO public.credit_transactions (
      user_id,
      amount,
      tx_type,
      reason,
      feature,
      metadata
    ) VALUES (
      v_user_id,
      v_tier_credits,
      'grant',
      'Monthly Rookie allocation on signup',
      'Account Creation',
      jsonb_build_object('grantType', 'monthly_quota', 'quotaGranted', v_tier_credits)
    );

    RETURN;
  END IF;

  SELECT
    COALESCE(s.subscribed, false),
    uc.last_reset_at,
    uc.last_credit_grant,
    COALESCE(uc.monthly_quota, 0)
  INTO
    v_subscribed,
    v_last_reset_at,
    v_last_credit_grant,
    v_previous_quota
  FROM public.user_credits uc
  LEFT JOIN public.subscribers s
    ON s.user_id = uc.user_id
   AND s.subscribed = true
  WHERE uc.user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_subscribed THEN
    RETURN;
  END IF;

  v_last_anchor := COALESCE(v_last_reset_at, v_last_credit_grant);

  IF v_last_anchor IS NULL THEN
    UPDATE public.user_credits
    SET
      monthly_quota = v_tier_credits,
      subscription_tier = 'rookie',
      last_reset_at = now(),
      last_credit_grant = now()
    WHERE user_id = v_user_id;

    INSERT INTO public.credit_transactions (
      user_id,
      amount,
      tx_type,
      reason,
      feature,
      metadata
    ) VALUES (
      v_user_id,
      v_tier_credits,
      'grant',
      'Monthly Rookie credit allocation',
      'Subscription - rookie',
      jsonb_build_object(
        'grantType', 'monthly_quota',
        'previousQuota', v_previous_quota,
        'quotaGranted', v_tier_credits
      )
    );

    RETURN;
  END IF;

  v_days_since_grant := FLOOR(EXTRACT(EPOCH FROM (now() - v_last_anchor)) / 86400);
  v_is_different_month := date_trunc('month', now()) > date_trunc('month', v_last_anchor);

  IF v_days_since_grant < 30 AND NOT v_is_different_month THEN
    RETURN;
  END IF;

  UPDATE public.user_credits
  SET
    monthly_quota = v_tier_credits,
    subscription_tier = 'rookie',
    last_reset_at = now(),
    last_credit_grant = now()
  WHERE user_id = v_user_id;

  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    tx_type,
    reason,
    feature,
    metadata
  ) VALUES (
    v_user_id,
    v_tier_credits,
    'grant',
    'Monthly Rookie credit allocation',
    'Subscription - rookie',
    jsonb_build_object(
      'grantType', 'monthly_quota',
      'previousQuota', v_previous_quota,
      'quotaGranted', v_tier_credits
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_subscription_tier(
  target_user_id UUID,
  new_tier TEXT,
  is_subscribed BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_tier TEXT := public.normalize_subscription_tier(new_tier);
  tier_credits INTEGER;
  current_user_email TEXT;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  SELECT u.email
  INTO current_user_email
  FROM auth.users u
  WHERE u.id = target_user_id;

  IF current_user_email IS NULL THEN
    RAISE EXCEPTION 'User not found for ID: %', target_user_id;
  END IF;

  SELECT monthly_credits
  INTO tier_credits
  FROM public.subscription_tiers
  WHERE tier_name = normalized_tier;

  IF tier_credits IS NULL THEN
    RAISE EXCEPTION 'Invalid subscription tier: %', new_tier;
  END IF;

  INSERT INTO public.subscribers (
    user_id,
    email,
    subscribed,
    subscription_tier,
    updated_at
  )
  VALUES (
    target_user_id,
    current_user_email,
    is_subscribed,
    normalized_tier,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    subscribed = EXCLUDED.subscribed,
    subscription_tier = EXCLUDED.subscription_tier,
    updated_at = now();

  UPDATE public.profiles
  SET
    subscribed = is_subscribed,
    subscription_tier = normalized_tier,
    monthly_credits = tier_credits,
    updated_at = now()
  WHERE id = target_user_id;

  INSERT INTO public.user_credits (
    user_id,
    balance,
    monthly_quota,
    subscription_tier,
    last_reset_at,
    last_credit_grant
  )
  VALUES (
    target_user_id,
    0,
    tier_credits,
    normalized_tier,
    now(),
    NULL
  )
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_credits
  SET
    subscription_tier = normalized_tier,
    monthly_quota = GREATEST(COALESCE(monthly_quota, 0), tier_credits),
    last_credit_grant = CASE
      WHEN is_subscribed AND public.normalize_subscription_tier(subscription_tier) IS DISTINCT FROM normalized_tier THEN now()
      ELSE last_credit_grant
    END
  WHERE user_id = target_user_id;

  IF is_subscribed AND EXISTS (
    SELECT 1
    FROM public.user_credits
    WHERE user_id = target_user_id
      AND (last_credit_grant IS NULL OR last_credit_grant < date_trunc('month', now()))
  ) THEN
    UPDATE public.user_credits
    SET
      balance = balance + tier_credits,
      last_credit_grant = now()
    WHERE user_id = target_user_id;

    INSERT INTO public.credit_transactions (
      user_id,
      amount,
      tx_type,
      reason,
      feature
    )
    VALUES (
      target_user_id,
      tier_credits,
      'grant',
      'Subscription tier upgrade credit allocation',
      'Subscription - ' || normalized_tier
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_subscription_tier(
  user_email TEXT,
  new_tier TEXT,
  is_subscribed BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_user_id UUID;
BEGIN
  IF user_email IS NULL OR btrim(user_email) = '' THEN
    RAISE EXCEPTION 'User email is required';
  END IF;

  SELECT s.user_id
  INTO resolved_user_id
  FROM public.subscribers s
  WHERE lower(s.email) = lower(user_email)
  ORDER BY s.updated_at DESC NULLS LAST
  LIMIT 1;

  IF resolved_user_id IS NULL THEN
    SELECT u.id
    INTO resolved_user_id
    FROM auth.users u
    WHERE lower(u.email) = lower(user_email)
    LIMIT 1;
  END IF;

  IF resolved_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found for email: %', user_email;
  END IF;

  PERFORM public.update_user_subscription_tier(resolved_user_id, new_tier, is_subscribed);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_subscription_tier(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_subscription_tier(TEXT, TEXT, BOOLEAN) TO authenticated;