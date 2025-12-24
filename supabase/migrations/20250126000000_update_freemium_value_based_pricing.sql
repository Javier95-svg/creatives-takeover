-- Freemium Business Model Redesign - Value-Based Pricing Update
-- Updates subscription tiers with new credit costs and feature usage limits
-- Implements value-based credit system where credits = perceived value to founder

-- Update Free tier: Set monthly credits to 10 and update feature descriptions
UPDATE subscription_tiers SET 
  monthly_credits = 10,
  features = '["10 credits per month", "10 BizMap AI conversations (1 credit each)", "1 Tech Stack generation (3 credits)", "1 Insighta Test assessment (8 credits)", "Product-Market Fit Lab preview", "Investor Matchmaker browse-only", "Community read-only access", "Prompt library (view free prompts only)", "1 active sprint", "Funding opportunities (view only)", "Job board (view only)", "Community forum support"]'::jsonb
WHERE tier_name = 'free';

-- Update Creator tier with new credit costs and limits
UPDATE subscription_tiers SET 
  features = '["50 credits per month", "Unlimited BizMap AI conversations (1 credit each)", "Unlimited Tech Stack generations (3 credits each)", "Full Product-Market Fit Lab access (8 credits each)", "Unlimited Insighta Test assessments (8 credits each)", "Full Investor Matchmaker access (10 credits per match)", "Full community access (post, comment, vote)", "Prompt library with export (2 credits per export)", "Unlimited sprints", "Market intelligence (5 queries/month, 10 credits each)", "Basic collaboration (up to 3 team members)", "Basic reports (3/month, 5 credits each)", "Priority email support (48hr response)"]'::jsonb,
  usage_limits = '{"tech_stack_generations": -1, "insighta_tests": -1, "pmf_analyses": -1, "investor_matches": -1, "market_intelligence_queries": 5, "basic_reports": 3, "team_members": 3}'::jsonb
WHERE tier_name = 'creator';

-- Update Professional tier with new credit costs
UPDATE subscription_tiers SET 
  features = '["150 credits per month", "Unlimited BizMap AI conversations (1 credit each)", "Unlimited Tech Stack generations (3 credits each)", "Full Product-Market Fit Lab access (8 credits each)", "Unlimited Insighta Test assessments (8 credits each)", "Full Investor Matchmaker access (10 credits per match)", "Pitch Deck Generation (12 credits per deck)", "AI-enhanced community features", "Unlimited market intelligence queries", "Unlimited custom reports + PDF export", "Advanced collaboration (unlimited team members)", "Advanced analytics (10 credits per analysis)", "API access", "24hr priority support"]'::jsonb,
  usage_limits = '{"tech_stack_generations": -1, "insighta_tests": -1, "pmf_analyses": -1, "investor_matches": -1, "market_intelligence_queries": -1, "basic_reports": -1, "team_members": -1}'::jsonb
WHERE tier_name = 'professional';

-- Note: Credit costs are defined in application code (src/config/constants.ts and supabase/functions/_shared/credit-constants.ts)
-- This migration updates the feature descriptions and usage limits to match the new value-based pricing model

