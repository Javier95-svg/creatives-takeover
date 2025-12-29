-- STEP 1: Create the table
-- Run each step separately in Supabase SQL Editor

-- Step 1: Create the table structure
CREATE TABLE IF NOT EXISTS public.funding_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('accelerator', 'vc', 'grant', 'competition')),
  location TEXT NOT NULL DEFAULT 'Global',
  funding_amount TEXT,
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  website_url TEXT,
  application_url TEXT,
  logo_url TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb
);
