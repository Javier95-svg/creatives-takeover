-- Phase 4: Subscription Integration
-- Create subscribers table to track subscription information
CREATE TABLE IF NOT EXISTS public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT DEFAULT 'free',
  subscription_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Create policies for users to view their own subscription info
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;
CREATE POLICY "select_own_subscription" ON public.subscribers
FOR SELECT
USING (user_id = auth.uid() OR email = auth.email());

-- Create policies for edge functions to update subscription info
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;
CREATE POLICY "update_own_subscription" ON public.subscribers
FOR UPDATE
USING (true);

-- Create policy for edge functions to insert subscription info
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
CREATE POLICY "insert_subscription" ON public.subscribers
FOR INSERT
WITH CHECK (true);

-- Add subscription-related columns to user_credits if not exists
DO $$ BEGIN
  ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS last_credit_grant TIMESTAMPTZ DEFAULT now();
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Create subscription tiers configuration table
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  tier_name TEXT PRIMARY KEY,
  monthly_credits INTEGER NOT NULL DEFAULT 0,
  price_cents INTEGER NOT NULL DEFAULT 0,
  stripe_price_id TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default subscription tiers
INSERT INTO public.subscription_tiers (tier_name, monthly_credits, price_cents, features) VALUES
('free', 5, 0, '["5 credits per month", "Basic support"]'::jsonb),
('basic', 50, 999, '["50 credits per month", "Email support", "Priority processing"]'::jsonb),
('premium', 150, 1999, '["150 credits per month", "Priority support", "Advanced features", "Export options"]'::jsonb),
('enterprise', 500, 4999, '["500 credits per month", "Dedicated support", "All features", "API access", "Custom integrations"]'::jsonb)
ON CONFLICT (tier_name) DO UPDATE SET
  monthly_credits = EXCLUDED.monthly_credits,
  price_cents = EXCLUDED.price_cents,
  features = EXCLUDED.features;

-- Function to automatically grant monthly credits based on subscription tier
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user subscription tier and grant credits
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically initialize subscriber record when profile is created
CREATE OR REPLACE FUNCTION public.create_subscriber_for_profile()
RETURNS trigger AS $$
BEGIN
  -- Get email from auth.users
  INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier)
  SELECT 
    NEW.id,
    au.email,
    false,
    'free'
  FROM auth.users au
  WHERE au.id = NEW.id
  ON CONFLICT (email) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic subscriber creation
DROP TRIGGER IF EXISTS trg_profile_after_insert_create_subscriber ON public.profiles;
CREATE TRIGGER trg_profile_after_insert_create_subscriber
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.create_subscriber_for_profile();