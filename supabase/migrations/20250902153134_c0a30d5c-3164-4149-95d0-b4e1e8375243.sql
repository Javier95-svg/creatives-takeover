-- Update the existing function to initialize users with 5 credits
CREATE OR REPLACE FUNCTION public.create_user_credits_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, balance, monthly_quota, last_reset_at)
  VALUES (NEW.id, 5, 0, now())
  ON CONFLICT (user_id) DO UPDATE SET
    balance = CASE 
      WHEN user_credits.balance = 0 THEN 5 
      ELSE user_credits.balance 
    END;
  
  -- Log the initial credit grant
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
  ) ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS create_user_credits_trigger ON public.profiles;
CREATE TRIGGER create_user_credits_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_user_credits_for_profile();

-- Also update existing users who have 0 balance to get their 5 welcome credits
UPDATE public.user_credits 
SET balance = 5, updated_at = now()
WHERE balance = 0;

-- Log the credit grant for existing users who just received their welcome credits
INSERT INTO public.credit_transactions (
  user_id,
  amount,
  tx_type,
  reason,
  feature
)
SELECT 
  user_id,
  5,
  'grant',
  'Retroactive welcome bonus - 5 free credits',
  'System Update'
FROM public.user_credits 
WHERE balance = 5
ON CONFLICT DO NOTHING;