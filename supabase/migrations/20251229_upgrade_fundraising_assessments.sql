-- Migration: Upgrade fundraising readiness assessments for comprehensive stage-specific guidance
-- Date: 2025-12-29
-- Purpose: Add 6 new question scores + 7 context fields to support expanded assessment

-- Add 6 new question score columns
ALTER TABLE public.fundraising_readiness_assessments
  ADD COLUMN IF NOT EXISTS traction_score INTEGER CHECK (traction_score >= 0 AND traction_score <= 10),
  ADD COLUMN IF NOT EXISTS gtm_strategy_score INTEGER CHECK (gtm_strategy_score >= 0 AND gtm_strategy_score <= 10),
  ADD COLUMN IF NOT EXISTS competitive_positioning_score INTEGER CHECK (competitive_positioning_score >= 0 AND competitive_positioning_score <= 10),
  ADD COLUMN IF NOT EXISTS unit_economics_score INTEGER CHECK (unit_economics_score >= 0 AND unit_economics_score <= 10),
  ADD COLUMN IF NOT EXISTS founder_market_fit_score INTEGER CHECK (founder_market_fit_score >= 0 AND founder_market_fit_score <= 10),
  ADD COLUMN IF NOT EXISTS legal_readiness_score INTEGER CHECK (legal_readiness_score >= 0 AND legal_readiness_score <= 10);

-- Add context fields for personalized insights
ALTER TABLE public.fundraising_readiness_assessments
  ADD COLUMN IF NOT EXISTS founder_stage TEXT CHECK (founder_stage IN ('ideation', 'validation', 'building', 'launching', 'scaling')),
  ADD COLUMN IF NOT EXISTS founder_experience TEXT CHECK (founder_experience IN ('first-time', 'second-time', 'experienced')),
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS business_model TEXT,
  ADD COLUMN IF NOT EXISTS primary_location TEXT,
  ADD COLUMN IF NOT EXISTS funding_amount_needed NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS pitch_summary TEXT;

-- Add computed field for investor readiness threshold
ALTER TABLE public.fundraising_readiness_assessments
  ADD COLUMN IF NOT EXISTS meets_investor_threshold BOOLEAN DEFAULT false;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_assessments_stage
  ON public.fundraising_readiness_assessments(founder_stage, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessments_ready
  ON public.fundraising_readiness_assessments(meets_investor_threshold, created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE public.fundraising_readiness_assessments IS
  'Stores comprehensive fundraising readiness assessments with stage-specific guidance.
   Expanded from 4 to 10 questions to cover: founder-market fit, MVP, traction, feedback,
   competitive positioning, GTM strategy, unit economics, team, runway, and legal readiness.
   All new columns are nullable for backwards compatibility with existing 4-question assessments.';
