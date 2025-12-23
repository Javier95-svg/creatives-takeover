-- Update new user initialization to 10 credits (upgrade from 5)
-- Part of freemium monetization strategy implementation

CREATE OR REPLACE FUNCTION public.create_user_credits_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Initialize new users with 10 credits in balance AND 10 credits in monthly_quota
  -- This matches the quota-first deduction strategy
  INSERT INTO public.user_credits (user_id, balance, monthly_quota, last_reset_at)
  VALUES (NEW.id, 10, 10, now())  -- Changed: from 5 to 10 credits
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
    10,
    'grant',
    'Welcome bonus - 10 free credits for new account',
    'Account Creation',
    jsonb_build_object(
      'balance', 10,
      'monthly_quota', 10,
      'tier', 'free'
    )
  );
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_user_credits_for_profile() IS 
'Automatically creates credit record for new profiles with 10 balance and 10 monthly quota credits';

