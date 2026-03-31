CREATE TABLE IF NOT EXISTS public.daily_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stage public.bizmap_stage NOT NULL DEFAULT 'IDENTITY',
  mission_text TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  mission_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS daily_missions_user_id_mission_date_key
  ON public.daily_missions (user_id, mission_date);

CREATE INDEX IF NOT EXISTS idx_daily_missions_user_created_at
  ON public.daily_missions (user_id, created_at DESC);

ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own daily missions" ON public.daily_missions;
CREATE POLICY "Users can view their own daily missions"
  ON public.daily_missions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own daily missions" ON public.daily_missions;
CREATE POLICY "Users can insert their own daily missions"
  ON public.daily_missions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own daily missions" ON public.daily_missions;
CREATE POLICY "Users can update their own daily missions"
  ON public.daily_missions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
