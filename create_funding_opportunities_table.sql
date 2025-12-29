-- Create funding_opportunities table for accelerators and VCs
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/rcjlaybjnozqbsoxzboa/sql

CREATE TABLE IF NOT EXISTS public.funding_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Basic Info
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('accelerator', 'vc', 'grant', 'competition')),

  -- Details
  location TEXT NOT NULL DEFAULT 'Global',
  funding_amount TEXT,
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  website_url TEXT,
  application_url TEXT,

  -- Images
  logo_url TEXT,
  image_url TEXT,

  -- Status & Featured
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_funding_opportunities_type ON public.funding_opportunities(type);
CREATE INDEX IF NOT EXISTS idx_funding_opportunities_is_active ON public.funding_opportunities(is_active);
CREATE INDEX IF NOT EXISTS idx_funding_opportunities_is_featured ON public.funding_opportunities(is_featured);
CREATE INDEX IF NOT EXISTS idx_funding_opportunities_created_at ON public.funding_opportunities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funding_opportunities_keywords ON public.funding_opportunities USING GIN(keywords);

-- Enable RLS
ALTER TABLE public.funding_opportunities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public users can view active funding opportunities" ON public.funding_opportunities;
DROP POLICY IF EXISTS "Admins can insert funding opportunities" ON public.funding_opportunities;
DROP POLICY IF EXISTS "Admins can update funding opportunities" ON public.funding_opportunities;
DROP POLICY IF EXISTS "Admins can delete funding opportunities" ON public.funding_opportunities;

-- Create policies for read access (public can read active opportunities)
CREATE POLICY "Public users can view active funding opportunities"
  ON public.funding_opportunities
  FOR SELECT
  USING (is_active = true);

-- Create policies for admin write access (authenticated users with admin role)
CREATE POLICY "Admins can insert funding opportunities"
  ON public.funding_opportunities
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update funding opportunities"
  ON public.funding_opportunities
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete funding opportunities"
  ON public.funding_opportunities
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert sample accelerators
INSERT INTO public.funding_opportunities (title, description, type, location, funding_amount, keywords, website_url, application_url, is_featured, logo_url) VALUES
  (
    'Y Combinator',
    'Y Combinator provides seed funding, advice, and connections to startups. YC has funded over 4,000 companies with a combined valuation of over $600B.',
    'accelerator',
    'Mountain View, CA',
    '$500,000',
    ARRAY['seed', 'early-stage', 'technology', 'saas', 'hardware', 'biotech'],
    'https://www.ycombinator.com',
    'https://www.ycombinator.com/apply',
    true,
    'https://www.ycombinator.com/assets/ycdc/yc-logo-v2-0-9ca0e0f2c86445f30d61b23f8ae7ed7f0e7c74824b2f6b9e0e0b9f6d7f6a7b8c.png'
  ),
  (
    'Techstars',
    'Techstars is the worldwide network that helps entrepreneurs succeed. We connect entrepreneurs with mentors, investors, talent, and corporate partners.',
    'accelerator',
    'Global',
    '$120,000',
    ARRAY['seed', 'early-stage', 'technology', 'mentorship', 'global'],
    'https://www.techstars.com',
    'https://www.techstars.com/apply',
    true,
    NULL
  ),
  (
    '500 Global',
    '500 Global is a venture capital firm with more than $2.7B in assets under management that invests early in founders building fast-growing technology companies.',
    'accelerator',
    'Global',
    '$150,000',
    ARRAY['seed', 'early-stage', 'global', 'technology', 'fintech', 'healthtech'],
    'https://500.co',
    'https://500.co/accelerator',
    true,
    NULL
  ),
  (
    'Entrepreneur First',
    'Entrepreneur First helps exceptional individuals find co-founders, create startups, and raise investment. We support ambitious people at the beginning of their entrepreneurial journey.',
    'accelerator',
    'London, Singapore, Paris',
    '£100,000',
    ARRAY['pre-seed', 'co-founder matching', 'deep tech', 'ai', 'machine learning'],
    'https://www.joinef.com',
    'https://www.joinef.com/apply',
    false,
    NULL
  ),
  (
    'Antler',
    'Antler is a global early-stage VC enabling and investing in the world''s most exceptional people, building innovative technology companies from day zero.',
    'accelerator',
    'Global',
    '$250,000',
    ARRAY['pre-seed', 'seed', 'global', 'technology', 'co-founder matching'],
    'https://www.antler.co',
    'https://www.antler.co/apply',
    false,
    NULL
  )
ON CONFLICT DO NOTHING;

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_funding_opportunities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_funding_opportunities_updated_at_trigger ON public.funding_opportunities;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_funding_opportunities_updated_at_trigger
  BEFORE UPDATE ON public.funding_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_funding_opportunities_updated_at();
