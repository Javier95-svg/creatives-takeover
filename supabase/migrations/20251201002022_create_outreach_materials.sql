-- ================================================
-- INVESTOR MATCHING ENGINE - OUTREACH MATERIALS TABLE
-- Store generated outreach materials (pitch decks, emails, one-pagers)
-- ================================================

CREATE TABLE IF NOT EXISTS public.outreach_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investor_id UUID REFERENCES public.investors(id) ON DELETE SET NULL,
  match_id UUID REFERENCES public.investor_matches(id) ON DELETE SET NULL,
  
  -- Material Type
  material_type TEXT NOT NULL CHECK (material_type IN ('pitch_deck', 'cold_email', 'one_pager', 'follow_up')),
  
  -- Content
  subject TEXT, -- For emails
  content TEXT NOT NULL, -- Main content (markdown or HTML)
  content_json JSONB, -- Structured content (for decks with slides)
  
  -- Metadata
  version INTEGER DEFAULT 1,
  is_template BOOLEAN DEFAULT false,
  is_final BOOLEAN DEFAULT false,
  
  -- Usage Tracking
  times_exported INTEGER DEFAULT 0,
  last_exported_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outreach_materials_user ON public.outreach_materials(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_materials_investor ON public.outreach_materials(investor_id);
CREATE INDEX IF NOT EXISTS idx_outreach_materials_match ON public.outreach_materials(match_id);
CREATE INDEX IF NOT EXISTS idx_outreach_materials_type ON public.outreach_materials(material_type);

-- Enable RLS
ALTER TABLE public.outreach_materials ENABLE ROW LEVEL SECURITY;

-- Users can view their own materials
CREATE POLICY "Users can view their own materials"
  ON public.outreach_materials FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own materials
CREATE POLICY "Users can create their own materials"
  ON public.outreach_materials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own materials
CREATE POLICY "Users can update their own materials"
  ON public.outreach_materials FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own materials
CREATE POLICY "Users can delete their own materials"
  ON public.outreach_materials FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_outreach_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_outreach_materials_updated_at
BEFORE UPDATE ON public.outreach_materials
FOR EACH ROW
EXECUTE FUNCTION public.update_outreach_materials_updated_at();

