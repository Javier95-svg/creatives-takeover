-- ================================================
-- SIMPLE BOOKMARKS (OPTIONAL - ONLY FOR LOGGED IN USERS)
-- ================================================

CREATE TABLE IF NOT EXISTS public.user_funding_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  funding_opportunity_id UUID NOT NULL REFERENCES public.funding_opportunities(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, funding_opportunity_id)
);

-- Enable RLS
ALTER TABLE public.user_funding_bookmarks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own bookmarks
CREATE POLICY "Users can manage their own bookmarks" 
ON public.user_funding_bookmarks 
FOR ALL 
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_bookmarks_user ON public.user_funding_bookmarks(user_id);
CREATE INDEX idx_bookmarks_opportunity ON public.user_funding_bookmarks(funding_opportunity_id);

