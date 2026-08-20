-- Ramp the adaptive onboarding flow from 10% to 50% of new founders.
--
-- The control flow (control_v6) is not merely the older variant, it is the
-- weaker one on both axes that matter:
--
--   * It never collects startupBrief, which is the most-consumed
--     personalization field in the product (ICP Builder, generate-daily-mission,
--     DashboardFocusEditor). Control founders therefore get generic output from
--     tools whose whole promise is specificity.
--   * It runs 11-12 steps against the adaptive flow's 7, and one of those steps
--     asks a question whose options no longer match the enum the rest of the
--     system branches on (no 'team' blocker, no 'build_product' or 'launch'
--     goal, no 'repeatable_growth' evidence).
--
-- So the adaptive flow is shorter AND collects strictly more useful data.
--
-- 50 rather than 100 deliberately. Completion rate is the one thing that could
-- still be worse on the adaptive flow, and nobody has measured it yet -- see
-- get_onboarding_dashboard_outcomes_v1, which reports completionRate and
-- medianCompletionSeconds split by rollout_variant. Holding a real control arm
-- keeps that comparison possible. Once the numbers are in, this is a one-line
-- change to 100 (or back to 10).
--
-- Assignment is deterministic per user and existing sessions never change
-- variant, so ramping only affects founders who have not started yet. Nobody
-- mid-quiz is moved.

UPDATE public.onboarding_rollout_config
SET adaptive_percent = 50,
    updated_at = now()
WHERE singleton = true;

-- The table is seeded with a single row, but a missing row would silently fall
-- back to the hardcoded 10% default inside begin_onboarding_v1.
INSERT INTO public.onboarding_rollout_config (singleton, adaptive_percent)
VALUES (true, 50)
ON CONFLICT (singleton) DO UPDATE
  SET adaptive_percent = EXCLUDED.adaptive_percent,
      updated_at = now();

DO $guard$
DECLARE
  v_percent integer;
BEGIN
  SELECT adaptive_percent INTO v_percent
  FROM public.onboarding_rollout_config
  WHERE singleton = true;

  IF v_percent IS DISTINCT FROM 50 THEN
    RAISE EXCEPTION
      'Adaptive onboarding rollout is %, expected 50', COALESCE(v_percent::text, 'missing');
  END IF;

  RAISE NOTICE 'Adaptive onboarding rollout set to %%%', v_percent;
END
$guard$;
