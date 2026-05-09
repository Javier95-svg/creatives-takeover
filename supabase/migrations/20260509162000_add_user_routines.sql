-- Add personalized routine storage.
-- The active routine lives on profiles for simple dashboard reads; completion
-- history uses a separate table so streaks and consistency can be queried safely.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS routine_primary_goal text,
  ADD COLUMN IF NOT EXISTS routine_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS routine_reminder_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.routine_primary_goal IS
  'Primary goal selected in Your Routine, such as validate_idea, find_cofounders, grow_audience, launch_product, or raise_funding.';

COMMENT ON COLUMN public.profiles.routine_config IS
  'Current editable routine config. Expected shape: version, primaryGoal, tasks[], updatedAt.';

COMMENT ON COLUMN public.profiles.routine_reminder_preferences IS
  'In-app routine reminder preferences. Delivery is handled separately from this preference payload.';

CREATE TABLE IF NOT EXISTS public.routine_task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  routine_task_id text NOT NULL,
  task_title text NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('daily', 'weekly')),
  period_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('completed', 'skipped')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS routine_task_completions_user_task_period_key
  ON public.routine_task_completions (user_id, routine_task_id, period_type, period_date);

CREATE INDEX IF NOT EXISTS idx_routine_task_completions_user_period
  ON public.routine_task_completions (user_id, period_type, period_date DESC);

ALTER TABLE public.routine_task_completions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.routine_task_completions FROM PUBLIC;
REVOKE ALL ON TABLE public.routine_task_completions FROM anon;
REVOKE ALL ON TABLE public.routine_task_completions FROM authenticated;

DROP POLICY IF EXISTS "Users can view their own routine completions" ON public.routine_task_completions;
CREATE POLICY "Users can view their own routine completions"
  ON public.routine_task_completions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own routine completions" ON public.routine_task_completions;
CREATE POLICY "Users can insert their own routine completions"
  ON public.routine_task_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own routine completions" ON public.routine_task_completions;
CREATE POLICY "Users can update their own routine completions"
  ON public.routine_task_completions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own routine completions" ON public.routine_task_completions;
CREATE POLICY "Users can delete their own routine completions"
  ON public.routine_task_completions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.routine_task_completions TO authenticated;
GRANT ALL ON TABLE public.routine_task_completions TO service_role;

COMMENT ON TABLE public.routine_task_completions IS
  'Per-user completion and skipped history for Your Routine tasks. RLS restricts rows to the owning user.';
