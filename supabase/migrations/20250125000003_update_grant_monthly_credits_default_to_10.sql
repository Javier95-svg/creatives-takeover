-- Update grant_monthly_credits function default fallback from 5 to 10 credits
-- Part of freemium monetization strategy implementation

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
      tier_credits := 10; -- Default to free tier (updated from 5 to 10)
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

