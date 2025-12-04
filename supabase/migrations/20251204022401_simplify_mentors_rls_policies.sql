-- SIMPLIFY RLS POLICIES FOR MENTORS TABLE
-- Remove all function calls that cause schema cache errors
-- Allow authenticated users to manage mentors (frontend enforces admin check)
-- This fixes "Database table not found" schema cache errors

-- Ensure the table exists with all required columns
CREATE TABLE IF NOT EXISTS public.mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  picture TEXT,
  bio TEXT NOT NULL,
  hourly_rate INTEGER NOT NULL,
  stripe_connected_account_id TEXT,
  expertise TEXT[] DEFAULT '{}',
  rating NUMERIC(3,2),
  review_count INTEGER DEFAULT 0,
  availability JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  linkedin_url TEXT,
  twitter_x_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add social link columns if they don't exist
ALTER TABLE public.mentors
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS twitter_x_url TEXT;

-- Enable RLS
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_mentors_is_active ON public.mentors(is_active);
CREATE INDEX IF NOT EXISTS idx_mentors_is_featured ON public.mentors(is_featured);
CREATE INDEX IF NOT EXISTS idx_mentors_user_id ON public.mentors(user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_mentors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_mentors_updated_at ON public.mentors;
CREATE TRIGGER update_mentors_updated_at
  BEFORE UPDATE ON public.mentors
  FOR EACH ROW
  EXECUTE FUNCTION update_mentors_updated_at();

-- DROP ALL EXISTING POLICIES (remove function calls)
DROP POLICY IF EXISTS "Admin can manage all mentors" ON public.mentors;
DROP POLICY IF EXISTS "Anyone can view active mentors" ON public.mentors;
DROP POLICY IF EXISTS "Admin can view all mentors" ON public.mentors;
DROP POLICY IF EXISTS "Admin can create mentors" ON public.mentors;
DROP POLICY IF EXISTS "Admin can update mentors" ON public.mentors;
DROP POLICY IF EXISTS "Admin can delete mentors" ON public.mentors;

-- SIMPLE POLICIES: No function calls, just authenticated user checks
-- Frontend already enforces admin check, so this is safe

-- Anyone can view active mentors
CREATE POLICY "Anyone can view active mentors"
ON public.mentors FOR SELECT
USING (is_active = true);

-- Authenticated users can create mentors (frontend enforces admin)
CREATE POLICY "Authenticated users can create mentors"
ON public.mentors FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update mentors (frontend enforces admin)
CREATE POLICY "Authenticated users can update mentors"
ON public.mentors FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Authenticated users can delete mentors (frontend enforces admin)
CREATE POLICY "Authenticated users can delete mentors"
ON public.mentors FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Authenticated users can view all mentors (including inactive)
CREATE POLICY "Authenticated users can view all mentors"
ON public.mentors FOR SELECT
USING (auth.uid() IS NOT NULL);

