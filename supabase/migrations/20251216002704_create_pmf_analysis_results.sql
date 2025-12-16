-- ================================================
-- PMF Analysis Results Storage & Tracking
-- ================================================
-- Stores PMF analysis results with user feedback and outcome tracking
-- Enables feedback loops and learning from past analyses

CREATE TABLE IF NOT EXISTS public.pmf_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID,
  
  -- Input data
  business_description TEXT NOT NULL,
  target_market TEXT,
  industry TEXT,
  
  -- Analysis results (full JSON)
  analysis_data JSONB NOT NULL,
  
  -- Key metrics for quick queries
  pmf_score NUMERIC(5,2) CHECK (pmf_score >= 0 AND pmf_score <= 100),
  verdict TEXT CHECK (verdict IN ('Strong Fit', 'Moderate Fit', 'Weak Fit')),
  confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
  
  -- Sub-scores for pattern matching
  demand_score NUMERIC(5,2) CHECK (demand_score >= 0 AND demand_score <= 100),
  differentiation_score NUMERIC(5,2) CHECK (differentiation_score >= 0 AND differentiation_score <= 100),
  timing_score NUMERIC(5,2) CHECK (timing_score >= 0 AND timing_score <= 100),
  execution_risk_score NUMERIC(5,2) CHECK (execution_risk_score >= 0 AND execution_risk_score <= 100),
  
  -- Data sources used
  data_sources JSONB DEFAULT '[]'::jsonb,
  
  -- User feedback
  user_accuracy_rating INTEGER CHECK (user_accuracy_rating BETWEEN 1 AND 5),
  user_feedback_text TEXT,
  feedback_submitted_at TIMESTAMP WITH TIME ZONE,
  
  -- Outcome tracking
  actual_outcome TEXT CHECK (actual_outcome IN ('launched', 'pivoted', 'abandoned', 'funded', 'in_progress', 'unknown')),
  outcome_date TIMESTAMP WITH TIME ZONE,
  outcome_details JSONB, -- Additional outcome data (revenue, customers, funding amount, etc.)
  
  -- Prompt variant tracking (for A/B testing)
  prompt_variant_id TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.pmf_analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own PMF analysis results"
  ON public.pmf_analysis_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own PMF analysis results"
  ON public.pmf_analysis_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own PMF analysis results"
  ON public.pmf_analysis_results FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pmf_analysis_results_user_id ON public.pmf_analysis_results(user_id);
CREATE INDEX IF NOT EXISTS idx_pmf_analysis_results_created_at ON public.pmf_analysis_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pmf_analysis_results_pmf_score ON public.pmf_analysis_results(pmf_score);
CREATE INDEX IF NOT EXISTS idx_pmf_analysis_results_verdict ON public.pmf_analysis_results(verdict);
CREATE INDEX IF NOT EXISTS idx_pmf_analysis_results_industry ON public.pmf_analysis_results(industry) WHERE industry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pmf_analysis_results_outcome ON public.pmf_analysis_results(actual_outcome) WHERE actual_outcome IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pmf_analysis_results_prompt_variant ON public.pmf_analysis_results(prompt_variant_id) WHERE prompt_variant_id IS NOT NULL;

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_pmf_analysis_results_analysis_data ON public.pmf_analysis_results USING GIN (analysis_data);

-- Full-text search index for business descriptions (for similarity matching)
CREATE INDEX IF NOT EXISTS idx_pmf_analysis_results_business_description_fts ON public.pmf_analysis_results USING GIN (to_tsvector('english', business_description));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_pmf_analysis_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pmf_analysis_results_updated_at
    BEFORE UPDATE ON public.pmf_analysis_results
    FOR EACH ROW
    EXECUTE FUNCTION update_pmf_analysis_results_updated_at();

-- ================================================
-- PMF Prompt Variants (for A/B testing)
-- ================================================

CREATE TABLE IF NOT EXISTS public.pmf_prompt_variants (
  id TEXT PRIMARY KEY, -- e.g., 'v1', 'v2', 'v2-enhanced'
  name TEXT NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  -- Performance metrics
  total_analyses INTEGER DEFAULT 0,
  avg_accuracy_rating NUMERIC(3,2),
  avg_pmf_score NUMERIC(5,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default variant
INSERT INTO public.pmf_prompt_variants (id, name, description, is_default)
VALUES ('v1', 'Default PMF Prompt', 'Original PMF analysis prompt', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for prompt variants (read-only for all authenticated users)
ALTER TABLE public.pmf_prompt_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view prompt variants"
  ON public.pmf_prompt_variants FOR SELECT
  USING (auth.role() = 'authenticated');

-- Index for active variants
CREATE INDEX IF NOT EXISTS idx_pmf_prompt_variants_active ON public.pmf_prompt_variants(is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_pmf_prompt_variants_updated_at
    BEFORE UPDATE ON public.pmf_prompt_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_pmf_analysis_results_updated_at();

