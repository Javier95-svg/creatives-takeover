-- Dashboard Phase 1 Upgrade Migration
-- Creates tables and columns for Smart Focus Card, Weekly Missions, and Enhanced Check-ins

-- ============================================================================
-- NEW TABLES
-- ============================================================================

-- Weekly Missions: One clear weekly goal that connects daily work to weekly outcomes
CREATE TABLE IF NOT EXISTS public.weekly_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  mission_goal TEXT NOT NULL,
  mission_type TEXT, -- 'growth', 'product', 'revenue', 'learning', etc.
  target_metric TEXT, -- Which KPI this mission affects
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  completion_percentage NUMERIC DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Ensure one active mission per user at a time
  CONSTRAINT unique_active_mission_per_user UNIQUE (user_id, status, week_start_date)
);

-- Index for quick lookup of user's current weekly mission
CREATE INDEX IF NOT EXISTS idx_weekly_missions_user_active
  ON public.weekly_missions(user_id, status)
  WHERE status = 'active';

-- Weekly Mission Tasks: Links tasks to weekly missions
CREATE TABLE IF NOT EXISTS public.weekly_mission_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_mission_id UUID NOT NULL REFERENCES public.weekly_missions(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
  contribution_weight NUMERIC DEFAULT 1.0 CHECK (contribution_weight >= 0 AND contribution_weight <= 1),
  is_critical BOOLEAN DEFAULT false, -- Mission can't complete without this
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate task assignments
  CONSTRAINT unique_mission_task UNIQUE (weekly_mission_id, task_id)
);

-- Index for quick lookup of tasks for a mission
CREATE INDEX IF NOT EXISTS idx_weekly_mission_tasks_mission
  ON public.weekly_mission_tasks(weekly_mission_id);

-- Index for quick lookup of missions for a task
CREATE INDEX IF NOT EXISTS idx_weekly_mission_tasks_task
  ON public.weekly_mission_tasks(task_id);

-- ============================================================================
-- MODIFY EXISTING TABLES
-- ============================================================================

-- Daily Check-ins: Add evening reflection fields
DO $$
BEGIN
  -- goal_achieved: Did the user achieve their daily goal?
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'daily_check_ins'
    AND column_name = 'goal_achieved'
  ) THEN
    ALTER TABLE public.daily_check_ins ADD COLUMN goal_achieved BOOLEAN;
  END IF;

  -- what_went_well: Evening reflection - what went well today
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'daily_check_ins'
    AND column_name = 'what_went_well'
  ) THEN
    ALTER TABLE public.daily_check_ins ADD COLUMN what_went_well TEXT;
  END IF;

  -- what_blocked_you: What obstacles were encountered
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'daily_check_ins'
    AND column_name = 'what_blocked_you'
  ) THEN
    ALTER TABLE public.daily_check_ins ADD COLUMN what_blocked_you TEXT;
  END IF;

  -- energy_level_end: Energy level at end of day (1-5 scale)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'daily_check_ins'
    AND column_name = 'energy_level_end'
  ) THEN
    ALTER TABLE public.daily_check_ins ADD COLUMN energy_level_end INTEGER CHECK (energy_level_end >= 1 AND energy_level_end <= 5);
  END IF;

  -- tomorrow_focus: Suggested focus for tomorrow
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'daily_check_ins'
    AND column_name = 'tomorrow_focus'
  ) THEN
    ALTER TABLE public.daily_check_ins ADD COLUMN tomorrow_focus TEXT;
  END IF;
END $$;

-- Daily Tasks: Add priority scoring fields
DO $$
BEGIN
  -- business_impact_score: How much this task moves key metrics (0-10)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'daily_tasks'
    AND column_name = 'business_impact_score'
  ) THEN
    ALTER TABLE public.daily_tasks ADD COLUMN business_impact_score NUMERIC DEFAULT 5 CHECK (business_impact_score >= 0 AND business_impact_score <= 10);
  END IF;

  -- effort_estimate: Estimated hours to complete
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'daily_tasks'
    AND column_name = 'effort_estimate'
  ) THEN
    ALTER TABLE public.daily_tasks ADD COLUMN effort_estimate NUMERIC DEFAULT 2 CHECK (effort_estimate > 0);
  END IF;

  -- stage_alignment_score: How well task fits current business stage (0-10)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'daily_tasks'
    AND column_name = 'stage_alignment_score'
  ) THEN
    ALTER TABLE public.daily_tasks ADD COLUMN stage_alignment_score NUMERIC DEFAULT 5 CHECK (stage_alignment_score >= 0 AND stage_alignment_score <= 10);
  END IF;

  -- blocks_task_ids: Array of task IDs this task unblocks
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'daily_tasks'
    AND column_name = 'blocks_task_ids'
  ) THEN
    ALTER TABLE public.daily_tasks ADD COLUMN blocks_task_ids UUID[] DEFAULT '{}';
  END IF;

  -- contributes_to_weekly_mission: Does this task contribute to current weekly mission?
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'daily_tasks'
    AND column_name = 'contributes_to_weekly_mission'
  ) THEN
    ALTER TABLE public.daily_tasks ADD COLUMN contributes_to_weekly_mission BOOLEAN DEFAULT false;
  END IF;

  -- ai_generated: Was this task suggested by AI?
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'daily_tasks'
    AND column_name = 'ai_generated'
  ) THEN
    ALTER TABLE public.daily_tasks ADD COLUMN ai_generated BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Profiles: Add dashboard preferences
