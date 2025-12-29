-- CORRECT Schema for funding_opportunities table
-- This matches the TypeScript types exactly
-- Run this in Supabase SQL Editor

-- Step 1: Drop existing table
DROP TABLE IF EXISTS public.funding_opportunities CASCADE;

-- Step 2: Create table with correct schema
CREATE TABLE public.funding_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Required fields matching TypeScript FundingOpportunity type
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('grant', 'accelerator', 'contest', 'microfund')),

  -- Optional fields
  funding_amount TEXT,
  location TEXT[] DEFAULT ARRAY[]::TEXT[],
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Status flags
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true
);

-- Step 3: Enable RLS
ALTER TABLE public.funding_opportunities ENABLE ROW LEVEL SECURITY;

-- Step 4: Create read policy
CREATE POLICY "Public users can view active funding opportunities"
  ON public.funding_opportunities
  FOR SELECT
  USING (is_active = true);

-- Step 5: Insert sample accelerators with CORRECT schema
INSERT INTO public.funding_opportunities (
  title,
  description,
  url,
  type,
  funding_amount,
  location,
  keywords,
  is_featured
) VALUES
(
  'Y Combinator',
  'Y Combinator provides seed funding, advice, and connections to startups. YC has funded over 4,000 companies with a combined valuation of over $600B.',
  'https://www.ycombinator.com',
  'accelerator',
  '$500,000',
  ARRAY['Mountain View', 'CA'],
  ARRAY['seed', 'early-stage', 'technology', 'saas', 'hardware', 'biotech'],
  true
),
(
  'Techstars',
  'Techstars is the worldwide network that helps entrepreneurs succeed. We connect entrepreneurs with mentors, investors, talent, and corporate partners.',
  'https://www.techstars.com',
  'accelerator',
  '$120,000',
  ARRAY['Global'],
  ARRAY['seed', 'early-stage', 'technology', 'mentorship', 'global'],
  true
),
(
  '500 Global',
  '500 Global is a venture capital firm with more than $2.7B in assets under management that invests early in founders building fast-growing technology companies.',
  'https://500.co',
  'accelerator',
  '$150,000',
  ARRAY['Global'],
  ARRAY['seed', 'early-stage', 'global', 'technology', 'fintech', 'healthtech'],
  true
),
(
  'Entrepreneur First',
  'Entrepreneur First helps exceptional individuals find co-founders, create startups, and raise investment. We support ambitious people at the beginning of their entrepreneurial journey.',
  'https://www.joinef.com',
  'accelerator',
  '£100,000',
  ARRAY['London', 'Singapore', 'Paris'],
  ARRAY['pre-seed', 'co-founder matching', 'deep tech', 'ai', 'machine learning'],
  false
),
(
  'Antler',
  'Antler is a global early-stage VC enabling and investing in the world''s most exceptional people, building innovative technology companies from day zero.',
  'https://www.antler.co',
  'accelerator',
  '$250,000',
  ARRAY['Global'],
  ARRAY['pre-seed', 'seed', 'global', 'technology', 'co-founder matching'],
  false
);

-- Step 6: Create indexes
CREATE INDEX idx_funding_opportunities_type ON public.funding_opportunities(type);
CREATE INDEX idx_funding_opportunities_is_active ON public.funding_opportunities(is_active);
CREATE INDEX idx_funding_opportunities_is_featured ON public.funding_opportunities(is_featured);
CREATE INDEX idx_funding_opportunities_keywords ON public.funding_opportunities USING GIN(keywords);

-- Step 7: Verify
SELECT id, title, type, location, url, is_active FROM public.funding_opportunities;
