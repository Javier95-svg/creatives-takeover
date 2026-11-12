-- First Customer Proof's server-side plan check let free accounts through
-- (found 2026-11-11 in the Phase 6 founder-path dry run).
--
-- first_customer_proof_has_access_v1 returned NULL, not false, for a free
-- (rookie) founder outside a pilot cohort: cohort_pilot_plan_v1 returns NULL,
-- "NULL IN ('rising','pro')" is NULL, and "false OR NULL" is NULL. Every caller
-- guards with "IF NOT first_customer_proof_has_access_v1(...) THEN RAISE", and
-- "NOT NULL" is NULL, so the RAISE never ran and the sprint started anyway.
-- The app hides the feature from free plans, so this was only reachable by
-- calling the database directly, but the paid gate must hold on the server.
--
-- Same rule as before (Rising or Pro, by subscription or by an active pilot
-- cohort's plan); it now always answers true or false.

CREATE OR REPLACE FUNCTION public.first_customer_proof_has_access_v1(p_founder_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    p_founder_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.profiles profile
        WHERE profile.id = p_founder_id
          AND public.normalize_subscription_tier(profile.subscription_tier) IN ('rising', 'pro')
      )
      OR COALESCE(public.cohort_pilot_plan_v1(p_founder_id) IN ('rising', 'pro'), false)
    ),
    false
  );
$function$;
