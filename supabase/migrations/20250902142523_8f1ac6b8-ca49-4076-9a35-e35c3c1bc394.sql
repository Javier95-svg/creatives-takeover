-- Fix security issues from linter
-- Enable RLS on subscription_tiers table
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

-- Create policy for subscription_tiers (read-only for all authenticated users)
DROP POLICY IF EXISTS "Anyone can read subscription tiers" ON public.subscription_tiers;
CREATE POLICY "Anyone can read subscription tiers" ON public.subscription_tiers
FOR SELECT
USING (true);

-- Fix function search_path issues by adding SET search_path = public
CREATE OR REPLACE FUNCTION public.grant_monthly_credits()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  tier_credits INTEGER;
  tier_name TEXT;
BEGIN
  -- Loop through all users with active subscriptions or free tier
  FOR user_record IN 
    SELECT 
      uc.user_id,
      uc.subscription_tier,
      uc.last_credit_grant,
      COALESCE(s.subscribed, false) as subscribed
    FROM public.user_credits uc
    LEFT JOIN public.subscribers s ON s.user_id = uc.user_id
    WHERE 
      -- Either they have an active subscription or they're on free tier and haven't received credits this month
      (s.subscribed = true OR uc.subscription_tier = 'free')
      AND (
        uc.last_credit_grant IS NULL 
        OR uc.last_credit_grant < date_trunc('month', now())
      )
  LOOP
    -- Determine the tier and credits to grant
    tier_name := COALESCE(user_record.subscription_tier, 'free');
    
    -- Get credits for this tier
    SELECT monthly_credits INTO tier_credits
    FROM public.subscription_tiers 
    WHERE tier_name = user_record.subscription_tier;
    
    IF tier_credits IS NULL THEN
      tier_credits := 5; -- Default to free tier
      tier_name := 'free';
    END IF;
    
    -- Grant the credits
    UPDATE public.user_credits 
    SET 
      balance = balance + tier_credits,
      last_credit_grant = now(),
      subscription_tier = tier_name
    WHERE user_id = user_record.user_id;
    
    -- Log the transaction
    INSERT INTO public.credit_transactions (
      user_id,
      amount,
      tx_type,
      reason,
      feature
    ) VALUES (
      user_record.user_id,
      tier_credits,
      'grant',
      'Monthly subscription credit allocation',
      'Subscription - ' || tier_name
    );
    
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix the update_user_subscription_tier function
CREATE OR REPLACE FUNCTION public.update_user_subscription_tier(
  user_email TEXT,
  new_tier TEXT,
  is_subscribed BOOLEAN DEFAULT true
)
RETURNS void AS $$
DECLARE
  target_user_id UUID;
  tier_credits INTEGER;
BEGIN
  -- Get user ID from email
  SELECT s.user_id INTO target_user_id
  FROM public.subscribers s
  WHERE s.email = user_email;
  
  IF target_user_id IS NULL THEN
    -- Try to find by profiles table
    SELECT p.id INTO target_user_id
    FROM public.profiles p
    WHERE p.id IN (
      SELECT id FROM auth.users WHERE email = user_email
    );
  END IF;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found for email: %', user_email;
  END IF;
  
  -- Get credits for the new tier
  SELECT monthly_credits INTO tier_credits
  FROM public.subscription_tiers 
  WHERE tier_name = new_tier;
  
  IF tier_credits IS NULL THEN
    RAISE EXCEPTION 'Invalid subscription tier: %', new_tier;
  END IF;
  
  -- Update user_credits table
  UPDATE public.user_credits 
  SET 
    subscription_tier = new_tier,
    last_credit_grant = CASE 
      WHEN is_subscribed AND subscription_tier != new_tier THEN now() 
      ELSE last_credit_grant 
    END
  WHERE user_id = target_user_id;
  
  -- If upgrading and subscribed, grant immediate credits
  IF is_subscribed AND EXISTS (
    SELECT 1 FROM public.user_credits 
    WHERE user_id = target_user_id 
    AND (last_credit_grant IS NULL OR last_credit_grant < date_trunc('month', now()))
  ) THEN
    -- Grant monthly credits for the new tier
    UPDATE public.user_credits 
    SET 
      balance = balance + tier_credits,
      last_credit_grant = now()
    WHERE user_id = target_user_id;
    
    -- Log the transaction
    INSERT INTO public.credit_transactions (
      user_id,
      amount,
      tx_type,
      reason,
      feature
    ) VALUES (
      target_user_id,
      tier_credits,
      'grant',
      'Subscription tier upgrade credit allocation',
      'Subscription - ' || new_tier
    );
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;