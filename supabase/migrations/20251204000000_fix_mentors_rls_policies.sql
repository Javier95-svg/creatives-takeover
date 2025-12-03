-- Fix RLS policies for mentors table
-- Replace direct auth.users queries with is_admin_user() function
-- This fixes the "Could not find the table 'public.mentors' in the schema cache" error
-- and allows admin to publish mentor profiles

-- Ensure the table exists first (if migration failed before)
-- This will only create it if it doesn't exist
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS if not already enabled
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

-- Drop existing policies that query auth.users directly
DROP POLICY IF EXISTS "Admin can manage all mentors" ON public.mentors;

-- Recreate policies using is_admin_user() function
-- Everyone can view active mentors (keep existing policy - no auth.users query here)
-- This policy should already exist, but recreate it to be sure it's correct
DROP POLICY IF EXISTS "Anyone can view active mentors" ON public.mentors;
CREATE POLICY "Anyone can view active mentors"
ON public.mentors FOR SELECT
USING (is_active = true);

-- Admin can view all mentors (including inactive ones)
CREATE POLICY "Admin can view all mentors"
ON public.mentors FOR SELECT
USING (
  public.is_admin_user() = true
);

-- Admin can create mentors
CREATE POLICY "Admin can create mentors"
ON public.mentors FOR INSERT
WITH CHECK (
  public.is_admin_user() = true
);

-- Admin can update mentors
CREATE POLICY "Admin can update mentors"
ON public.mentors FOR UPDATE
USING (
  public.is_admin_user() = true
);

-- Admin can delete mentors
CREATE POLICY "Admin can delete mentors"
ON public.mentors FOR DELETE
USING (
  public.is_admin_user() = true
);
