-- Restore the intended credit ladder (Rookie 50 / Starter 100 / Rising 250 / Pro 600).
-- The MVP Builder Phase 1 migration (20260528122000) reverted these to 10/30/75/150;
-- subscription_tiers.monthly_credits is the runtime source for webhook + reset grants,
-- so it must hold the correct values for the code constants to take effect.
--
-- This migration is idempotent and non-reducing: existing user quotas and balances
-- are only ever raised toward the new allocation, never clawed back. (Some accounts
-- already sit above target, e.g. Pro override accounts at 1050 quota, and must not
-- be reduced.)

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

-- Step 2: Raise this cycle's metered quota to the new allocation (never reduce).
UPDATE public.user_credits
SET monthly_quota = GREATEST(monthly_quota, CASE subscription_tier
  WHEN 'rookie' THEN 50
  WHEN 'starter' THEN 100
  WHEN 'rising' THEN 250
  WHEN 'pro' THEN 600
  ELSE monthly_quota
END)
WHERE subscription_tier IN ('rookie', 'starter', 'rising', 'pro');

-- Step 3: Top up existing paid balances by the delta, capped at each new plan amount
-- (only affects accounts currently below the new plan ceiling).
UPDATE public.user_credits
SET balance = CASE subscription_tier
  WHEN 'starter' THEN LEAST(balance + 70, 100)
  WHEN 'rising' THEN LEAST(balance + 175, 250)
  WHEN 'pro' THEN LEAST(balance + 450, 600)
  ELSE balance
END
WHERE (subscription_tier = 'starter' AND balance < 100)
   OR (subscription_tier = 'rising' AND balance < 250)
   OR (subscription_tier = 'pro' AND balance < 600);

-- Step 4: Mirror denormalized profile balances for affected users.
UPDATE public.profiles p
SET credit_balance = uc.balance
FROM public.user_credits uc
WHERE p.id = uc.user_id
  AND uc.subscription_tier IN ('rookie', 'starter', 'rising', 'pro');
