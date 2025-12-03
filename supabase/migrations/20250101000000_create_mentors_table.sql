-- ================================================
-- MENTOR MARKETPLACE - MENTORS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS public.mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  picture TEXT, -- Avatar/profile picture URL
  bio TEXT NOT NULL,
  hourly_rate INTEGER NOT NULL, -- In USD cents (e.g., 10000 = $100.00)
  stripe_connected_account_id TEXT, -- Stripe Connect account ID
  expertise TEXT[] DEFAULT '{}', -- Array of expertise areas/tags
  rating NUMERIC(3,2), -- Average rating (1-5)
  review_count INTEGER DEFAULT 0,
  availability JSONB DEFAULT '[]'::jsonb, -- Array of availability slots
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;

-- Everyone can view active mentors
CREATE POLICY "Anyone can view active mentors"
  ON public.mentors FOR SELECT
  USING (is_active = true);

-- Admin can do everything
CREATE POLICY "Admin can manage all mentors"
  ON public.mentors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'admin@creatives-takeover.com'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mentors_is_active ON public.mentors(is_active);
CREATE INDEX IF NOT EXISTS idx_mentors_is_featured ON public.mentors(is_featured);
CREATE INDEX IF NOT EXISTS idx_mentors_user_id ON public.mentors(user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_mentors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mentors_updated_at
  BEFORE UPDATE ON public.mentors
  FOR EACH ROW
  EXECUTE FUNCTION update_mentors_updated_at();

