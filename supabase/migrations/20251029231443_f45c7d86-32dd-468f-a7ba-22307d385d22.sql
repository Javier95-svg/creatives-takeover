-- Create page_feedback table for floating widget feedback
CREATE TABLE public.page_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  page_path TEXT NOT NULL,
  page_title TEXT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'improvement', 'other')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  message TEXT NOT NULL,
  browser_info JSONB DEFAULT '{}'::jsonb,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  admin_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for page_feedback
CREATE POLICY "Anyone can submit feedback"
  ON public.page_feedback
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own feedback"
  ON public.page_feedback
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all feedback"
  ON public.page_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update feedback"
  ON public.page_feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create index for efficient queries
CREATE INDEX idx_page_feedback_user_id ON public.page_feedback(user_id);
CREATE INDEX idx_page_feedback_page_path ON public.page_feedback(page_path);
CREATE INDEX idx_page_feedback_status ON public.page_feedback(status);
CREATE INDEX idx_page_feedback_created_at ON public.page_feedback(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_page_feedback_updated_at
  BEFORE UPDATE ON public.page_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();