-- Restore the intended credit ladder (Rookie 50 / Starter 100 / Rising 250 / Pro 600).
-- The MVP Builder Phase 1 migration (20260528122000) reverted these to 10/30/75/150;
-- subscription_tiers.monthly_credits is the runtime source for webhook + reset grants,
-- so it must hold the correct values for the code constants to take effect.

-- Step 1: Restore tier definitions (the source of truth for monthly grants).
UPDATE public.subscription_tiers
SET monthly_credits = CASE tier_name
  WHEN 'rookie' THEN 50
  WHEN 'starter' THEN 100
  WHEN 'rising' THEN 250
  WHEN 'pro' THEN 600
  ELSE monthly_credits
END
WHERE tier_name IN ('rookie', 'starter', 'rising', 'pro');

-- Step 2: Refresh this cycle's metered quota for existing users to the new allocation.
UPDATE public.user_credits
SET monthly_quota = CASE subscription_tier
  WHEN 'rookie' THEN 50
  WHEN 'starter' THEN 100
  WHEN 'rising' THEN 250
  WHEN 'pro' THEN 600
  ELSE monthly_quota
END
WHERE subscription_tier IN ('rookie', 'starter', 'rising', 'pro');

-- Step 3: Top up existing paid balances by the delta, capped at each new plan amount.
UPDATE public.user_credits
SET balance = CASE subscription_tier
  WHEN 'starter' THEN LEAST(balance + 70, 100)
  WHEN 'rising' THEN LEAST(balance + 175, 250)
  WHEN 'pro' THEN LEAST(balance + 450, 600)
  ELSE balance
END
WHERE subscription_tier IN ('starter', 'rising', 'pro')
  AND (
    (subscription_tier = 'starter' AND balance < 100)
    OR (subscription_tier = 'rising' AND balance < 250)
    OR (subscription_tier = 'pro' AND balance < 600)
  );

-- Step 4: Mirror denormalized profile balances for affected users.
UPDATE public.profiles p
SET credit_balance = uc.balance
FROM public.user_credits uc
WHERE p.id = uc.user_id
  AND uc.subscription_tier IN ('rookie', 'starter', 'rising', 'pro');
