-- Fix new user credit initialization trigger to set monthly_quota correctly
-- The trigger was setting monthly_quota to 0, but it should be 5 for free tier users
-- This matches the credit-service initialization behavior

CREATE OR REPLACE FUNCTION public.create_user_credits_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Initialize new users with 5 credits in balance AND 5 credits in monthly_quota
  -- This matches the quota-first deduction strategy
  INSERT INTO public.user_credits (user_id, balance, monthly_quota, last_reset_at)
  VALUES (NEW.id, 5, 5, now())  -- Changed: monthly_quota from 0 to 5
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Log the initial credit grant for new users
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    tx_type,
    reason,
    feature,
    metadata
  ) VALUES (
    NEW.id,
    5,
    'grant',
    'Welcome bonus - 5 free credits for new account',
    'Account Creation',
    jsonb_build_object(
      'balance', 5,
      'monthly_quota', 5,
      'tier', 'free'
    )
  );
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_user_credits_for_profile() IS 
'Automatically creates credit record for new profiles with 5 balance and 5 monthly quota credits';

-- Also update existing users who have monthly_quota = 0 but balance > 0
-- This ensures consistency for users created before this fix
WITH users_to_update AS (
  SELECT 
    uc.user_id,
    uc.balance,
    CASE 
      WHEN uc.balance >= 5 THEN 5
      WHEN uc.balance > 0 THEN uc.balance
      ELSE uc.monthly_quota
    END as new_quota
  FROM public.user_credits uc
  INNER JOIN public.profiles p ON uc.user_id = p.id
  WHERE uc.monthly_quota = 0 
    AND uc.balance > 0
    AND p.subscription_tier = 'free'
)
-- Update the quotas
UPDATE public.user_credits 
SET 
  monthly_quota = users_to_update.new_quota,
  updated_at = now()
FROM users_to_update
WHERE user_credits.user_id = users_to_update.user_id;

-- Log these updates as adjustments (only for users that were updated)
WITH updated_users AS (
  SELECT 
    uc.user_id,
    uc.balance,
    uc.monthly_quota as new_quota
  FROM public.user_credits uc
  INNER JOIN public.profiles p ON uc.user_id = p.id
  WHERE uc.monthly_quota > 0 
    AND uc.balance > 0
    AND p.subscription_tier = 'free'
    AND NOT EXISTS (
      SELECT 1 FROM public.credit_transactions ct
      WHERE ct.user_id = uc.user_id
        AND ct.reason = 'Monthly quota initialization - retroactive fix'
    )
)
INSERT INTO public.credit_transactions (
  user_id,
  amount,
  tx_type,
  reason,
  feature,
  metadata
)
SELECT 
  user_id,
  new_quota,
  'adjustment',
  'Monthly quota initialization - retroactive fix',
  'System Update',
  jsonb_build_object(
    'previous_quota', 0,
    'new_quota', new_quota,
    'balance', balance
  )
FROM updated_users
WHERE new_quota > 0;

