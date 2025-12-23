-- ================================================
-- FIX FUNDRAISING READINESS ASSESSMENTS SCHEMA
-- Ensures all 10-question columns exist and are properly configured
-- ================================================

-- Ensure new score columns exist (add if missing)
ALTER TABLE public.fundraising_readiness_assessments
  ADD COLUMN IF NOT EXISTS team_complementary_score INTEGER CHECK (team_complementary_score >= 0 AND team_complementary_score <= 10),
  ADD COLUMN IF NOT EXISTS team_experience_score INTEGER CHECK (team_experience_score >= 0 AND team_experience_score <= 10),
  ADD COLUMN IF NOT EXISTS traction_revenue_score INTEGER CHECK (traction_revenue_score >= 0 AND traction_revenue_score <= 10),
  ADD COLUMN IF NOT EXISTS milestone_achieved_score INTEGER CHECK (milestone_achieved_score >= 0 AND milestone_achieved_score <= 10),
  ADD COLUMN IF NOT EXISTS mvp_working_score INTEGER CHECK (mvp_working_score >= 0 AND mvp_working_score <= 10),
  ADD COLUMN IF NOT EXISTS product_live_score INTEGER CHECK (product_live_score >= 0 AND product_live_score <= 10),
  ADD COLUMN IF NOT EXISTS market_size_score INTEGER CHECK (market_size_score >= 0 AND market_size_score <= 10),
  ADD COLUMN IF NOT EXISTS demand_validated_score INTEGER CHECK (demand_validated_score >= 0 AND demand_validated_score <= 10),
  ADD COLUMN IF NOT EXISTS pitch_deck_score INTEGER CHECK (pitch_deck_score >= 0 AND pitch_deck_score <= 10),
  ADD COLUMN IF NOT EXISTS funding_defined_score INTEGER CHECK (funding_defined_score >= 0 AND funding_defined_score <= 10);

-- Make old columns nullable if they exist (for backward compatibility)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fundraising_readiness_assessments' AND column_name = 'mvp_score') THEN
    ALTER TABLE public.fundraising_readiness_assessments ALTER COLUMN mvp_score DROP NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fundraising_readiness_assessments' AND column_name = 'feedback_score') THEN
    ALTER TABLE public.fundraising_readiness_assessments ALTER COLUMN feedback_score DROP NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fundraising_readiness_assessments' AND column_name = 'team_score') THEN
    ALTER TABLE public.fundraising_readiness_assessments ALTER COLUMN team_score DROP NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fundraising_readiness_assessments' AND column_name = 'runway_score') THEN
    ALTER TABLE public.fundraising_readiness_assessments ALTER COLUMN runway_score DROP NOT NULL;
  END IF;
END $$;

