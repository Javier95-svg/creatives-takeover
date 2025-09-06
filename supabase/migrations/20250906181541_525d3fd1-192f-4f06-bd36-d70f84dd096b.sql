-- Create user_feedback table for collecting product feedback
CREATE TABLE public.user_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID,
  user_id UUID,
  email TEXT,
  acquisition_source TEXT,
  ux_rating INTEGER CHECK (ux_rating >= 1 AND ux_rating <= 5),
  feature_request TEXT,
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  business_challenge TEXT,
  additional_comments TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  conversion_status TEXT DEFAULT 'feedback_only',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can insert feedback" 
ON public.user_feedback 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own feedback" 
ON public.user_feedback 
FOR SELECT 
USING (auth.uid() = user_id OR session_id IS NOT NULL);

-- Create index for better performance
CREATE INDEX idx_user_feedback_session_id ON public.user_feedback(session_id);
CREATE INDEX idx_user_feedback_user_id ON public.user_feedback(user_id);
CREATE INDEX idx_user_feedback_completed_at ON public.user_feedback(completed_at);