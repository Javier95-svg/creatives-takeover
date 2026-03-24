-- Expand accelerator records so Insighta can render founder-focused profiles and filters.

ALTER TABLE public.funding_opportunities
ADD COLUMN IF NOT EXISTS program_duration TEXT,
ADD COLUMN IF NOT EXISTS program_format TEXT,
ADD COLUMN IF NOT EXISTS focus_stage TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS focus_sectors TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS equity_taken TEXT,
ADD COLUMN IF NOT EXISTS funding_offered TEXT,
ADD COLUMN IF NOT EXISTS cohort_geography TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS application_deadline_info TEXT,
ADD COLUMN IF NOT EXISTS notable_alumni JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.funding_opportunities.program_duration IS 'Founder-facing program length such as 12 weeks or 6 months.';
COMMENT ON COLUMN public.funding_opportunities.program_format IS 'Remote, in-person, hybrid, or another founder-visible delivery format.';
COMMENT ON COLUMN public.funding_opportunities.focus_stage IS 'Stages the accelerator is best suited for, such as pre-seed or seed.';
COMMENT ON COLUMN public.funding_opportunities.focus_sectors IS 'Primary sectors or markets the accelerator targets.';
COMMENT ON COLUMN public.funding_opportunities.equity_taken IS 'Founder-facing equity terms, for example 7% or non-dilutive.';
COMMENT ON COLUMN public.funding_opportunities.funding_offered IS 'Cash investment, stipend, credits, or a concise founder-facing funding summary.';
COMMENT ON COLUMN public.funding_opportunities.cohort_geography IS 'Regions where founders can be based when applying.';
COMMENT ON COLUMN public.funding_opportunities.application_deadline_info IS 'Rolling basis or a concise application-deadline summary.';
COMMENT ON COLUMN public.funding_opportunities.notable_alumni IS 'JSON array of notable alumni company names.';

CREATE INDEX IF NOT EXISTS idx_funding_focus_stage ON public.funding_opportunities USING GIN(focus_stage);
CREATE INDEX IF NOT EXISTS idx_funding_focus_sectors ON public.funding_opportunities USING GIN(focus_sectors);
CREATE INDEX IF NOT EXISTS idx_funding_cohort_geography ON public.funding_opportunities USING GIN(cohort_geography);

UPDATE public.funding_opportunities
SET
  funding_offered = COALESCE(funding_offered, funding_amount),
  focus_sectors = CASE
    WHEN cardinality(focus_sectors) = 0 AND keywords IS NOT NULL THEN keywords
    ELSE focus_sectors
  END,
  cohort_geography = CASE
    WHEN cardinality(cohort_geography) = 0 AND location IS NOT NULL THEN location
    ELSE cohort_geography
  END
WHERE type = 'accelerator';
