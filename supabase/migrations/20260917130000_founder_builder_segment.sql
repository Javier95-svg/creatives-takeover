-- Segments accounts into the two groups the onboarding quiz now asks about:
--   founder  - already has something live (site, app, store, or product)
--   builder  - starting from zero
--
-- The quiz writes this going forward. Existing accounts are backfilled from
-- business_stage, which is the only field set on all 268 signed-up profiles:
-- 'idea' means nothing exists yet, anything further along means something does.
-- That is an inference, not an answer, so the quiz overwrites it the moment
-- someone actually states their situation.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS founder_segment text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_founder_segment_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_founder_segment_check
  CHECK (founder_segment IS NULL OR founder_segment IN ('founder', 'builder'));

COMMENT ON COLUMN public.profiles.founder_segment IS
  'founder = already has something live; builder = starting from zero. Set by the onboarding quiz, backfilled from business_stage for accounts that predate the question.';

-- Backfill only where the answer is still unknown, so a later quiz answer or a
-- re-run of this migration never overwrites a stated one.
UPDATE public.profiles
SET founder_segment = CASE
  WHEN lower(btrim(coalesce(business_stage, ''))) IN ('', 'idea') THEN 'builder'
  ELSE 'founder'
END
WHERE founder_segment IS NULL
  AND business_stage IS NOT NULL;

-- Searching by segment stays cheap as the table grows.
CREATE INDEX IF NOT EXISTS profiles_founder_segment_idx
  ON public.profiles (founder_segment)
  WHERE founder_segment IS NOT NULL;
