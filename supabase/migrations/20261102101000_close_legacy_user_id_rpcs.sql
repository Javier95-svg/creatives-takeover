-- Close the seven user-id functions the browser used to call (2026-11-02).
--
-- Run after the app release that calls the *_mine versions is live (see
-- 20261102100000_security_lockdown.sql). Each of these acted for whatever
-- p_user_id the caller passed. Server code (service role, triggers, other
-- SECURITY DEFINER functions) keeps calling them as before.

REVOKE EXECUTE ON FUNCTION public.check_and_award_badges(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_usage(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_daily_challenge(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_mvp_credits_atomic(uuid, integer, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_mvp_credit_balance(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_task_deadline_expired(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.check_and_award_badges(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_and_increment_usage(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_daily_challenge(uuid, uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_mvp_credits_atomic(uuid, integer, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_mvp_credit_balance(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_referral_code(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_task_deadline_expired(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
