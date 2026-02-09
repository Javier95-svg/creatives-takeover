-- ================================================
-- FIND YOUR ANGEL - ANGEL INVESTORS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS public.angel_investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  picture TEXT,
  firm_name TEXT NOT NULL,
  investment_stages TEXT[] DEFAULT '{}',
  website_url TEXT,
  linkedin_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.angel_investors ENABLE ROW LEVEL SECURITY;

-- Anyone can view active angel investors
CREATE POLICY "Anyone can view active angel investors"
  ON public.angel_investors FOR SELECT
  USING (is_active = true);

-- Authenticated users can view all (including inactive)
CREATE POLICY "Authenticated users can view all angel investors"
  ON public.angel_investors FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can create (frontend enforces admin check)
CREATE POLICY "Authenticated users can create angel investors"
  ON public.angel_investors FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update (frontend enforces admin check)
CREATE POLICY "Authenticated users can update angel investors"
  ON public.angel_investors FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can delete (frontend enforces admin check)
CREATE POLICY "Authenticated users can delete angel investors"
  ON public.angel_investors FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_angel_investors_is_active ON public.angel_investors(is_active);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_angel_investors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_angel_investors_updated_at
  BEFORE UPDATE ON public.angel_investors
  FOR EACH ROW
  EXECUTE FUNCTION update_angel_investors_updated_at();
