-- Complete the adaptive onboarding rollout: 50% -> 100%.
--
-- control_v6 does not ask the canonical questions. It back-derives them through
-- the lossy mapping in toCanonicalAnswers (src/components/OnboardingForm.tsx):
-- 'active_users' collapses to 'conversations', an unmatched blocker falls back
-- to 'accountability', and the result is honestly tagged legacy_partial. It
-- also never collects runway, revenue band, or working days at all, so half of
-- every founder cohort produced a context the dashboard could only approximate
-- from.
--
-- The 50/50 split existed to prove the adaptive flow does not hurt completion.
-- Compare the arms before applying this, using the cohort index on
-- (rollout_variant, started_at, completed_at):
--
--   SELECT rollout_variant,
--          count(*) AS started,
--          count(*) FILTER (WHERE status = 'completed') AS completed,
--          round(100.0 * count(*) FILTER (WHERE status = 'completed')
--                / NULLIF(count(*), 0), 1) AS completion_pct
--   FROM public.onboarding_sessions
--   WHERE started_at >= now() - interval '30 days'
--   GROUP BY rollout_variant;
--
-- If adaptive completion is materially worse, do not apply this yet -- fix the
-- flow first. The rollout percentage stays server-owned either way, so it can
-- be walked back with a plain UPDATE without a deploy.
--
-- Existing sessions never change variant: begin_onboarding_v1 assigns once and
-- returns any in-progress session untouched, so nobody mid-flow is disturbed.

UPDATE public.onboarding_rollout_config
SET
  adaptive_percent = 100,
  updated_at = now()
WHERE singleton = true
  AND adaptive_percent < 100;
