-- ================================================
-- FIX FUNDRAISING READINESS ASSESSMENTS SCHEMA
-- Ensures all 10-question columns exist and are properly configured
-- Creates the table if it doesn't exist
-- ================================================

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.fundraising_readiness_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Old scores (0-10) - nullable for backward compatibility
  mvp_score INTEGER CHECK (mvp_score >= 0 AND mvp_score <= 10),
  feedback_score INTEGER CHECK (feedback_score >= 0 AND feedback_score <= 10),
  team_score INTEGER CHECK (team_score >= 0 AND team_score <= 10),
  runway_score INTEGER CHECK (runway_score >= 0 AND runway_score <= 10),
  
  -- New 10-question scores (0-10)
  team_complementary_score INTEGER CHECK (team_complementary_score >= 0 AND team_complementary_score <= 10),
  team_experience_score INTEGER CHECK (team_experience_score >= 0 AND team_experience_score <= 10),
  traction_revenue_score INTEGER CHECK (traction_revenue_score >= 0 AND traction_revenue_score <= 10),
  milestone_achieved_score INTEGER CHECK (milestone_achieved_score >= 0 AND milestone_achieved_score <= 10),
  mvp_working_score INTEGER CHECK (mvp_working_score >= 0 AND mvp_working_score <= 10),
  product_live_score INTEGER CHECK (product_live_score >= 0 AND product_live_score <= 10),
  market_size_score INTEGER CHECK (market_size_score >= 0 AND market_size_score <= 10),
  demand_validated_score INTEGER CHECK (demand_validated_score >= 0 AND demand_validated_score <= 10),
  pitch_deck_score INTEGER CHECK (pitch_deck_score >= 0 AND pitch_deck_score <= 10),
  funding_defined_score INTEGER CHECK (funding_defined_score >= 0 AND funding_defined_score <= 10),
  
  -- Analysis data
  average_score NUMERIC(5,2) NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('Ready', 'Not Ready', 'Almost Ready')),
  analysis_data JSONB NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_assessments_user ON public.fundraising_readiness_assessments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessments_created ON public.fundraising_readiness_assessments(created_at DESC);

-- Enable RLS
ALTER TABLE public.fundraising_readiness_assessments ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
  -- Users can view their own assessments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'fundraising_readiness_assessments' 
    AND policyname = 'Users can view their own assessments'
  ) THEN
    CREATE POLICY "Users can view their own assessments"
      ON public.fundraising_readiness_assessments FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  -- Users can create their own assessments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'fundraising_readiness_assessments' 
    AND policyname = 'Users can create their own assessments'
  ) THEN
    CREATE POLICY "Users can create their own assessments"
      ON public.fundraising_readiness_assessments FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Users can update their own assessments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'fundraising_readiness_assessments' 
    AND policyname = 'Users can update their own assessments'
  ) THEN
    CREATE POLICY "Users can update their own assessments"
      ON public.fundraising_readiness_assessments FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Ensure new score columns exist (add if missing - for existing tables that were created before this migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fundraising_readiness_assessments') THEN
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
  END IF;
END $$;

-- Make old columns nullable if they exist (for backward compatibility with existing tables)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fundraising_readiness_assessments' AND column_name = 'mvp_score' AND is_nullable = 'NO') THEN
    ALTER TABLE public.fundraising_readiness_assessments ALTER COLUMN mvp_score DROP NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fundraising_readiness_assessments' AND column_name = 'feedback_score' AND is_nullable = 'NO') THEN
    ALTER TABLE public.fundraising_readiness_assessments ALTER COLUMN feedback_score DROP NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fundraising_readiness_assessments' AND column_name = 'team_score' AND is_nullable = 'NO') THEN
    ALTER TABLE public.fundraising_readiness_assessments ALTER COLUMN team_score DROP NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fundraising_readiness_assessments' AND column_name = 'runway_score' AND is_nullable = 'NO') THEN
    ALTER TABLE public.fundraising_readiness_assessments ALTER COLUMN runway_score DROP NOT NULL;
  END IF;
END $$;

