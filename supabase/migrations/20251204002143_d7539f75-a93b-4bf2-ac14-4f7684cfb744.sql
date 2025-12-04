-- Create mentors table for the mentor marketplace
CREATE TABLE IF NOT EXISTS public.mentors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  picture TEXT,
  bio TEXT NOT NULL,
  hourly_rate INTEGER NOT NULL DEFAULT 10000,
  stripe_connected_account_id TEXT,
  expertise TEXT[] DEFAULT '{}',
  rating NUMERIC(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  availability JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies
-- Anyone can view active mentors
CREATE POLICY "Anyone can view active mentors"
ON public.mentors
FOR SELECT
USING (is_active = true);

-- Admins can do everything (using email check directly)
CREATE POLICY "Admin full access to mentors"
ON public.mentors
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND LOWER(auth.users.email) = 'admin@creatives-takeover.com'
  )
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_mentors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mentors_updated_at
BEFORE UPDATE ON public.mentors
FOR EACH ROW
EXECUTE FUNCTION public.update_mentors_updated_at();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_mentors_is_active ON public.mentors(is_active);
CREATE INDEX IF NOT EXISTS idx_mentors_is_featured ON public.mentors(is_featured);