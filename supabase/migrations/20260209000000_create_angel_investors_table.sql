-- ================================================
-- FIND YOUR ANGEL - ANGEL INVESTORS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS public.angel_investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  picture TEXT, -- Profile picture URL
  firm_name TEXT NOT NULL, -- Venture Capital Firm name
  investment_stage TEXT NOT NULL DEFAULT 'Seed', -- e.g. "Pre-Seed", "Seed", "Series A", "Series B"
  website_url TEXT, -- Firm or personal website
  linkedin_url TEXT, -- LinkedIn profile URL
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.angel_investors ENABLE ROW LEVEL SECURITY;

-- Everyone can view active angel investors
CREATE POLICY "Anyone can view active angel investors"
  ON public.angel_investors FOR SELECT
  USING (is_active = true);

-- Admin can do everything
CREATE POLICY "Admin can manage all angel investors"
  ON public.angel_investors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'admin@creatives-takeover.com'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_angel_investors_is_active ON public.angel_investors(is_active);
CREATE INDEX IF NOT EXISTS idx_angel_investors_investment_stage ON public.angel_investors(investment_stage);

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

-- ================================================
-- SAMPLE ANGEL INVESTOR
-- ================================================
INSERT INTO public.angel_investors (name, firm_name, investment_stage, website_url, linkedin_url, is_active)
VALUES (
  'Marc Andreessen',
  'Andreessen Horowitz (a16z)',
  'Seed',
  'https://a16z.com',
  'https://linkedin.com/in/pmarca',
  true
);
