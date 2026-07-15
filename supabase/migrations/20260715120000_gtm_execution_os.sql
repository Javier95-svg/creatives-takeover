-- GTM Strategist execution layer: durable weekly tasks, founder-approved assets,
-- competitor briefs, and adaptive review snapshots.

CREATE TABLE IF NOT EXISTS public.gtm_tasks (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.gtm_plans(id) ON DELETE CASCADE,
  play_id text,
  week_number integer NOT NULL CHECK (week_number BETWEEN 1 AND 6),
  title text NOT NULL,
  detail text NOT NULL DEFAULT '',
  owner_label text NOT NULL DEFAULT 'Founder',
  time_estimate_minutes integer NOT NULL DEFAULT 30 CHECK (time_estimate_minutes > 0),
  expected_output text NOT NULL DEFAULT '',
  metric text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done', 'skipped')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gtm_tasks_plan_week_idx ON public.gtm_tasks(plan_id, week_number);
ALTER TABLE public.gtm_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their GTM tasks" ON public.gtm_tasks;
CREATE POLICY "Users manage their GTM tasks" ON public.gtm_tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.gtm_play_assets (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.gtm_plans(id) ON DELETE CASCADE,
  play_id text NOT NULL,
  asset_type text NOT NULL CHECK (asset_type IN ('outreach_message', 'directory_listing', 'campaign_brief')),
  title text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gtm_play_assets_plan_play_idx ON public.gtm_play_assets(plan_id, play_id);
ALTER TABLE public.gtm_play_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their GTM play assets" ON public.gtm_play_assets;
CREATE POLICY "Users manage their GTM play assets" ON public.gtm_play_assets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.gtm_competitor_briefs (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.gtm_plans(id) ON DELETE CASCADE,
  brief jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gtm_competitor_briefs_plan_idx ON public.gtm_competitor_briefs(plan_id);
ALTER TABLE public.gtm_competitor_briefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their GTM competitor briefs" ON public.gtm_competitor_briefs;
CREATE POLICY "Users manage their GTM competitor briefs" ON public.gtm_competitor_briefs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.gtm_weekly_reviews
  ADD COLUMN IF NOT EXISTS adaptation jsonb,
  ADD COLUMN IF NOT EXISTS health_snapshot jsonb;

DROP TRIGGER IF EXISTS set_gtm_tasks_updated_at ON public.gtm_tasks;
CREATE TRIGGER set_gtm_tasks_updated_at BEFORE UPDATE ON public.gtm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS set_gtm_play_assets_updated_at ON public.gtm_play_assets;
CREATE TRIGGER set_gtm_play_assets_updated_at BEFORE UPDATE ON public.gtm_play_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS set_gtm_competitor_briefs_updated_at ON public.gtm_competitor_briefs;
CREATE TRIGGER set_gtm_competitor_briefs_updated_at BEFORE UPDATE ON public.gtm_competitor_briefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.gtm_tasks IS 'Founder-owned, checkable actions for the GTM six-week operating cycle.';
COMMENT ON TABLE public.gtm_play_assets IS 'Editable GTM asset drafts that require explicit founder approval before external use.';
COMMENT ON TABLE public.gtm_competitor_briefs IS 'Research-grounded competitor and alternative briefs for a GTM plan version.';
