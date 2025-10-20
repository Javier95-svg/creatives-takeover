-- Create page_analytics table for comprehensive visitor tracking
CREATE TABLE IF NOT EXISTS public.page_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  page_title TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'scroll', 'click', 'exit_intent', 'time_on_page')),
  event_data JSONB DEFAULT '{}',
  referrer TEXT,
  user_agent TEXT,
  time_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_page_analytics_session ON public.page_analytics(session_id);
CREATE INDEX idx_page_analytics_user ON public.page_analytics(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_page_analytics_event_type ON public.page_analytics(event_type);
CREATE INDEX idx_page_analytics_page_path ON public.page_analytics(page_path);
CREATE INDEX idx_page_analytics_created_at ON public.page_analytics(created_at DESC);

-- Enable RLS
ALTER TABLE public.page_analytics ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert analytics (for anonymous tracking)
CREATE POLICY "Anyone can insert analytics"
  ON public.page_analytics
  FOR INSERT
  WITH CHECK (true);

-- Service role can read all analytics
CREATE POLICY "Service role can read analytics"
  ON public.page_analytics
  FOR SELECT
  USING (auth.role() = 'service_role');