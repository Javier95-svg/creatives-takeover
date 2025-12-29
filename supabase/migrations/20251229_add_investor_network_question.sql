-- ================================================
-- ADD QUESTION 11: Investor Network & Warm Intros
-- Date: 2025-12-29
-- Purpose: Add investor_network_score column for 11th assessment question
-- ================================================

-- Add investor network score column
ALTER TABLE public.fundraising_readiness_assessments
  ADD COLUMN IF NOT EXISTS investor_network_score INTEGER CHECK (investor_network_score >= 0 AND investor_network_score <= 10);

-- Add comment documenting the new question
COMMENT ON COLUMN public.fundraising_readiness_assessments.investor_network_score IS
  'Question 11: Investor Network & Warm Intros - Assesses founder''s strength of investor network and access to warm introductions. Critical predictor of fundraising success (~80% of raises come from warm intros).';

-- Update table comment to reflect 11 questions
COMMENT ON TABLE public.fundraising_readiness_assessments IS
  'Stores comprehensive fundraising readiness assessments with stage-specific guidance.
   Expanded to 11 questions covering: founder-market fit, MVP, traction, feedback,
   competitive positioning, GTM strategy, unit economics, team, runway, legal readiness,
   and investor network. All new columns are nullable for backwards compatibility.';

-- Verify the migration
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'fundraising_readiness_assessments'
  AND column_name = 'investor_network_score'
  AND table_schema = 'public';
