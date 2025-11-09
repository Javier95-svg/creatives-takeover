-- ================================================
-- SIMPLIFIED FUNDING OPPORTUNITIES TABLE
-- Simple, user-friendly funding board
-- ================================================

-- Create funding_opportunities table (simplified)
CREATE TABLE IF NOT EXISTS public.funding_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('grant', 'accelerator', 'contest', 'microfund')),
  funding_amount TEXT, -- Simple text like "$500,000" or "€100,000 - €500,000"
  location TEXT[] NOT NULL DEFAULT '{}',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.funding_opportunities ENABLE ROW LEVEL SECURITY;

-- Simple policy: Anyone can view active opportunities (no login required)
CREATE POLICY "Anyone can view active funding opportunities" 
ON public.funding_opportunities 
FOR SELECT 
USING (is_active = true);

-- Simple policy: Only admins can insert (for curation)
CREATE POLICY "Admins can insert funding opportunities" 
ON public.funding_opportunities 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Simple policy: Only admins can update (for curation)
CREATE POLICY "Admins can update funding opportunities" 
ON public.funding_opportunities 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Simple policy: Only admins can delete (for curation)
CREATE POLICY "Admins can delete funding opportunities" 
ON public.funding_opportunities 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Essential indexes for fast filtering
CREATE INDEX idx_funding_type ON public.funding_opportunities(type);
CREATE INDEX idx_funding_active ON public.funding_opportunities(is_active);
CREATE INDEX idx_funding_featured ON public.funding_opportunities(is_featured);
CREATE INDEX idx_funding_location ON public.funding_opportunities USING GIN(location);
CREATE INDEX idx_funding_keywords ON public.funding_opportunities USING GIN(keywords);
CREATE INDEX idx_funding_created ON public.funding_opportunities(created_at DESC);

-- Auto-update timestamp
CREATE TRIGGER update_funding_opportunities_updated_at
BEFORE UPDATE ON public.funding_opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

