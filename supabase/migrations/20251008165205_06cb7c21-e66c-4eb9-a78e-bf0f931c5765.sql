-- Phase 1: Database Schema Updates for Community Feedback Integration

-- Create chatbot_shared_reports table
CREATE TABLE IF NOT EXISTS public.chatbot_shared_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES public.chatbot_conversations(id) ON DELETE CASCADE,
  community_post_id UUID REFERENCES public.community_posts(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('conversation', 'business_plan', 'market_analysis', 'financial_plan', 'full_report')),
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_anonymous BOOLEAN DEFAULT false,
  feedback_count INTEGER DEFAULT 0
);

-- Enable RLS on chatbot_shared_reports
ALTER TABLE public.chatbot_shared_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chatbot_shared_reports
CREATE POLICY "Users can create their own shared reports"
  ON public.chatbot_shared_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own shared reports"
  ON public.chatbot_shared_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own shared reports"
  ON public.chatbot_shared_reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shared reports"
  ON public.chatbot_shared_reports FOR DELETE
  USING (auth.uid() = user_id);

-- Add columns to community_posts for chatbot integration
ALTER TABLE public.community_posts 
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual', 'chatbot_report', 'business_plan')),
  ADD COLUMN IF NOT EXISTS source_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS feedback_requested BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedback_category TEXT[] DEFAULT '{}'::text[];

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_community_posts_source_type ON public.community_posts(source_type);
CREATE INDEX IF NOT EXISTS idx_chatbot_shared_reports_user_id ON public.chatbot_shared_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_shared_reports_conversation_id ON public.chatbot_shared_reports(conversation_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_chatbot_shared_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_chatbot_shared_reports_updated_at
  BEFORE UPDATE ON public.chatbot_shared_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chatbot_shared_reports_updated_at();