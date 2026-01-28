-- Focus Funnel: Goals → Projects → Tasks with AI Decision Partner
-- Migration: 20260124000000_create_focus_funnel_tables.sql

-- ============================================================================
-- FOCUS FUNNEL GOALS (Top-level objectives)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.focus_funnel_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Core fields
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT CHECK (goal_type IN ('growth', 'product', 'revenue', 'learning', 'operations', 'marketing', 'fundraising')),

  -- Status & Progress
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'archived')),
  priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  progress_percentage NUMERIC DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

  -- Timeline
  target_date DATE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Success criteria & key results (OKR-style)
  success_criteria JSONB DEFAULT '[]'::jsonb,
  key_results JSONB DEFAULT '[]'::jsonb,

  -- AI context (for decision partner memory)
  ai_context JSONB DEFAULT '{}'::jsonb,
  last_ai_review TIMESTAMP WITH TIME ZONE,

  -- Ordering for drag-drop
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- FOCUS FUNNEL PROJECTS (Goal breakdown / workstreams)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.focus_funnel_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.focus_funnel_goals(id) ON DELETE CASCADE,

  -- Core fields
  title TEXT NOT NULL,
  description TEXT,

  -- Status & Progress
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'blocked', 'completed', 'archived')),
  priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  progress_percentage NUMERIC DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

  -- Timeline
  start_date DATE,
  target_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Effort tracking
  estimated_hours NUMERIC,
  actual_hours NUMERIC DEFAULT 0,

  -- Blocking info
  blocked_reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE,

  -- AI context
  ai_context JSONB DEFAULT '{}'::jsonb,

  -- Ordering
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- FOCUS FUNNEL TASKS (Actionable next actions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.focus_funnel_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.focus_funnel_projects(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.focus_funnel_goals(id) ON DELETE SET NULL,

  -- Core fields
  title TEXT NOT NULL,
  description TEXT,

  -- Status
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'deferred')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Scheduling
  scheduled_date DATE,
  deadline DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  deferred_to DATE,

  -- Effort estimation
  estimated_minutes INTEGER DEFAULT 60,
  actual_minutes INTEGER,

  -- AI Priority scoring (0-10 scale)
  business_impact_score NUMERIC DEFAULT 5 CHECK (business_impact_score >= 0 AND business_impact_score <= 10),
  effort_score NUMERIC DEFAULT 5 CHECK (effort_score >= 0 AND effort_score <= 10),
  urgency_score NUMERIC DEFAULT 5 CHECK (urgency_score >= 0 AND urgency_score <= 10),

  -- Computed priority: impact (40%) + urgency (35%) + ease (25%, inverted effort)
  computed_priority_score NUMERIC GENERATED ALWAYS AS (
    (business_impact_score * 0.4) + (urgency_score * 0.35) + ((10 - effort_score) * 0.25)
  ) STORED,

  -- Dependencies (task IDs this task blocks or is blocked by)
  blocks_task_ids UUID[] DEFAULT '{}',
  blocked_by_task_ids UUID[] DEFAULT '{}',

  -- Context & notes
  tags TEXT[] DEFAULT '{}',
  notes TEXT,

  -- AI metadata
  ai_generated BOOLEAN DEFAULT false,
  ai_rationale TEXT,

  -- Ordering
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- AI THINKING SESSIONS (Decision partner conversations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.focus_funnel_ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Context reference (what are we thinking about)
  context_type TEXT NOT NULL CHECK (context_type IN ('goal', 'project', 'task', 'prioritization', 'general', 'momentum')),
  context_id UUID, -- Can be goal_id, project_id, or task_id

  -- Session metadata
  session_title TEXT,
  session_mode TEXT DEFAULT 'thinking' CHECK (session_mode IN ('thinking', 'drafting', 'reflecting', 'deciding', 'analyzing')),

  -- Conversation history
  messages JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ role: 'user'|'assistant', content: string, timestamp: ISO, metadata?: {} }]

  -- Decisions captured from conversation
  decisions_made JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ decision: string, rationale: string, timestamp: ISO, applied: boolean }]

  -- Insights extracted
  insights JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ type: 'pattern'|'suggestion'|'warning'|'opportunity', content: string, relevance: 0-1 }]

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),

  -- Timestamps
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- MOMENTUM ANALYSIS (Time leaks & productivity patterns)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.focus_funnel_momentum (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Analysis period
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_type TEXT DEFAULT 'daily' CHECK (period_type IN ('daily', 'weekly', 'monthly')),

  -- Momentum metrics (0-100)
  momentum_score NUMERIC CHECK (momentum_score >= 0 AND momentum_score <= 100),
  focus_time_minutes INTEGER DEFAULT 0,
  distraction_time_minutes INTEGER DEFAULT 0,

  -- Task metrics
  tasks_planned INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tasks_deferred INTEGER DEFAULT 0,
  tasks_overdue INTEGER DEFAULT 0,

  -- Time leak analysis
  time_leaks JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ category: string, minutes_lost: number, pattern: string, suggestion: string }]

  -- Patterns detected
  patterns JSONB DEFAULT '{}'::jsonb,
  -- Format: { peak_productivity_hours: [], common_blockers: [], strength_areas: [], improvement_areas: [] }

  -- AI recommendations
  ai_recommendations JSONB DEFAULT '[]'::jsonb,

  -- Review status
  reviewed BOOLEAN DEFAULT false,
  reviewed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One analysis per day per user per period type
  CONSTRAINT unique_daily_momentum UNIQUE (user_id, analysis_date, period_type)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Goals indexes