DO $$
BEGIN
  -- preferred_dashboard_mode: 'focus', 'dashboard', or 'control_center'
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'preferred_dashboard_mode'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN preferred_dashboard_mode TEXT DEFAULT 'focus' CHECK (preferred_dashboard_mode IN ('focus', 'dashboard', 'control_center'));
  END IF;

  -- use_classic_dashboard: Fallback to classic dashboard?
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'use_classic_dashboard'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN use_classic_dashboard BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.weekly_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_mission_tasks ENABLE ROW LEVEL SECURITY;

-- Weekly Missions Policies
CREATE POLICY "Users can view their own weekly missions"
  ON public.weekly_missions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own weekly missions"
  ON public.weekly_missions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly missions"
  ON public.weekly_missions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly missions"
  ON public.weekly_missions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Weekly Mission Tasks Policies
CREATE POLICY "Users can view their own mission tasks"
  ON public.weekly_mission_tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.weekly_missions wm
      WHERE wm.id = weekly_mission_tasks.weekly_mission_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own mission tasks"
  ON public.weekly_mission_tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.weekly_missions wm
      WHERE wm.id = weekly_mission_tasks.weekly_mission_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own mission tasks"
  ON public.weekly_mission_tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.weekly_missions wm
      WHERE wm.id = weekly_mission_tasks.weekly_mission_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own mission tasks"
  ON public.weekly_mission_tasks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.weekly_missions wm
      WHERE wm.id = weekly_mission_tasks.weekly_mission_id
      AND wm.user_id = auth.uid()
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to auto-update weekly mission completion percentage
CREATE OR REPLACE FUNCTION public.update_weekly_mission_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate completion percentage based on linked tasks
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
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.weekly_missions IS 'Stores weekly missions (goals) for founders to connect daily work to weekly outcomes';
COMMENT ON TABLE public.weekly_mission_tasks IS 'Links daily tasks to weekly missions with contribution weights';
COMMENT ON COLUMN public.daily_check_ins.goal_achieved IS 'Whether the user achieved their daily goal (for evening reflection)';
COMMENT ON COLUMN public.daily_check_ins.what_went_well IS 'Evening reflection: What went well today';
COMMENT ON COLUMN public.daily_check_ins.what_blocked_you IS 'Evening reflection: What obstacles were encountered';
COMMENT ON COLUMN public.daily_check_ins.energy_level_end IS 'Energy level at end of day (1-5 scale)';
COMMENT ON COLUMN public.daily_check_ins.tomorrow_focus IS 'AI-suggested focus for tomorrow based on today''s progress';
COMMENT ON COLUMN public.daily_tasks.business_impact_score IS 'How much this task moves key business metrics (0-10)';
COMMENT ON COLUMN public.daily_tasks.effort_estimate IS 'Estimated hours to complete this task';
COMMENT ON COLUMN public.daily_tasks.stage_alignment_score IS 'How well this task fits current business stage (0-10)';
COMMENT ON COLUMN public.daily_tasks.blocks_task_ids IS 'Array of task IDs that are blocked by this task';
COMMENT ON COLUMN public.daily_tasks.contributes_to_weekly_mission IS 'Whether this task contributes to the current weekly mission';
COMMENT ON COLUMN public.profiles.preferred_dashboard_mode IS 'User''s preferred dashboard complexity: focus (minimal), dashboard (standard), or control_center (full)';
COMMENT ON COLUMN public.profiles.use_classic_dashboard IS 'Whether user prefers the classic dashboard over the new version';
