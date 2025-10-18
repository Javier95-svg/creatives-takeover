-- Drop existing user_feedback table and recreate with enhanced structure
DROP TABLE IF EXISTS public.user_feedback CASCADE;

-- Create enhanced user_feedback table
CREATE TABLE public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  
  -- Q1: Role & Experience Level
  user_role TEXT NOT NULL,
  role_other TEXT,
  
  -- Q2: Website UX Rating
  website_ux_rating INTEGER NOT NULL,
  
  -- Q3: Feature Interest
  selected_features TEXT[] NOT NULL DEFAULT '{}',
  feature_other TEXT,
  
  -- Q4: Pricing Perception
  pricing_perception TEXT NOT NULL,
  
  -- Q5: Suggested Price (conditional)
  suggested_price NUMERIC,
  suggested_currency TEXT DEFAULT 'USD',
  
  -- Q6: Improvement Suggestion
  improvement_suggestion TEXT,
  
  -- Contact
  email TEXT,
  
  -- Metadata
  credit_bonus_earned INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add validation trigger for UX rating instead of CHECK constraint
CREATE OR REPLACE FUNCTION validate_ux_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.website_ux_rating < 1 OR NEW.website_ux_rating > 5 THEN
    RAISE EXCEPTION 'website_ux_rating must be between 1 and 5';
  END IF;
  IF NEW.credit_bonus_earned < 0 OR NEW.credit_bonus_earned > 12 THEN
    RAISE EXCEPTION 'credit_bonus_earned must be between 0 and 12';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_ux_rating_before_insert
BEFORE INSERT OR UPDATE ON public.user_feedback
FOR EACH ROW EXECUTE FUNCTION validate_ux_rating();

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert their own feedback"
ON public.user_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own feedback"
ON public.user_feedback
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all feedback"
ON public.user_feedback
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create indexes
CREATE INDEX idx_user_feedback_user_id ON public.user_feedback(user_id);
CREATE INDEX idx_user_feedback_created_at ON public.user_feedback(created_at DESC);