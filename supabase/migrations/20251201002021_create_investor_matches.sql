-- ================================================
-- INVESTOR MATCHING ENGINE - INVESTOR MATCHES TABLE
-- Store match results for users
-- ================================================

CREATE TABLE IF NOT EXISTS public.investor_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES public.fundraising_readiness_assessments(id) ON DELETE SET NULL,
  
  -- Match Request Details
  industry TEXT,
  funding_amount INTEGER, -- Amount seeking in USD
  locations TEXT[] DEFAULT '{}',
  business_model TEXT,
  business_stage TEXT,
  business_summary TEXT,
  
  -- Match Results
  matched_investors JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {investor_id, match_score, match_reasons}
  top_matches JSONB, -- Top 3 investor IDs
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_investor_matches_user ON public.investor_matches(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investor_matches_assessment ON public.investor_matches(assessment_id);
CREATE INDEX IF NOT EXISTS idx_investor_matches_status ON public.investor_matches(status) WHERE status = 'active';

-- Enable RLS
ALTER TABLE public.investor_matches ENABLE ROW LEVEL SECURITY;

-- Users can view their own matches
CREATE POLICY "Users can view their own matches"
  ON public.investor_matches FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own matches
CREATE POLICY "Users can create their own matches"
  ON public.investor_matches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own matches
CREATE POLICY "Users can update their own matches"
  ON public.investor_matches FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own matches (soft delete via status)
CREATE POLICY "Users can delete their own matches"
  ON public.investor_matches FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_investor_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_investor_matches_updated_at
BEFORE UPDATE ON public.investor_matches
FOR EACH ROW
EXECUTE FUNCTION public.update_investor_matches_updated_at();

