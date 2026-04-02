-- Rename subscription tier values: free→rookie, creator→rising, professional→pro
-- Run BEFORE deploying any frontend code that references the new tier names

-- profiles table
UPDATE profiles SET subscription_tier = 'rookie' WHERE subscription_tier = 'free';
UPDATE profiles SET subscription_tier = 'rising' WHERE subscription_tier = 'creator';
UPDATE profiles SET subscription_tier = 'pro'    WHERE subscription_tier = 'professional';

-- subscribers table
UPDATE subscribers SET subscription_tier = 'rookie' WHERE subscription_tier = 'free';
UPDATE subscribers SET subscription_tier = 'rising' WHERE subscription_tier = 'creator';
UPDATE subscribers SET subscription_tier = 'pro'    WHERE subscription_tier = 'professional';

-- user_credits table
UPDATE user_credits SET subscription_tier = 'rookie' WHERE subscription_tier = 'free';
UPDATE user_credits SET subscription_tier = 'rising' WHERE subscription_tier = 'creator';
UPDATE user_credits SET subscription_tier = 'pro'    WHERE subscription_tier = 'professional';

-- subscription_tiers config table (tier_name is the PK — update references first)
-- Insert new rows then delete old ones to avoid FK issues
INSERT INTO subscription_tiers (tier_name, monthly_credits, price_cents, features)
SELECT 'rookie', monthly_credits, price_cents, features FROM subscription_tiers WHERE tier_name = 'free'
ON CONFLICT (tier_name) DO NOTHING;

INSERT INTO subscription_tiers (tier_name, monthly_credits, price_cents, features)
SELECT 'rising', monthly_credits, price_cents, features FROM subscription_tiers WHERE tier_name = 'creator'
ON CONFLICT (tier_name) DO NOTHING;

INSERT INTO subscription_tiers (tier_name, monthly_credits, price_cents, features)
SELECT 'pro', monthly_credits, price_cents, features FROM subscription_tiers WHERE tier_name = 'professional'
ON CONFLICT (tier_name) DO NOTHING;

DELETE FROM subscription_tiers WHERE tier_name IN ('free', 'creator', 'professional', 'basic', 'premium', 'enterprise');
