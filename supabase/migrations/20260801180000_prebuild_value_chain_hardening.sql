-- Authoritative lineage for the pre-build journey (ICP -> Demo -> PMF).
-- Existing rows intentionally remain NULL/unscoped. They stay readable but are
-- never silently attached to a new idea or included in a scoped PMF decision.

CREATE TABLE IF NOT EXISTS public.prebuild_validation_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  icp_analysis_id UUID REFERENCES public.icp_analysis_results(id) ON DELETE SET NULL,
  label TEXT,
  is_explicitly_unscoped BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (NOT is_explicitly_unscoped OR icp_analysis_id IS NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS prebuild_context_user_icp_unique
  ON public.prebuild_validation_contexts(user_id, icp_analysis_id)
  WHERE icp_analysis_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS prebuild_context_user_created_idx
  ON public.prebuild_validation_contexts(user_id, created_at DESC);

ALTER TABLE public.prebuild_validation_contexts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage prebuild contexts" ON public.prebuild_validation_contexts;
CREATE POLICY "Owners manage prebuild contexts" ON public.prebuild_validation_contexts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS prebuild_validation_contexts_touch ON public.prebuild_validation_contexts;
CREATE TRIGGER prebuild_validation_contexts_touch
  BEFORE UPDATE ON public.prebuild_validation_contexts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.demo_studio_projects
  ADD COLUMN IF NOT EXISTS validation_context_id UUID REFERENCES public.prebuild_validation_contexts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS originating_handoff_id UUID REFERENCES public.journey_handoffs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_icp_analysis_id UUID REFERENCES public.icp_analysis_results(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS demo_projects_context_idx
  ON public.demo_studio_projects(owner_id, validation_context_id);

ALTER TABLE public.pmf_customer_discovery
  ADD COLUMN IF NOT EXISTS validation_context_id UUID REFERENCES public.prebuild_validation_contexts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS originating_handoff_id UUID REFERENCES public.journey_handoffs(id) ON DELETE SET NULL;
ALTER TABLE public.pmf_surveys
  ADD COLUMN IF NOT EXISTS validation_context_id UUID REFERENCES public.prebuild_validation_contexts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS originating_handoff_id UUID REFERENCES public.journey_handoffs(id) ON DELETE SET NULL;
ALTER TABLE public.pmf_analysis_results
  ADD COLUMN IF NOT EXISTS validation_context_id UUID REFERENCES public.prebuild_validation_contexts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS originating_handoff_id UUID REFERENCES public.journey_handoffs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS icp_analysis_id UUID REFERENCES public.icp_analysis_results(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS demo_project_id UUID REFERENCES public.demo_studio_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS demo_id UUID REFERENCES public.demo_studio_demos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS survey_id UUID REFERENCES public.pmf_surveys(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS pmf_discovery_context_idx ON public.pmf_customer_discovery(user_id, validation_context_id);
CREATE INDEX IF NOT EXISTS pmf_surveys_context_idx ON public.pmf_surveys(user_id, validation_context_id);
CREATE INDEX IF NOT EXISTS pmf_analysis_context_idx ON public.pmf_analysis_results(user_id, validation_context_id, created_at DESC);

ALTER TABLE public.pmf_survey_responses
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS participant_hash TEXT;
DROP POLICY IF EXISTS "Public insert responses to published surveys" ON public.pmf_survey_responses;
CREATE UNIQUE INDEX IF NOT EXISTS pmf_survey_verified_participant_unique
  ON public.pmf_survey_responses(survey_id, participant_hash)
  WHERE verified = true AND participant_hash IS NOT NULL;

-- Scoped replacement for the historical one-row-per-user evidence summary.
-- The old pmf_validation_evidence table remains untouched for legacy reports.
CREATE TABLE IF NOT EXISTS public.pmf_context_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  validation_context_id UUID NOT NULL REFERENCES public.prebuild_validation_contexts(id) ON DELETE CASCADE,
  originating_handoff_id UUID REFERENCES public.journey_handoffs(id) ON DELETE SET NULL,
  validation_checklist TEXT[] NOT NULL DEFAULT '{}',
  checklist_timestamps JSONB NOT NULL DEFAULT '{}'::jsonb,
  checklist_saved_at TIMESTAMPTZ,
  survey_results_count INTEGER NOT NULL DEFAULT 0,
  required_signals INTEGER NOT NULL DEFAULT 25,
  sean_ellis_very_disappointed INTEGER NOT NULL DEFAULT 0,
  sean_ellis_somewhat_disappointed INTEGER NOT NULL DEFAULT 0,
  sean_ellis_not_disappointed INTEGER NOT NULL DEFAULT 0,
  sean_ellis_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, validation_context_id)
);
ALTER TABLE public.pmf_context_evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage scoped PMF evidence" ON public.pmf_context_evidence;
CREATE POLICY "Owners manage scoped PMF evidence" ON public.pmf_context_evidence
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS pmf_context_evidence_touch ON public.pmf_context_evidence;
CREATE TRIGGER pmf_context_evidence_touch BEFORE UPDATE ON public.pmf_context_evidence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.pmf_interviews (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  validation_context_id UUID NOT NULL REFERENCES public.prebuild_validation_contexts(id) ON DELETE CASCADE,
  originating_handoff_id UUID REFERENCES public.journey_handoffs(id) ON DELETE SET NULL,
  source_lead_id TEXT,
  interviewee_name TEXT NOT NULL DEFAULT '',
  basic_profile TEXT NOT NULL DEFAULT '',
  segment TEXT NOT NULL DEFAULT '',
  main_feedback TEXT NOT NULL DEFAULT '',
  objections TEXT NOT NULL DEFAULT '',
  missing_features TEXT NOT NULL DEFAULT '',
  interest_level INTEGER NOT NULL DEFAULT 3 CHECK (interest_level BETWEEN 1 AND 5),
  buying_intent TEXT NOT NULL DEFAULT 'medium' CHECK (buying_intent IN ('low','medium','high','ready_to_pay')),
  assumption_fingerprint TEXT,
  assumption_statement TEXT,
  assumption_status TEXT CHECK (assumption_status IN ('confirmed','rejected')),
  landing_page_shown BOOLEAN NOT NULL DEFAULT false,
  solution_pitched BOOLEAN NOT NULL DEFAULT false,
  asked_about_pricing BOOLEAN NOT NULL DEFAULT false,
  joined_waitlist BOOLEAN NOT NULL DEFAULT false,
  referred_someone BOOLEAN NOT NULL DEFAULT false,
  offered_to_pay BOOLEAN NOT NULL DEFAULT false,
  evidence_origin TEXT NOT NULL DEFAULT 'founder_reported' CHECK (evidence_origin IN ('founder_reported','platform_verified')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pmf_interviews_context_idx
  ON public.pmf_interviews(user_id, validation_context_id, created_at);
ALTER TABLE public.pmf_interviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage scoped PMF interviews" ON public.pmf_interviews;
CREATE POLICY "Owners manage scoped PMF interviews" ON public.pmf_interviews
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS pmf_interviews_touch ON public.pmf_interviews;
CREATE TRIGGER pmf_interviews_touch BEFORE UPDATE ON public.pmf_interviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public behavioral evidence is only authoritative after server-side ingestion.
ALTER TABLE public.demo_studio_events
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS viewer_hash TEXT;
ALTER TABLE public.demo_studio_signups
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_id UUID REFERENCES public.demo_studio_demos(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "demo_studio_events_public_insert" ON public.demo_studio_events;
DROP POLICY IF EXISTS "demo_studio_signups_public_insert" ON public.demo_studio_signups;

CREATE UNIQUE INDEX IF NOT EXISTS demo_events_verified_participant_unique
  ON public.demo_studio_events(demo_id, type, viewer_hash);
CREATE UNIQUE INDEX IF NOT EXISTS demo_signups_verified_email_unique
  ON public.demo_studio_signups(demo_id, lower(email))
  WHERE verified = true AND demo_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.demo_studio_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.demo_studio_projects(id) ON DELETE CASCADE,
  demo_id UUID NOT NULL REFERENCES public.demo_studio_demos(id) ON DELETE CASCADE,
  validation_context_id UUID REFERENCES public.prebuild_validation_contexts(id) ON DELETE SET NULL,
  response TEXT NOT NULL CHECK (response IN ('interested','not_for_me','book_call','commitment')),
  objection TEXT,
  viewer_hash TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (demo_id, viewer_hash)
);
CREATE INDEX IF NOT EXISTS demo_responses_context_idx ON public.demo_studio_responses(validation_context_id, created_at DESC);
ALTER TABLE public.demo_studio_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Demo owners read verified responses" ON public.demo_studio_responses;
CREATE POLICY "Demo owners read verified responses" ON public.demo_studio_responses
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.demo_studio_projects p
    WHERE p.id = project_id AND p.owner_id = auth.uid()
  ));

COMMENT ON TABLE public.prebuild_validation_contexts IS
  'Canonical idea-level lineage. NULL context on legacy artifacts is intentional and never inferred.';
COMMENT ON COLUMN public.pmf_interviews.evidence_origin IS
  'Founder-entered interviews are founder_reported; only hosted/platform collection may be platform_verified.';
