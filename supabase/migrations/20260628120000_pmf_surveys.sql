-- PMF Lab — hosted real-feedback survey.
-- Founders publish a shareable Sean Ellis survey; real (logged-out) users respond.
-- Responses drive the 40% metric from real data and feed the PMF score as verified
-- evidence. Mirrors the published-page + anonymous-write pattern used by
-- waitlist_signups / demo_studio_signups.

CREATE TABLE IF NOT EXISTS public.pmf_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  product_name TEXT,
  audience TEXT,
  intro TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pmf_surveys_user ON public.pmf_surveys(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pmf_surveys_published_slug ON public.pmf_surveys(slug) WHERE status = 'published';

CREATE TABLE IF NOT EXISTS public.pmf_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.pmf_surveys(id) ON DELETE CASCADE,
  sean_ellis_answer TEXT NOT NULL CHECK (sean_ellis_answer IN ('very','somewhat','not')),
  main_benefit TEXT,
  would_use_instead TEXT,
  role TEXT,
  feedback TEXT,
  email TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pmf_survey_responses_survey ON public.pmf_survey_responses(survey_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pmf_survey_responses_email
  ON public.pmf_survey_responses(survey_id, lower(email)) WHERE email IS NOT NULL;

-- updated_at trigger (reuse the shared helper used across the schema)
DROP TRIGGER IF EXISTS update_pmf_surveys_updated_at ON public.pmf_surveys;
CREATE TRIGGER update_pmf_surveys_updated_at
  BEFORE UPDATE ON public.pmf_surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.pmf_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmf_survey_responses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Surveys: owner manages own; anyone may read a published survey (public page).
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pmf_surveys' AND policyname='Users manage own pmf_surveys') THEN
    CREATE POLICY "Users manage own pmf_surveys" ON public.pmf_surveys
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pmf_surveys' AND policyname='Public read published pmf_surveys') THEN
    CREATE POLICY "Public read published pmf_surveys" ON public.pmf_surveys
      FOR SELECT USING (status = 'published');
  END IF;

  -- Responses: anonymous insert only when the parent survey is published; owner reads own.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pmf_survey_responses' AND policyname='Public insert responses to published surveys') THEN
    CREATE POLICY "Public insert responses to published surveys" ON public.pmf_survey_responses
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.pmf_surveys s WHERE s.id = survey_id AND s.status = 'published')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pmf_survey_responses' AND policyname='Owners read own survey responses') THEN
    CREATE POLICY "Owners read own survey responses" ON public.pmf_survey_responses
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.pmf_surveys s WHERE s.id = survey_id AND s.user_id = auth.uid())
      );
  END IF;
END $$;
