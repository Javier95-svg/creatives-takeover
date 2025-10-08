-- Create post_feedback_ratings table for structured feedback
CREATE TABLE public.post_feedback_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  clarity_score INTEGER CHECK (clarity_score >= 1 AND clarity_score <= 5),
  market_fit_score INTEGER CHECK (market_fit_score >= 1 AND market_fit_score <= 5),
  innovation_score INTEGER CHECK (innovation_score >= 1 AND innovation_score <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.post_feedback_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_feedback_ratings
CREATE POLICY "Anyone can view feedback ratings"
ON public.post_feedback_ratings
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create feedback ratings"
ON public.post_feedback_ratings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback ratings"
ON public.post_feedback_ratings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create user_journey_progress table
CREATE TABLE public.user_journey_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan_it_completed BOOLEAN DEFAULT false,
  plan_it_completed_at TIMESTAMPTZ,
  refine_it_shared BOOLEAN DEFAULT false,
  refine_it_shared_at TIMESTAMPTZ,
  refine_it_feedback_received BOOLEAN DEFAULT false,
  refine_it_feedback_received_at TIMESTAMPTZ,
  propel_viewed BOOLEAN DEFAULT false,
  propel_viewed_at TIMESTAMPTZ,
  propel_applied BOOLEAN DEFAULT false,
  propel_applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_journey_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_journey_progress
CREATE POLICY "Users can view their own journey progress"
ON public.user_journey_progress
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journey progress"
ON public.user_journey_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journey progress"
ON public.user_journey_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Add new columns to community_posts
ALTER TABLE public.community_posts
ADD COLUMN IF NOT EXISTS featured_on_propel BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS feedback_status TEXT DEFAULT 'pending' CHECK (feedback_status IN ('pending', 'in_progress', 'completed'));

-- Create trigger for updated_at on post_feedback_ratings
CREATE TRIGGER update_post_feedback_ratings_updated_at
BEFORE UPDATE ON public.post_feedback_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on user_journey_progress
CREATE TRIGGER update_user_journey_progress_updated_at
BEFORE UPDATE ON public.user_journey_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();