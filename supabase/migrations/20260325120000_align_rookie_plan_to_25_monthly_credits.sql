-- Align Rookie/free accounts to 25 monthly credits across signup bootstrap and monthly refresh paths.

UPDATE public.subscription_tiers
SET monthly_credits = 25
WHERE tier_name = 'free';

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
  WHERE tier_name = 'free';

  grant_amount := COALESCE(grant_amount, 25);

  INSERT INTO public.user_credits (
    user_id,
    balance,
    monthly_quota,
    subscription_tier,
    last_reset_at,
    last_credit_grant
  )
  VALUES (NEW.id, 0, grant_amount, 'free', now(), now())
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
      'Monthly free-tier allocation on signup',
      'Account Creation',
      jsonb_build_object('grantType', 'monthly_quota', 'quotaGranted', grant_amount)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_after_insert_create_user_credits ON public.profiles;
CREATE TRIGGER trg_profile_after_insert_create_user_credits
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_user_credits_for_profile();

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
  WHERE tier_name = 'free';

  v_tier_credits := COALESCE(v_tier_credits, 25);

  INSERT INTO public.user_credits (
    user_id,
    balance,
    monthly_quota,
    subscription_tier,
    last_reset_at,
    last_credit_grant
  )
  VALUES (v_user_id, 0, v_tier_credits, 'free', now(), now())
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
      'Monthly free-tier allocation on signup',
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
      subscription_tier = 'free',
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
      'Subscription - free',
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
    subscription_tier = 'free',
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
    'Subscription - free',
    jsonb_build_object(
      'grantType', 'monthly_quota',
      'previousQuota', v_previous_quota,
      'quotaGranted', v_tier_credits
    )
  );
END;
$$;
