-- Traction Engine: weekly distribution experiments and retention scorecards.

CREATE TABLE IF NOT EXISTS public.traction_engine_sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  cycle_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  closed_at TIMESTAMPTZ,
  summary_recommendation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS traction_engine_sprints_active_channel_idx
  ON public.traction_engine_sprints(user_id, lower(channel))
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS traction_engine_sprints_user_status_idx
  ON public.traction_engine_sprints(user_id, status, cycle_start_date DESC);

CREATE TABLE IF NOT EXISTS public.traction_engine_weekly_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  new_users INTEGER NOT NULL DEFAULT 0 CHECK (new_users >= 0),
  seven_day_active_users INTEGER NOT NULL DEFAULT 0 CHECK (seven_day_active_users >= 0),
  thirty_day_active_users INTEGER NOT NULL DEFAULT 0 CHECK (thirty_day_active_users >= 0),
  primary_acquisition_channel TEXT NOT NULL DEFAULT '',
  product_category TEXT NOT NULL DEFAULT 'other',
  revenue NUMERIC(12,2),
  combined_score INTEGER NOT NULL CHECK (combined_score >= 0 AND combined_score <= 100),
  consistency_score INTEGER NOT NULL CHECK (consistency_score >= 0 AND consistency_score <= 100),
  channel_efficiency_score INTEGER NOT NULL CHECK (channel_efficiency_score >= 0 AND channel_efficiency_score <= 100),
  experiment_quality_score INTEGER NOT NULL CHECK (experiment_quality_score >= 0 AND experiment_quality_score <= 100),
  retention_health_score INTEGER NOT NULL CHECK (retention_health_score >= 0 AND retention_health_score <= 100),
  consistency_streak_weeks INTEGER NOT NULL DEFAULT 1 CHECK (consistency_streak_weeks >= 0),
  channel_quality_signal TEXT NOT NULL,
  prioritized_recommendation TEXT NOT NULL,
  phase_seven_ready BOOLEAN NOT NULL DEFAULT false,
  score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS traction_engine_weekly_logs_user_week_idx
  ON public.traction_engine_weekly_logs(user_id, week_start_date DESC);

CREATE INDEX IF NOT EXISTS traction_engine_weekly_logs_score_idx
  ON public.traction_engine_weekly_logs(user_id, combined_score DESC);

CREATE TABLE IF NOT EXISTS public.traction_engine_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekly_log_id UUID NOT NULL REFERENCES public.traction_engine_weekly_logs(id) ON DELETE CASCADE,
  sprint_id UUID REFERENCES public.traction_engine_sprints(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  target_metric TEXT NOT NULL,
  target_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (target_value >= 0),
  result_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (result_value >= 0),
  time_invested_hours NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (time_invested_hours >= 0),
  decision TEXT NOT NULL CHECK (decision IN ('double_down', 'iterate', 'kill')),
  pass BOOLEAN NOT NULL DEFAULT false,
  efficiency_score INTEGER NOT NULL CHECK (efficiency_score >= 0 AND efficiency_score <= 100),
  quality_score INTEGER NOT NULL CHECK (quality_score >= 0 AND quality_score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS traction_engine_experiments_log_idx
  ON public.traction_engine_experiments(weekly_log_id);

CREATE INDEX IF NOT EXISTS traction_engine_experiments_user_channel_idx
  ON public.traction_engine_experiments(user_id, lower(channel), created_at DESC);

CREATE OR REPLACE FUNCTION public.update_traction_engine_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_traction_engine_sprints_updated_at ON public.traction_engine_sprints;
CREATE TRIGGER update_traction_engine_sprints_updated_at
BEFORE UPDATE ON public.traction_engine_sprints
FOR EACH ROW
EXECUTE FUNCTION public.update_traction_engine_updated_at();

DROP TRIGGER IF EXISTS update_traction_engine_weekly_logs_updated_at ON public.traction_engine_weekly_logs;
CREATE TRIGGER update_traction_engine_weekly_logs_updated_at
BEFORE UPDATE ON public.traction_engine_weekly_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_traction_engine_updated_at();

DROP TRIGGER IF EXISTS update_traction_engine_experiments_updated_at ON public.traction_engine_experiments;
CREATE TRIGGER update_traction_engine_experiments_updated_at
BEFORE UPDATE ON public.traction_engine_experiments
FOR EACH ROW
EXECUTE FUNCTION public.update_traction_engine_updated_at();

ALTER TABLE public.traction_engine_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traction_engine_weekly_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traction_engine_experiments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own traction engine sprints" ON public.traction_engine_sprints;
CREATE POLICY "Users manage own traction engine sprints"
ON public.traction_engine_sprints
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own traction engine weekly logs" ON public.traction_engine_weekly_logs;
CREATE POLICY "Users manage own traction engine weekly logs"
ON public.traction_engine_weekly_logs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own traction engine experiments" ON public.traction_engine_experiments;
CREATE POLICY "Users manage own traction engine experiments"
ON public.traction_engine_experiments
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