CREATE INDEX IF NOT EXISTS idx_focus_goals_user_status ON public.focus_funnel_goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_focus_goals_user_priority ON public.focus_funnel_goals(user_id, priority) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_focus_goals_user_order ON public.focus_funnel_goals(user_id, display_order);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_focus_projects_user_status ON public.focus_funnel_projects(user_id, status);
CREATE INDEX IF NOT EXISTS idx_focus_projects_goal ON public.focus_funnel_projects(goal_id) WHERE goal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_focus_projects_user_order ON public.focus_funnel_projects(user_id, display_order);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_focus_tasks_user_status ON public.focus_funnel_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_focus_tasks_project ON public.focus_funnel_tasks(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_focus_tasks_scheduled ON public.focus_funnel_tasks(user_id, scheduled_date) WHERE status IN ('todo', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_focus_tasks_priority ON public.focus_funnel_tasks(user_id, computed_priority_score DESC) WHERE status IN ('todo', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_focus_tasks_deadline ON public.focus_funnel_tasks(user_id, deadline) WHERE deadline IS NOT NULL AND status != 'done';

-- AI Sessions indexes
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user ON public.focus_funnel_ai_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_context ON public.focus_funnel_ai_sessions(context_type, context_id) WHERE context_id IS NOT NULL;

-- Momentum indexes
CREATE INDEX IF NOT EXISTS idx_momentum_user_date ON public.focus_funnel_momentum(user_id, analysis_date DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.focus_funnel_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_funnel_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_funnel_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_funnel_ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_funnel_momentum ENABLE ROW LEVEL SECURITY;

-- Goals: Users can only manage their own goals
CREATE POLICY "focus_goals_select_own" ON public.focus_funnel_goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "focus_goals_insert_own" ON public.focus_funnel_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "focus_goals_update_own" ON public.focus_funnel_goals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "focus_goals_delete_own" ON public.focus_funnel_goals
  FOR DELETE USING (auth.uid() = user_id);

-- Projects: Users can only manage their own projects
CREATE POLICY "focus_projects_select_own" ON public.focus_funnel_projects
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "focus_projects_insert_own" ON public.focus_funnel_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "focus_projects_update_own" ON public.focus_funnel_projects
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "focus_projects_delete_own" ON public.focus_funnel_projects
  FOR DELETE USING (auth.uid() = user_id);

-- Tasks: Users can only manage their own tasks
CREATE POLICY "focus_tasks_select_own" ON public.focus_funnel_tasks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "focus_tasks_insert_own" ON public.focus_funnel_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "focus_tasks_update_own" ON public.focus_funnel_tasks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "focus_tasks_delete_own" ON public.focus_funnel_tasks
  FOR DELETE USING (auth.uid() = user_id);

-- AI Sessions: Users can only manage their own sessions
CREATE POLICY "ai_sessions_select_own" ON public.focus_funnel_ai_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ai_sessions_insert_own" ON public.focus_funnel_ai_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_sessions_update_own" ON public.focus_funnel_ai_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ai_sessions_delete_own" ON public.focus_funnel_ai_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Momentum: Users can only view/manage their own momentum data
CREATE POLICY "momentum_select_own" ON public.focus_funnel_momentum
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "momentum_insert_own" ON public.focus_funnel_momentum
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "momentum_update_own" ON public.focus_funnel_momentum
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "momentum_delete_own" ON public.focus_funnel_momentum
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATING PROGRESS
-- ============================================================================

-- Trigger function: Update project progress when tasks change
CREATE OR REPLACE FUNCTION public.focus_funnel_update_project_progress()
RETURNS TRIGGER AS $$
DECLARE
  target_project_id UUID;
BEGIN
  -- Get the project_id (from NEW for insert/update, from OLD for delete)
  target_project_id := COALESCE(NEW.project_id, OLD.project_id);

  -- Skip if no project associated
  IF target_project_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Update project progress based on task completion
  UPDATE public.focus_funnel_projects
  SET
    progress_percentage = (
      SELECT COALESCE(
        ROUND((COUNT(CASE WHEN status = 'done' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 1),
        0
      )
      FROM public.focus_funnel_tasks
      WHERE project_id = target_project_id
    ),
    actual_hours = (
      SELECT COALESCE(ROUND(SUM(actual_minutes) / 60.0, 1), 0)
      FROM public.focus_funnel_tasks
      WHERE project_id = target_project_id
        AND status = 'done'
    ),
    updated_at = NOW()
  WHERE id = target_project_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_focus_update_project_progress ON public.focus_funnel_tasks;
CREATE TRIGGER trigger_focus_update_project_progress
  AFTER INSERT OR UPDATE OF status, actual_minutes, project_id OR DELETE
  ON public.focus_funnel_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.focus_funnel_update_project_progress();

-- Trigger function: Update goal progress when projects change
CREATE OR REPLACE FUNCTION public.focus_funnel_update_goal_progress()
RETURNS TRIGGER AS $$
DECLARE
  target_goal_id UUID;
BEGIN
  -- Get the goal_id (from NEW for insert/update, from OLD for delete)
  target_goal_id := COALESCE(NEW.goal_id, OLD.goal_id);

  -- Skip if no goal associated
  IF target_goal_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Update goal progress based on project completion
  UPDATE public.focus_funnel_goals
  SET
    progress_percentage = (
      SELECT COALESCE(ROUND(AVG(progress_percentage), 1), 0)
      FROM public.focus_funnel_projects
      WHERE goal_id = target_goal_id
        AND status != 'archived'
    ),
    updated_at = NOW()
  WHERE id = target_goal_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_focus_update_goal_progress ON public.focus_funnel_projects;
CREATE TRIGGER trigger_focus_update_goal_progress
  AFTER INSERT OR UPDATE OF progress_percentage, status, goal_id OR DELETE
  ON public.focus_funnel_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.focus_funnel_update_goal_progress();

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

-- Generic updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION public.focus_funnel_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
DROP TRIGGER IF EXISTS set_updated_at_focus_goals ON public.focus_funnel_goals;
CREATE TRIGGER set_updated_at_focus_goals
  BEFORE UPDATE ON public.focus_funnel_goals
  FOR EACH ROW EXECUTE FUNCTION public.focus_funnel_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_focus_projects ON public.focus_funnel_projects;
CREATE TRIGGER set_updated_at_focus_projects
  BEFORE UPDATE ON public.focus_funnel_projects
  FOR EACH ROW EXECUTE FUNCTION public.focus_funnel_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_focus_tasks ON public.focus_funnel_tasks;
CREATE TRIGGER set_updated_at_focus_tasks
  BEFORE UPDATE ON public.focus_funnel_tasks
  FOR EACH ROW EXECUTE FUNCTION public.focus_funnel_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_ai_sessions ON public.focus_funnel_ai_sessions;
CREATE TRIGGER set_updated_at_ai_sessions
  BEFORE UPDATE ON public.focus_funnel_ai_sessions
  FOR EACH ROW EXECUTE FUNCTION public.focus_funnel_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_momentum ON public.focus_funnel_momentum;
CREATE TRIGGER set_updated_at_momentum
  BEFORE UPDATE ON public.focus_funnel_momentum
  FOR EACH ROW EXECUTE FUNCTION public.focus_funnel_set_updated_at();
