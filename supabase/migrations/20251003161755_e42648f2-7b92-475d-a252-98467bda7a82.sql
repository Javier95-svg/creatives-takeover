-- Create chatbot_feedback table for collecting user feedback
CREATE TABLE IF NOT EXISTS public.chatbot_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('mid_conversation', 'section_completion', 'exit_intent')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  section TEXT,
  business_context JSONB DEFAULT '{}'::jsonb,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chatbot_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own feedback"
  ON public.chatbot_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own feedback"
  ON public.chatbot_feedback
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Create index for faster queries
CREATE INDEX idx_chatbot_feedback_session ON public.chatbot_feedback(session_id);
CREATE INDEX idx_chatbot_feedback_user ON public.chatbot_feedback(user_id);
CREATE INDEX idx_chatbot_feedback_type ON public.chatbot_feedback(feedback_type);