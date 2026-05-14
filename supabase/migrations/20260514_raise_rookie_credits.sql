-- Raise Rookie monthly credits without affecting paid tiers.

-- Step 1: Raise the tier definition.
UPDATE public.subscription_tiers
SET monthly_credits = 50
WHERE tier_name = 'rookie';

-- Step 2: Raise monthly_quota for all existing Rookie users.
UPDATE public.user_credits
SET monthly_quota = 50
WHERE subscription_tier = 'rookie';

-- Step 3: Top up existing Rookie balances proportionally.
-- Give them back the difference (25 extra credits) but cap at 50.
UPDATE public.user_credits
SET balance = LEAST(balance + 25, 50)
WHERE subscription_tier = 'rookie'
  AND balance < 50;

-- Step 4: Mirror to profiles if credit_balance is denormalized.
UPDATE public.profiles p
SET credit_balance = uc.balance
FROM public.user_credits uc
WHERE p.id = uc.user_id
  AND p.subscription_tier = 'rookie';
