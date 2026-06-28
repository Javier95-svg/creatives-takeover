-- Sean Ellis 40% test (manual tally) for PMF Lab.
-- Additive only — extends the per-user pmf_validation_evidence row to store the
-- canonical PMF metric. % very disappointed = very / (very + somewhat + not).
-- Existing RLS policy "Users can manage own pmf_validation_evidence" already
-- covers these columns (per-user, FOR ALL).

ALTER TABLE public.pmf_validation_evidence
  ADD COLUMN IF NOT EXISTS sean_ellis_very_disappointed INTEGER NOT NULL DEFAULT 0
    CHECK (sean_ellis_very_disappointed >= 0),
  ADD COLUMN IF NOT EXISTS sean_ellis_somewhat_disappointed INTEGER NOT NULL DEFAULT 0
    CHECK (sean_ellis_somewhat_disappointed >= 0),
  ADD COLUMN IF NOT EXISTS sean_ellis_not_disappointed INTEGER NOT NULL DEFAULT 0
    CHECK (sean_ellis_not_disappointed >= 0),
  ADD COLUMN IF NOT EXISTS sean_ellis_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.pmf_validation_evidence.sean_ellis_very_disappointed IS
  'Sean Ellis 40% test: count of respondents who would be "very disappointed" without the product.';
