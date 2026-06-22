-- Guarantee new Rookie (free) accounts start from 50 monthly credits.
--
-- create_user_credits_for_profile() (AFTER INSERT trigger on profiles) reads the
-- Rookie allocation from subscription_tiers, which is the single source of truth
-- (currently 50). Its fallback was 25, a leftover from an earlier credit ladder.
-- When the Rookie tier value briefly flip-flopped (50 -> 10 -> 50 across the MVP
-- Phase 1 / ladder-restore migrations) some signups landed on 10/25. The tier is
-- 50 again now; this aligns the fallback to 50 so a missing/again-changed tier
-- row can never provision a Rookie below the intended 50.
--
-- Non-accumulative rule (unchanged): monthly_quota is always SET to the plan
-- allocation on reset, never added to leftover — so a Rookie always lands on the
-- current Rookie allocation each period, and other plans likewise.

CREATE OR REPLACE FUNCTION public.create_user_credits_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_user_id uuid;
  grant_amount integer := 50;
BEGIN
  SELECT COALESCE(monthly_credits, 50)
  INTO grant_amount
  FROM public.subscription_tiers
  WHERE tier_name = 'rookie';

  grant_amount := COALESCE(grant_amount, 50);

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
