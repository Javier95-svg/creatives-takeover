-- ================================================
-- INVESTOR MATCHING ENGINE - INVESTORS TABLE
-- Central database of investors for matching
-- ================================================

CREATE TABLE IF NOT EXISTS public.investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  name TEXT NOT NULL, -- Investor/Partner name
  firm_name TEXT NOT NULL, -- Firm name
  firm_website TEXT,
  linkedin_url TEXT,
  email TEXT, -- Preferred contact email
  
  -- Investment Focus
  investment_thesis TEXT, -- Full thesis description
  industries TEXT[] NOT NULL DEFAULT '{}', -- Array: ['SaaS', 'AI', 'Fintech']
  investment_stages TEXT[] NOT NULL DEFAULT '{}', -- Array: ['pre-seed', 'seed', 'series-a']
  typical_check_size_min INTEGER, -- Minimum check size in USD
  typical_check_size_max INTEGER, -- Maximum check size in USD
  
  -- Geographic Preferences
  geographic_focus TEXT[] NOT NULL DEFAULT '{}', -- Array: ['US', 'Global', 'Europe']
  locations TEXT[] NOT NULL DEFAULT '{}', -- Array: ['San Francisco', 'New York', 'Remote']
  remote_friendly BOOLEAN DEFAULT true,
  
  -- Portfolio & Activity
  portfolio_companies JSONB DEFAULT '[]'::jsonb, -- Array of {name, website, industry, stage}
  recent_investments_count INTEGER DEFAULT 0, -- Last 12 months
  last_investment_date DATE,
  total_portfolio_count INTEGER DEFAULT 0,
  
  -- Contact & Process
  contact_preference TEXT CHECK (contact_preference IN ('email', 'linkedin', 'application', 'warm-intro-only')),
  application_url TEXT, -- Link to application form if applicable
  requires_warm_intro BOOLEAN DEFAULT false,
  response_rate_percentage NUMERIC(5,2), -- Estimated response rate (0-100)
  typical_timeline_days INTEGER, -- Days to first response
  
  -- Metadata
  match_score_boost NUMERIC(5,2) DEFAULT 0, -- Manual boost for featured investors
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  data_source TEXT, -- Where data came from: 'manual', 'crunchbase', 'api'
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_check_size CHECK (typical_check_size_max >= typical_check_size_min OR typical_check_size_max IS NULL)
);

-- Indexes for fast matching
CREATE INDEX IF NOT EXISTS idx_investors_industries ON public.investors USING GIN(industries);
CREATE INDEX IF NOT EXISTS idx_investors_stages ON public.investors USING GIN(investment_stages);
CREATE INDEX IF NOT EXISTS idx_investors_geographic ON public.investors USING GIN(geographic_focus);
CREATE INDEX IF NOT EXISTS idx_investors_active ON public.investors(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_investors_featured ON public.investors(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_investors_created ON public.investors(created_at DESC);

-- Enable RLS
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;

-- Anyone can view active investors (for matching)
CREATE POLICY "Anyone can view active investors"
  ON public.investors FOR SELECT
  USING (is_active = true);

-- Only admins can insert investors
CREATE POLICY "Admins can insert investors"
  ON public.investors FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );

-- Only admins can update investors
CREATE POLICY "Admins can update investors"
  ON public.investors FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin')
  );

-- Only admins can delete investors
CREATE POLICY "Admins can delete investors"
  ON public.investors FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin')
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_investors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_investors_updated_at
BEFORE UPDATE ON public.investors
FOR EACH ROW
EXECUTE FUNCTION public.update_investors_updated_at();

