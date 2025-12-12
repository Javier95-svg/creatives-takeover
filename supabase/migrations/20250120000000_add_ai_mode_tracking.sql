-- AI Mode Tracking and Retention System
-- Creates tables for multi-mode platform with Strategy Mode as required first stop

-- AI Mode Sessions: Track sessions per mode
CREATE TABLE IF NOT EXISTS public.ai_mode_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('strategy', 'business', 'research', 'investor')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  engagement_score NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_mode_sessions_user_id ON public.ai_mode_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_mode_sessions_session_id ON public.ai_mode_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_mode_sessions_mode ON public.ai_mode_sessions(mode);
CREATE INDEX IF NOT EXISTS idx_ai_mode_sessions_started_at ON public.ai_mode_sessions(started_at DESC);

-- Mode Transitions: Track when users switch modes
CREATE TABLE IF NOT EXISTS public.mode_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  from_mode TEXT NOT NULL CHECK (from_mode IN ('strategy', 'business', 'research', 'investor')),
  to_mode TEXT NOT NULL CHECK (to_mode IN ('strategy', 'business', 'research', 'investor')),
  transition_reason TEXT NOT NULL CHECK (transition_reason IN ('user_request', 'auto_detection', 'completion', 'recommendation')),
  context JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mode_transitions_user_id ON public.mode_transitions(user_id);
CREATE INDEX IF NOT EXISTS idx_mode_transitions_session_id ON public.mode_transitions(session_id);
CREATE INDEX IF NOT EXISTS idx_mode_transitions_timestamp ON public.mode_transitions(timestamp DESC);

-- Mode Achievements: Gamification and retention
CREATE TABLE IF NOT EXISTS public.mode_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('strategy', 'business', 'research', 'investor')),
  achievement_type TEXT NOT NULL CHECK (achievement_type IN ('mode_mastery', 'step_completion', 'streak_day', 'streak_week', 'session_milestone', 'completion_badge')),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mode_achievements_user_id ON public.mode_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_mode_achievements_mode ON public.mode_achievements(mode);
CREATE INDEX IF NOT EXISTS idx_mode_achievements_type ON public.mode_achievements(achievement_type);

-- User Engagement Metrics: Daily/weekly retention tracking
CREATE TABLE IF NOT EXISTS public.user_engagement_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  session_count INTEGER DEFAULT 0,
  total_time_minutes INTEGER DEFAULT 0,
  mode_distribution JSONB DEFAULT '{}'::jsonb,
  return_rate NUMERIC(5,2) DEFAULT 0,
  messages_per_session NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_engagement_user_id ON public.user_engagement_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_engagement_date ON public.user_engagement_metrics(date DESC);

-- Add Strategy Mode progress to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS strategy_mode_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS strategy_mode_progress JSONB DEFAULT '{
  "currentStep": 0,
  "completedSteps": [],
  "stepAnswers": {},
  "startedAt": null,
  "lastStepCompletedAt": null,
  "completionStatus": "not_started",
  "totalTimeMinutes": 0
}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_strategy_completed ON public.profiles(strategy_mode_completed);

-- Strategy Mode Step Completion: Track individual step completions
CREATE TABLE IF NOT EXISTS public.strategy_step_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  step_number INTEGER NOT NULL CHECK (step_number >= 1 AND step_number <= 7),
  step_key TEXT NOT NULL,
  answer TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_spent_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_strategy_step_completions_user_id ON public.strategy_step_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_step_completions_step ON public.strategy_step_completions(step_number);

-- RLS Policies
ALTER TABLE public.ai_mode_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mode_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mode_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_step_completions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own mode sessions"
  ON public.ai_mode_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own mode transitions"
  ON public.mode_transitions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own achievements"
  ON public.mode_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own engagement metrics"
  ON public.user_engagement_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own step completions"
  ON public.strategy_step_completions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for backend functions)
CREATE POLICY "Service role full access mode sessions"
  ON public.ai_mode_sessions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access mode transitions"
  ON public.mode_transitions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access achievements"
  ON public.mode_achievements FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access engagement"
  ON public.user_engagement_metrics FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access step completions"
  ON public.strategy_step_completions FOR ALL
  USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_mode_sessions_updated_at
  BEFORE UPDATE ON public.ai_mode_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_engagement_metrics_updated_at
  BEFORE UPDATE ON public.user_engagement_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

