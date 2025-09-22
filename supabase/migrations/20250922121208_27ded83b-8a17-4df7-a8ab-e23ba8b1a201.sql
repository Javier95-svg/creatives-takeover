-- Update subscription tiers to match actual features and new pricing structure
UPDATE subscription_tiers SET 
  tier_name = 'creator',
  monthly_credits = 50,
  price_cents = 1999,
  features = '["50 BizMap AI conversations per month", "Full community features (posting, commenting, voting)", "Prompt library with copy/export functionality", "Unlimited sprint planning & Kanban boards", "Market intelligence widget access", "Basic collaboration tools (text chat, file sharing)", "Priority email support"]'::jsonb
WHERE tier_name = 'basic';

UPDATE subscription_tiers SET 
  tier_name = 'professional',
  monthly_credits = 150,
  price_cents = 3999,
  features = '["150 BizMap AI conversations per month", "AI-enhanced community features (post insights, trending)", "Custom business report generation", "Advanced collaboration tools (whiteboarding, polls, video calls)", "Success score analytics & tracking", "Priority support + community access", "Export capabilities for all reports"]'::jsonb
WHERE tier_name = 'premium';

UPDATE subscription_tiers SET 
  monthly_credits = 5,
  features = '["5 BizMap AI conversations per month", "Basic community forum access (read & post)", "Access to prompt library (view only)", "Basic sprint planning (1 active sprint)", "Email support"]'::jsonb
WHERE tier_name = 'free';

UPDATE subscription_tiers SET 
  monthly_credits = 500,
  price_cents = 5999,
  features = '["500 BizMap AI conversations per month", "All collaboration features with unlimited participants", "Advanced market intelligence & trend analysis", "Custom AI business analysis reports", "API access for integrations", "Dedicated account manager", "Custom business templates", "Priority feature requests"]'::jsonb
WHERE tier_name = 'enterprise';