-- Shared founder journey read model and evidence manifest.
-- Every tool writes the outcome state it has actually earned: draft, ready,
-- verified, or reviewed. Recommendations can then cite the artifact versions
-- and sources that influenced them.

CREATE TABLE IF NOT EXISTS public.journey_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool text NOT NULL CHECK (tool IN (
    'icp_builder', 'demo_studio', 'pmf_lab', 'mvp_builder', 'gtm_strategist', 'traction_engine'
  )),
  stage text NOT NULL CHECK (stage IN (
    'identity', 'prototype', 'validation', 'building', 'launch', 'traction'
  )),
  artifact_type text NOT NULL,
  artifact_id text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'verified', 'reviewed')),
  quality_checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_manifest jsonb NOT NULL DEFAULT '{"version":1,"sources":[]}'::jsonb,
  completion_score numeric CHECK (completion_score IS NULL OR completion_score BETWEEN 0 AND 100),
  completed_at timestamptz,
  verified_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tool, artifact_type, artifact_id)
);

CREATE INDEX IF NOT EXISTS journey_outcomes_user_stage_idx
  ON public.journey_outcomes(user_id, stage, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS journey_outcomes_manifest_gin_idx
  ON public.journey_outcomes USING gin(evidence_manifest);

ALTER TABLE public.journey_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their journey outcomes" ON public.journey_outcomes;
CREATE POLICY "Users manage their journey outcomes" ON public.journey_outcomes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage journey outcomes" ON public.journey_outcomes;
CREATE POLICY "Admins manage journey outcomes" ON public.journey_outcomes
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS set_journey_outcomes_updated_at ON public.journey_outcomes;
CREATE TRIGGER set_journey_outcomes_updated_at
  BEFORE UPDATE ON public.journey_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.journey_expert_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_outcome_id uuid REFERENCES public.journey_outcomes(id) ON DELETE SET NULL,
  topic text NOT NULL,
  request text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'responded', 'closed')),
  substantive_response text,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  response_due_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  first_response_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (substantive_response IS NULL OR length(trim(substantive_response)) >= 50),
  CHECK (status NOT IN ('responded', 'closed') OR first_response_at IS NOT NULL),
  CHECK (first_response_at IS NULL OR first_response_at >= submitted_at)
);

CREATE INDEX IF NOT EXISTS journey_expert_reviews_sla_idx
  ON public.journey_expert_reviews(status, response_due_at)
  WHERE status IN ('pending', 'in_review');

ALTER TABLE public.journey_expert_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their expert reviews" ON public.journey_expert_reviews;
CREATE POLICY "Users read their expert reviews" ON public.journey_expert_reviews
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users request expert reviews" ON public.journey_expert_reviews;
CREATE POLICY "Users request expert reviews" ON public.journey_expert_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND public.normalize_subscription_tier(profiles.subscription_tier) = 'pro'
    )
  );

DROP POLICY IF EXISTS "Admins manage expert reviews" ON public.journey_expert_reviews;
CREATE POLICY "Admins manage expert reviews" ON public.journey_expert_reviews
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS set_journey_expert_reviews_updated_at ON public.journey_expert_reviews;
CREATE TRIGGER set_journey_expert_reviews_updated_at
  BEFORE UPDATE ON public.journey_expert_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE VIEW public.journey_expert_review_sla
WITH (security_invoker = true)
AS
SELECT
  review.id,
  review.user_id,
  review.journey_outcome_id,
  outcome.tool,
  outcome.artifact_type,
  review.topic,
  review.request,
  review.status,
  review.substantive_response,
  review.reviewer_id,
  review.submitted_at,
  review.response_due_at,
  review.first_response_at,
  review.closed_at,
  CASE
    WHEN review.first_response_at IS NOT NULL AND review.first_response_at <= review.response_due_at THEN 'met'
    WHEN review.first_response_at IS NOT NULL THEN 'missed'
    WHEN now() > review.response_due_at THEN 'overdue'
    WHEN now() > review.response_due_at - interval '6 hours' THEN 'due_soon'
    ELSE 'on_track'
  END AS sla_status,
  CASE
    WHEN review.first_response_at IS NULL THEN NULL
    ELSE round(extract(epoch FROM (review.first_response_at - review.submitted_at)) / 60.0)::integer
  END AS response_minutes
FROM public.journey_expert_reviews AS review
LEFT JOIN public.journey_outcomes AS outcome ON outcome.id = review.journey_outcome_id;

GRANT SELECT ON public.journey_expert_review_sla TO authenticated;

COMMENT ON TABLE public.journey_outcomes IS 'Founder-owned read model of the six connected outcome contracts and their evidence provenance.';
COMMENT ON TABLE public.journey_expert_reviews IS 'Pro expert review queue with attributable first-response timestamps for the 48-hour SLA.';
