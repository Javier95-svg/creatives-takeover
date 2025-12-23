-- ================================================
-- UPDATE FUNDRAISING READINESS ASSESSMENTS TO SUPPORT 10 QUESTIONS
-- Adds new columns for the 10-question assessment while maintaining backward compatibility
-- ================================================

-- Add new score columns for the 10-question assessment
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

-- Make old columns nullable to support backward compatibility
ALTER TABLE public.fundraising_readiness_assessments
  ALTER COLUMN mvp_score DROP NOT NULL,
  ALTER COLUMN feedback_score DROP NOT NULL,
  ALTER COLUMN team_score DROP NOT NULL,
  ALTER COLUMN runway_score DROP NOT NULL;

-- Create a check constraint to ensure either old format or new format is used
-- (At least one set of scores must be present)
-- Note: This is handled at application level, but we keep old columns for backward compatibility

COMMENT ON COLUMN public.fundraising_readiness_assessments.team_complementary_score IS 'Score (0-10) for founding team with complementary skills';
COMMENT ON COLUMN public.fundraising_readiness_assessments.team_experience_score IS 'Score (0-10) for previous startup/product experience';
COMMENT ON COLUMN public.fundraising_readiness_assessments.traction_revenue_score IS 'Score (0-10) for revenue or user traction';
COMMENT ON COLUMN public.fundraising_readiness_assessments.milestone_achieved_score IS 'Score (0-10) for key growth milestones achieved';
COMMENT ON COLUMN public.fundraising_readiness_assessments.mvp_working_score IS 'Score (0-10) for working MVP or prototype';
COMMENT ON COLUMN public.fundraising_readiness_assessments.product_live_score IS 'Score (0-10) for product live and in use';
COMMENT ON COLUMN public.fundraising_readiness_assessments.market_size_score IS 'Score (0-10) for large and growing market';
COMMENT ON COLUMN public.fundraising_readiness_assessments.demand_validated_score IS 'Score (0-10) for validated customer demand';
COMMENT ON COLUMN public.fundraising_readiness_assessments.pitch_deck_score IS 'Score (0-10) for completed pitch deck';
COMMENT ON COLUMN public.fundraising_readiness_assessments.funding_defined_score IS 'Score (0-10) for defined funding amount and use';

