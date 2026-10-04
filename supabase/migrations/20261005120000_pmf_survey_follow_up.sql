-- PMF survey follow-up: one short "why?" after the Sean Ellis answer, asked in
-- the respondent's own context, stored with the response. The verdict quotes
-- these answers in the customer's own words.
--
-- follow_up_questions_generated counts AI-written questions per survey, so the
-- function can stop calling the model after a cap and use a fixed question.

-- No wrapping transaction: one transaction locking both tables deadlocked
-- against live survey reads. Each statement is idempotent; re-run on timeout.
SET lock_timeout = '5s';

ALTER TABLE public.pmf_surveys
  ADD COLUMN IF NOT EXISTS follow_up_questions_generated integer NOT NULL DEFAULT 0;

ALTER TABLE public.pmf_survey_responses
  ADD COLUMN IF NOT EXISTS follow_up_question text,
  ADD COLUMN IF NOT EXISTS follow_up_answer text;

ALTER TABLE public.pmf_survey_responses
  DROP CONSTRAINT IF EXISTS pmf_survey_responses_follow_up_length;
ALTER TABLE public.pmf_survey_responses
  ADD CONSTRAINT pmf_survey_responses_follow_up_length
  CHECK (
    (follow_up_question IS NULL OR char_length(follow_up_question) <= 300)
    AND (follow_up_answer IS NULL OR char_length(follow_up_answer) <= 2000)
  ) NOT VALID;

-- Atomic increment used by the edge function (service role only).
CREATE OR REPLACE FUNCTION public.claim_pmf_follow_up_slot(p_survey_id uuid, p_cap integer)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH claimed AS (
    UPDATE public.pmf_surveys
    SET follow_up_questions_generated = follow_up_questions_generated + 1
    WHERE id = p_survey_id AND follow_up_questions_generated < p_cap
    RETURNING id
  )
  SELECT EXISTS (SELECT 1 FROM claimed);
$$;

REVOKE ALL ON FUNCTION public.claim_pmf_follow_up_slot(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pmf_follow_up_slot(uuid, integer) TO service_role;

