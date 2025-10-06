-- Add user preferences and personalization fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS creative_niche TEXT,
ADD COLUMN IF NOT EXISTS business_stage TEXT DEFAULT 'idea',
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS preferred_dashboard_view TEXT DEFAULT 'beginner',
ADD COLUMN IF NOT EXISTS user_preferences JSONB DEFAULT '{}'::jsonb;

-- Create user_activity_log table for behavioral tracking
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}'::jsonb,
  page_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create personalized_recommendations table
CREATE TABLE IF NOT EXISTS public.personalized_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 1,
  reason TEXT,
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_dismissed BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days')
);

-- Create dashboard_widgets table for user customization
CREATE TABLE IF NOT EXISTS public.dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL,
  position INTEGER NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  widget_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalized_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON public.user_activity_log;
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.user_activity_log;
DROP POLICY IF EXISTS "Users can view their own recommendations" ON public.personalized_recommendations;
DROP POLICY IF EXISTS "Users can update their own recommendations" ON public.personalized_recommendations;
DROP POLICY IF EXISTS "Users can manage their own widgets" ON public.dashboard_widgets;

-- RLS Policies for user_activity_log
CREATE POLICY "Users can insert their own activity logs"
  ON public.user_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own activity logs"
  ON public.user_activity_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for personalized_recommendations
CREATE POLICY "Users can view their own recommendations"
  ON public.personalized_recommendations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations"
  ON public.personalized_recommendations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for dashboard_widgets
CREATE POLICY "Users can manage their own widgets"
  ON public.dashboard_widgets FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON public.user_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_personalized_recommendations_user_id ON public.personalized_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_personalized_recommendations_priority ON public.personalized_recommendations(priority DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user_id ON public.dashboard_widgets(user_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_dashboard_widgets_updated_at ON public.dashboard_widgets;
CREATE TRIGGER update_dashboard_widgets_updated_at
  BEFORE UPDATE ON public.dashboard_widgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();