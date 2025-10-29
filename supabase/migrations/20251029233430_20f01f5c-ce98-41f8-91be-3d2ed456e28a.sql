-- Add new columns to existing page_feedback table
ALTER TABLE public.page_feedback
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS was_helpful BOOLEAN,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Make page_path nullable since page_url concept can be served by it
ALTER TABLE public.page_feedback
  ALTER COLUMN page_path DROP NOT NULL;

-- Drop old admin policy that uses EXISTS query
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.page_feedback;

-- Create new admin policy using has_role() function for consistency
CREATE POLICY "Admins can view all feedback"
  ON public.page_feedback FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add helpful comment
COMMENT ON TABLE public.page_feedback IS 
  'Stores user feedback from various pages. Anyone can submit, users see their own, admins see all.';