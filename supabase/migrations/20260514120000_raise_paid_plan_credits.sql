-- Raise paid-plan monthly credits without modifying Rookie balances.

-- Step 1: Raise paid tier definitions.
UPDATE public.subscription_tiers
SET monthly_credits = CASE tier_name
  WHEN 'starter' THEN 100
  WHEN 'rising' THEN 250
  WHEN 'pro' THEN 600
  ELSE monthly_credits
END
WHERE tier_name IN ('starter', 'rising', 'pro');

-- Step 2: Raise monthly_quota for existing paid users.
UPDATE public.user_credits
SET monthly_quota = CASE subscription_tier
  WHEN 'starter' THEN 100
  WHEN 'rising' THEN 250
  WHEN 'pro' THEN 600
  ELSE monthly_quota
END
WHERE subscription_tier IN ('starter', 'rising', 'pro');

-- Step 3: Top up existing paid balances proportionally, capped at each new plan amount.
UPDATE public.user_credits
SET balance = CASE subscription_tier
  WHEN 'starter' THEN LEAST(balance + 50, 100)
  WHEN 'rising' THEN LEAST(balance + 150, 250)
  WHEN 'pro' THEN LEAST(balance + 300, 600)
  ELSE balance
END
WHERE subscription_tier IN ('starter', 'rising', 'pro')
  AND (
    (subscription_tier = 'starter' AND balance < 100)
    OR (subscription_tier = 'rising' AND balance < 250)
    OR (subscription_tier = 'pro' AND balance < 600)
  );

-- Step 4: Mirror denormalized profile balances for affected paid users.
UPDATE public.profiles p
SET credit_balance = uc.balance
FROM public.user_credits uc
WHERE p.id = uc.user_id
  AND uc.subscription_tier IN ('starter', 'rising', 'pro');
