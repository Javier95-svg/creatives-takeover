-- Preserve existing responses as usage unknown; only explicit product use enters
-- the Sean Ellis percentage. Concept feedback remains available to the owner.
ALTER TABLE public.pmf_survey_responses
  ADD COLUMN IF NOT EXISTS product_usage text NOT NULL DEFAULT 'unknown'
    CHECK (product_usage IN ('unknown', 'used', 'concept_only'));
ALTER TABLE public.pmf_survey_responses ALTER COLUMN sean_ellis_answer DROP NOT NULL;
ALTER TABLE public.pmf_survey_responses ADD CONSTRAINT pmf_usage_answer_consistency
  CHECK ((product_usage = 'concept_only' AND sean_ellis_answer IS NULL)
    OR (product_usage IN ('used', 'unknown') AND sean_ellis_answer IS NOT NULL));

-- Rebuild the cached eligible counts so historical, unscreened responses do not
-- continue contributing through a fallback aggregate.
UPDATE public.pmf_context_evidence SET survey_results_count = 0,
  sean_ellis_very_disappointed = 0, sean_ellis_somewhat_disappointed = 0,
  sean_ellis_not_disappointed = 0;
