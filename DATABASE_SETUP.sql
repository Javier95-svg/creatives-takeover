-- ============================================
-- Database Schema Setup for Stripe Integration
-- Run this in Supabase SQL Editor
-- ============================================

-- STEP 1: First, let's see what columns your profiles table already has
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- NOTE: Check the output above before proceeding!
-- If you don't see an 'email' column, you'll need to get it from auth.users

-- ============================================
-- STEP 2: Add required columns for subscriptions
-- ============================================

-- Add Stripe customer ID
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add subscription tier (free, creator, professional)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';

-- Add subscription status
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscribed BOOLEAN DEFAULT false;

-- Add subscription end date
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMP WITH TIME ZONE;

-- Add monthly credit allowance
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_credits INTEGER DEFAULT 10;

-- Add current credit balance
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 10;

-- Add billing cycle (monthly or yearly)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_cycle TEXT;

-- ============================================
-- STEP 3: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(id);

-- ============================================
-- STEP 4: Add constraints
-- ============================================

-- Ensure only valid subscription tiers
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'creator', 'professional'));

-- Ensure only valid billing cycles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_billing_cycle_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_billing_cycle_check
  CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly', 'yearly'));

-- ============================================
-- STEP 5: Create webhook events log table
-- ============================================

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  customer_id TEXT,
  customer_email TEXT,
  subscription_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON stripe_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_customer_id ON stripe_webhook_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_customer_email ON stripe_webhook_events(customer_email);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON stripe_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON stripe_webhook_events(created_at DESC);

-- ============================================
-- STEP 6: Enable Row Level Security
-- ============================================

ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can insert webhook events" ON stripe_webhook_events;
DROP POLICY IF EXISTS "Service role can read webhook events" ON stripe_webhook_events;
DROP POLICY IF EXISTS "Service role can update webhook events" ON stripe_webhook_events;

-- Service role can insert webhook events
CREATE POLICY "Service role can insert webhook events"
  ON stripe_webhook_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can read webhook events
CREATE POLICY "Service role can read webhook events"
  ON stripe_webhook_events
  FOR SELECT
  TO service_role
  USING (true);

-- Service role can update webhook events
CREATE POLICY "Service role can update webhook events"
  ON stripe_webhook_events
  FOR UPDATE
  TO service_role
  USING (true);

-- ============================================
-- STEP 7: Helper function to get user email
-- ============================================

-- This function safely gets email from auth.users
CREATE OR REPLACE FUNCTION get_user_email(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id;

  RETURN user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 8: Function to update subscription from webhook
-- ============================================

CREATE OR REPLACE FUNCTION update_user_subscription(
  customer_email_param TEXT,
  tier_param TEXT,
  billing_cycle_param TEXT,
  stripe_customer_id_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_id_var UUID;
  credits_amount INTEGER;
  subscription_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Find user by email from auth.users
  SELECT id INTO user_id_var
  FROM auth.users
  WHERE email = customer_email_param;

  IF user_id_var IS NULL THEN
    RAISE NOTICE 'User not found for email: %', customer_email_param;
    RETURN FALSE;
  END IF;

  -- Determine credits based on tier
  credits_amount := CASE tier_param
    WHEN 'creator' THEN 50
    WHEN 'professional' THEN 150
    ELSE 10
  END;

  -- Calculate subscription end date
  subscription_end_date := CASE billing_cycle_param
    WHEN 'yearly' THEN NOW() + INTERVAL '1 year'
    ELSE NOW() + INTERVAL '1 month'
  END;

  -- Update user subscription
  UPDATE profiles
  SET
    subscription_tier = tier_param,
    subscribed = true,
    subscription_end = subscription_end_date,
    stripe_customer_id = stripe_customer_id_param,
    monthly_credits = credits_amount,
    credits = credits_amount,
    billing_cycle = billing_cycle_param,
    updated_at = NOW()
  WHERE id = user_id_var;

  RAISE NOTICE 'Updated subscription for user % to % (%)', user_id_var, tier_param, billing_cycle_param;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 9: Function to check subscription status
-- ============================================

CREATE OR REPLACE FUNCTION is_subscription_active(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT subscribed, subscription_end
  INTO user_record
  FROM profiles
  WHERE id = user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check if subscribed and subscription hasn't ended
  RETURN user_record.subscribed AND
         (user_record.subscription_end IS NULL OR user_record.subscription_end > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 10: Function to reset monthly credits
-- ============================================

CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Reset credits for all active subscribers
  UPDATE profiles
  SET credits = monthly_credits
  WHERE subscribed = true
    AND subscription_tier IN ('creator', 'professional')
    AND (subscription_end IS NULL OR subscription_end > NOW());

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RAISE NOTICE 'Reset credits for % users', updated_count;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 11: Function to expire subscriptions
-- ============================================

CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Downgrade users whose subscriptions have ended
  UPDATE profiles
  SET
    subscribed = false,
    subscription_tier = 'free',
    monthly_credits = 10,
    credits = 10,
    subscription_end = NULL,
    billing_cycle = NULL
  WHERE subscribed = true
    AND subscription_end IS NOT NULL
    AND subscription_end < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  RAISE NOTICE 'Expired % subscriptions', expired_count;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 12: Grant permissions
-- ============================================

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================
-- STEP 13: Create view for active subscriptions
-- ============================================

CREATE OR REPLACE VIEW active_subscriptions AS
SELECT
  p.id,
  au.email,
  p.subscription_tier,
  p.billing_cycle,
  p.monthly_credits,
  p.credits,
  p.subscription_end,
  p.stripe_customer_id,
  p.created_at
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.id
WHERE p.subscribed = true
  AND (p.subscription_end IS NULL OR p.subscription_end > NOW());

-- Grant access to view
GRANT SELECT ON active_subscriptions TO service_role;

-- ============================================
-- STEP 14: Verification queries
-- ============================================

-- Check what columns exist in profiles table
SELECT
  'Profiles columns:' as info,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN (
    'id',
    'stripe_customer_id',
    'subscription_tier',
    'subscribed',
    'subscription_end',
    'monthly_credits',
    'credits',
    'billing_cycle',
    'created_at',
    'updated_at'
  )
ORDER BY column_name;

-- Check indexes
SELECT
  'Indexes created:' as info,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('profiles', 'stripe_webhook_events')
ORDER BY tablename, indexname;

-- Check functions created
SELECT
  'Functions created:' as info,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_email',
    'update_user_subscription',
    'is_subscription_active',
    'reset_monthly_credits',
    'expire_subscriptions'
  )
ORDER BY routine_name;

-- Check webhook events table
SELECT
  'Webhook events table:' as info,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE processed = true) as processed_events,
  COUNT(*) FILTER (WHERE processed = false) as pending_events
FROM stripe_webhook_events;

-- ============================================
-- STEP 15: Test the subscription update function
-- ============================================

-- Uncomment and modify to test (replace with real email):
-- SELECT update_user_subscription(
--   'test@example.com',  -- customer email
--   'creator',           -- tier
--   'monthly',           -- billing cycle
--   'cus_test123'        -- stripe customer id
-- );

-- ============================================
-- Done!
-- ============================================

SELECT '✅ Database setup complete! Check the verification results above.' as status;
