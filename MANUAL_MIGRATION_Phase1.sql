-- ============================================================================
-- DASHBOARD PHASE 1 UPGRADE - MANUAL MIGRATION
-- ============================================================================
--
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Select your project
-- 3. Go to SQL Editor
-- 4. Copy and paste this entire script
-- 5. Click "Run" to execute
--
-- This script is idempotent - safe to run multiple times
-- ============================================================================

-- NEW TABLES
-- ============================================================================

-- Weekly Missions
CREATE TABLE IF NOT EXISTS public.weekly_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  mission_goal TEXT NOT NULL,
  mission_type TEXT,
  target_metric TEXT,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  completion_percentage NUMERIC DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_weekly_missions_user_active
  ON public.weekly_missions(user_id, status)
  WHERE status = 'active';

-- Weekly Mission Tasks
CREATE TABLE IF NOT EXISTS public.weekly_mission_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_mission_id UUID NOT NULL REFERENCES public.weekly_missions(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
  contribution_weight NUMERIC DEFAULT 1.0 CHECK (contribution_weight >= 0 AND contribution_weight <= 1),
  is_critical BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_mission_task UNIQUE (weekly_mission_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_weekly_mission_tasks_mission
  ON public.weekly_mission_tasks(weekly_mission_id);

CREATE INDEX IF NOT EXISTS idx_weekly_mission_tasks_task
  ON public.weekly_mission_tasks(task_id);

-- MODIFY EXISTING TABLES
-- ============================================================================

-- Daily Check-ins: Add evening reflection fields
ALTER TABLE public.daily_check_ins ADD COLUMN IF NOT EXISTS goal_achieved BOOLEAN;
ALTER TABLE public.daily_check_ins ADD COLUMN IF NOT EXISTS what_went_well TEXT;
ALTER TABLE public.daily_check_ins ADD COLUMN IF NOT EXISTS what_blocked_you TEXT;
ALTER TABLE public.daily_check_ins ADD COLUMN IF NOT EXISTS energy_level_end INTEGER CHECK (energy_level_end >= 1 AND energy_level_end <= 5);
ALTER TABLE public.daily_check_ins ADD COLUMN IF NOT EXISTS tomorrow_focus TEXT;

-- Daily Tasks: Add priority scoring fields
ALTER TABLE public.daily_tasks ADD COLUMN IF NOT EXISTS business_impact_score NUMERIC DEFAULT 5 CHECK (business_impact_score >= 0 AND business_impact_score <= 10);
ALTER TABLE public.daily_tasks ADD COLUMN IF NOT EXISTS effort_estimate NUMERIC DEFAULT 2 CHECK (effort_estimate > 0);
ALTER TABLE public.daily_tasks ADD COLUMN IF NOT EXISTS stage_alignment_score NUMERIC DEFAULT 5 CHECK (stage_alignment_score >= 0 AND stage_alignment_score <= 10);
ALTER TABLE public.daily_tasks ADD COLUMN IF NOT EXISTS blocks_task_ids UUID[] DEFAULT '{}';
ALTER TABLE public.daily_tasks ADD COLUMN IF NOT EXISTS contributes_to_weekly_mission BOOLEAN DEFAULT false;
ALTER TABLE public.daily_tasks ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;

-- Profiles: Add dashboard preferences
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_dashboard_mode TEXT DEFAULT 'focus' CHECK (preferred_dashboard_mode IN ('focus', 'dashboard', 'control_center'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS use_classic_dashboard BOOLEAN DEFAULT false;

-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.weekly_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_mission_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own weekly missions" ON public.weekly_missions;
DROP POLICY IF EXISTS "Users can create their own weekly missions" ON public.weekly_missions;
DROP POLICY IF EXISTS "Users can update their own weekly missions" ON public.weekly_missions;
DROP POLICY IF EXISTS "Users can delete their own weekly missions" ON public.weekly_missions;
DROP POLICY IF EXISTS "Users can view their own mission tasks" ON public.weekly_mission_tasks;
DROP POLICY IF EXISTS "Users can create their own mission tasks" ON public.weekly_mission_tasks;
DROP POLICY IF EXISTS "Users can update their own mission tasks" ON public.weekly_mission_tasks;
DROP POLICY IF EXISTS "Users can delete their own mission tasks" ON public.weekly_mission_tasks;

-- Weekly Missions Policies
CREATE POLICY "Users can view their own weekly missions"
  ON public.weekly_missions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own weekly missions"
  ON public.weekly_missions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly missions"
  ON public.weekly_missions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly missions"
  ON public.weekly_missions FOR DELETE USING (auth.uid() = user_id);

-- Weekly Mission Tasks Policies
CREATE POLICY "Users can view their own mission tasks"
  ON public.weekly_mission_tasks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.weekly_missions wm WHERE wm.id = weekly_mission_tasks.weekly_mission_id AND wm.user_id = auth.uid()));

CREATE POLICY "Users can create their own mission tasks"
  ON public.weekly_mission_tasks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.weekly_missions wm WHERE wm.id = weekly_mission_tasks.weekly_mission_id AND wm.user_id = auth.uid()));

CREATE POLICY "Users can update their own mission tasks"
  ON public.weekly_mission_tasks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.weekly_missions wm WHERE wm.id = weekly_mission_tasks.weekly_mission_id AND wm.user_id = auth.uid()));

CREATE POLICY "Users can delete their own mission tasks"
  ON public.weekly_mission_tasks FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.weekly_missions wm WHERE wm.id = weekly_mission_tasks.weekly_mission_id AND wm.user_id = auth.uid()));

-- HELPER FUNCTIONS
-- ============================================================================

-- Function to auto-update weekly mission completion percentage
CREATE OR REPLACE FUNCTION public.update_weekly_mission_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.weekly_missions
  SET
    completion_percentage = (
      SELECT COALESCE(
        (COUNT(CASE WHEN dt.is_completed = true THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
        0
      )
      FROM public.weekly_mission_tasks wmt
      JOIN public.daily_tasks dt ON dt.id = wmt.task_id
      WHERE wmt.weekly_mission_id = NEW.weekly_mission_id
    ),
    updated_at = NOW()
  WHERE id = NEW.weekly_mission_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update mission progress when tasks are completed
DROP TRIGGER IF EXISTS trigger_update_mission_progress ON public.daily_tasks;
CREATE TRIGGER trigger_update_mission_progress
  AFTER UPDATE OF is_completed ON public.daily_tasks
  FOR EACH ROW
  WHEN (OLD.is_completed IS DISTINCT FROM NEW.is_completed AND NEW.contributes_to_weekly_mission = true)
  EXECUTE FUNCTION public.update_weekly_mission_progress();

-- ============================================================================
-- VERIFICATION QUERIES (Run these after to verify success)
-- ============================================================================

-- SELECT 'Tables created successfully' AS status,
--   (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'weekly_missions') AS weekly_missions_exists,
--   (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'weekly_mission_tasks') AS weekly_mission_tasks_exists;

-- SELECT 'Columns added successfully' AS status,
--   (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'daily_check_ins' AND column_name = 'goal_achieved') AS goal_achieved_exists,
--   (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'daily_tasks' AND column_name = 'business_impact_score') AS business_impact_exists,
--   (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'preferred_dashboard_mode') AS dashboard_mode_exists;
