-- Update the existing function to initialize new users with 5 credits
CREATE OR REPLACE FUNCTION public.create_user_credits_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, balance, monthly_quota, last_reset_at)
  VALUES (NEW.id, 5, 0, now())
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Log the initial credit grant for new users
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    tx_type,
    reason,
    feature
  ) VALUES (
    NEW.id,
    5,
    'grant',
    'Welcome bonus - 5 free credits for new account',
    'Account Creation'
  );
  
  RETURN NEW;
END;
$$;