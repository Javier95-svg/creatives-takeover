-- BizMap AI stage progression and tool artifact tracking

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'bizmap_stage'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.bizmap_stage AS ENUM (
      'IDENTITY',
      'PROTOTYPE',
      'VALIDATING',
      'BUILDING',
      'LAUNCH'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_stage public.bizmap_stage NOT NULL DEFAULT 'IDENTITY',
  highest_unlocked_stage public.bizmap_stage NOT NULL DEFAULT 'PROTOTYPE',
  identity_completed_at TIMESTAMPTZ,
  prototype_completed_at TIMESTAMPTZ,
  validating_completed_at TIMESTAMPTZ,
  building_completed_at TIMESTAMPTZ,
  launch_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.waitlist_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  value_proposition TEXT NOT NULL,
  target_audience TEXT,
  cta_label TEXT NOT NULL DEFAULT 'Join the waitlist',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'exported')),
  published_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ,
  exported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pmf_validation_evidence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  validation_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  checklist_saved_at TIMESTAMPTZ,
  interview_notes_count INTEGER NOT NULL DEFAULT 0 CHECK (interview_notes_count >= 0),
  survey_results_count INTEGER NOT NULL DEFAULT 0 CHECK (survey_results_count >= 0),
  required_signals INTEGER NOT NULL DEFAULT 5 CHECK (required_signals >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mvp_builder_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope_title TEXT NOT NULL,
  scope_summary TEXT NOT NULL,
  spec_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'saved')),
  saved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gtm_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_title TEXT NOT NULL,
  plan_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'saved', 'exported')),
  saved_at TIMESTAMPTZ,
  exported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bizmap_task_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage public.bizmap_stage NOT NULL,
  task_id TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_stage ON public.user_progress(current_stage, highest_unlocked_stage);
CREATE INDEX IF NOT EXISTS idx_waitlist_pages_user_status ON public.waitlist_pages(user_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_mvp_builder_artifacts_user_saved ON public.mvp_builder_artifacts(user_id, saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_gtm_plans_user_saved ON public.gtm_plans(user_id, saved_at DESC, exported_at DESC);
CREATE INDEX IF NOT EXISTS idx_bizmap_task_progress_user_stage ON public.bizmap_task_progress(user_id, stage, is_completed);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmf_validation_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvp_builder_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bizmap_task_progress ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_progress' AND policyname = 'Users can view own user_progress') THEN
    CREATE POLICY "Users can view own user_progress"
      ON public.user_progress
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_progress' AND policyname = 'Users can insert own user_progress') THEN
    CREATE POLICY "Users can insert own user_progress"
      ON public.user_progress
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_progress' AND policyname = 'Users can update own user_progress') THEN
    CREATE POLICY "Users can update own user_progress"
      ON public.user_progress
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'waitlist_pages' AND policyname = 'Users can manage own waitlist_pages') THEN
    CREATE POLICY "Users can manage own waitlist_pages"
      ON public.waitlist_pages
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pmf_validation_evidence' AND policyname = 'Users can manage own pmf_validation_evidence') THEN
    CREATE POLICY "Users can manage own pmf_validation_evidence"
      ON public.pmf_validation_evidence
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mvp_builder_artifacts' AND policyname = 'Users can manage own mvp_builder_artifacts') THEN
    CREATE POLICY "Users can manage own mvp_builder_artifacts"
      ON public.mvp_builder_artifacts
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gtm_plans' AND policyname = 'Users can manage own gtm_plans') THEN
    CREATE POLICY "Users can manage own gtm_plans"
      ON public.gtm_plans
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bizmap_task_progress' AND policyname = 'Users can manage own bizmap_task_progress') THEN
    CREATE POLICY "Users can manage own bizmap_task_progress"
      ON public.bizmap_task_progress
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_user_progress_updated_at ON public.user_progress;
CREATE TRIGGER update_user_progress_updated_at
BEFORE UPDATE ON public.user_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_waitlist_pages_updated_at ON public.waitlist_pages;
CREATE TRIGGER update_waitlist_pages_updated_at
BEFORE UPDATE ON public.waitlist_pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pmf_validation_evidence_updated_at ON public.pmf_validation_evidence;
CREATE TRIGGER update_pmf_validation_evidence_updated_at
BEFORE UPDATE ON public.pmf_validation_evidence
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_mvp_builder_artifacts_updated_at ON public.mvp_builder_artifacts;
CREATE TRIGGER update_mvp_builder_artifacts_updated_at
BEFORE UPDATE ON public.mvp_builder_artifacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_gtm_plans_updated_at ON public.gtm_plans;
CREATE TRIGGER update_gtm_plans_updated_at
BEFORE UPDATE ON public.gtm_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_bizmap_task_progress_updated_at ON public.bizmap_task_progress;
CREATE TRIGGER update_bizmap_task_progress_updated_at
BEFORE UPDATE ON public.bizmap_task_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
