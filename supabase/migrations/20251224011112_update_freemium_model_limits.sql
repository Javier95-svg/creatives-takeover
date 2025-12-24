-- Freemium Business Model Redesign Migration
-- Updates subscription tiers with new credit allocations and feature usage limits
-- Part of freemium monetization strategy implementation

-- Ensure Free tier has 10 credits (upgrade from 5)
UPDATE subscription_tiers SET 
  monthly_credits = 10,
  features = '["10 credits per month", "10 BizMap AI conversations (1 credit each)", "1 Tech Stack generation (3 credits)", "1 Insighta Test assessment (8 credits)", "Product-Market Fit Lab preview", "Investor Matchmaker browse-only", "Community read-only access", "Prompt library (view free prompts only)", "1 active sprint", "Funding opportunities (view only)", "Job board (view only)", "Community forum support"]'::jsonb,
  usage_limits = '{"tech_stack_generations": 1, "insighta_tests": 1, "pmf_analyses": 0, "investor_matches": 0, "market_intelligence_queries": 0, "basic_reports": 0, "team_members": 0}'::jsonb
WHERE tier_name = 'free';

-- Update Creator tier with new limits
UPDATE subscription_tiers SET 
  monthly_credits = 50,
  features = '["50 credits per month", "Unlimited BizMap AI conversations (1 credit each)", "Unlimited Tech Stack generations (3 credits each)", "Full Product-Market Fit Lab access (8 credits each)", "Unlimited Insighta Test assessments (8 credits each)", "Full Investor Matchmaker access (5 credits per match)", "Full community access (post, comment, vote)", "Prompt library with export (3 credits per export)", "Unlimited sprints", "Market intelligence (10 queries/month, 10 credits each)", "Basic collaboration (up to 3 team members)", "Basic reports (5/month, 5 credits each)", "Priority email support (48hr response)"]'::jsonb,
  usage_limits = '{"tech_stack_generations": -1, "insighta_tests": -1, "pmf_analyses": -1, "investor_matches": -1, "market_intelligence_queries": 10, "basic_reports": 5, "team_members": 3}'::jsonb
WHERE tier_name = 'creator';

-- Update Professional tier with unlimited access
UPDATE subscription_tiers SET 
  monthly_credits = 150,
  features = '["150 credits per month", "Unlimited BizMap AI conversations (1 credit each)", "Unlimited Tech Stack generations (3 credits each)", "Full Product-Market Fit Lab access (8 credits each)", "Unlimited Insighta Test assessments (8 credits each)", "Full Investor Matchmaker access (5 credits per match)", "AI-enhanced community features", "Unlimited market intelligence queries", "Unlimited custom reports + PDF export", "Advanced collaboration (unlimited team members)", "Success score analytics", "API access", "24hr priority support"]'::jsonb,
  usage_limits = '{"tech_stack_generations": -1, "insighta_tests": -1, "pmf_analyses": -1, "investor_matches": -1, "market_intelligence_queries": -1, "basic_reports": -1, "team_members": -1}'::jsonb
WHERE tier_name = 'professional';

-- Ensure usage_limits column exists
ALTER TABLE public.subscription_tiers 
ADD COLUMN IF NOT EXISTS usage_limits JSONB DEFAULT '{}'::jsonb;

-- Update grant_monthly_credits function to default to 10 credits for free tier
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
      tier_credits := 10; -- Default to free tier (10 credits)
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

