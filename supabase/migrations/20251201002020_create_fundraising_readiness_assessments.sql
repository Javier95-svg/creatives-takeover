-- ================================================
-- INVESTOR MATCHING ENGINE - FUNDRAISING READINESS ASSESSMENTS TABLE
-- Store readiness assessments for linking to matches
-- ================================================

CREATE TABLE IF NOT EXISTS public.fundraising_readiness_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Scores (0-10)
  mvp_score INTEGER NOT NULL CHECK (mvp_score >= 0 AND mvp_score <= 10),
  feedback_score INTEGER NOT NULL CHECK (feedback_score >= 0 AND feedback_score <= 10),
  team_score INTEGER NOT NULL CHECK (team_score >= 0 AND team_score <= 10),
  runway_score INTEGER NOT NULL CHECK (runway_score >= 0 AND runway_score <= 10),
  average_score NUMERIC(5,2) NOT NULL,
  
  -- AI Analysis
  verdict TEXT NOT NULL CHECK (verdict IN ('Ready', 'Not Ready', 'Almost Ready')),
  analysis_data JSONB NOT NULL, -- Full AI analysis response
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assessments_user ON public.fundraising_readiness_assessments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessments_created ON public.fundraising_readiness_assessments(created_at DESC);

-- Enable RLS
ALTER TABLE public.fundraising_readiness_assessments ENABLE ROW LEVEL SECURITY;

-- Users can view their own assessments
CREATE POLICY "Users can view their own assessments"
  ON public.fundraising_readiness_assessments FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own assessments
CREATE POLICY "Users can create their own assessments"
  ON public.fundraising_readiness_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own assessments (if needed)
CREATE POLICY "Users can update their own assessments"
  ON public.fundraising_readiness_assessments FOR UPDATE
  USING (auth.uid() = user_id);

