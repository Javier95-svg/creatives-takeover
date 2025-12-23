-- Update Free tier to 10 credits per month (upgrade from 5)
-- Part of freemium monetization strategy implementation

UPDATE subscription_tiers SET 
  monthly_credits = 10,
  features = '["10 BizMap AI conversations per month", "Community read-only access", "Access to prompt library (view only)", "Basic sprint planning (1 active sprint)", "Funding opportunities (view only)", "Job board (view only)", "Email support"]'::jsonb
WHERE tier_name = 'free';

