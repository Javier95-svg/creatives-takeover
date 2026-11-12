-- Founders could not save a Traction Engine week (found 2026-11-11): every
-- save failed with "permission denied for table traction_engine_weekly_logs".
--
-- 20260930162000_traction_measurement_v2.sql revoked INSERT, UPDATE and DELETE
-- on traction_engine_weekly_logs and traction_engine_experiments from
-- authenticated, so writes go through a SECURITY DEFINER function. The
-- save_traction_week the page calls (20261004120000) was created SECURITY
-- INVOKER, so it ran with the founder's rights and was refused. Production had
-- no weekly logs at all.
--
-- Running it as definer is safe: every write uses v_user_id := auth.uid(), it
-- raises when there is no signed-in user, the experiments delete is scoped to
-- that user's log, and a sprint id is only kept when that user owns the sprint.
-- The enforce_traction_platform_verification trigger still checks any
-- "platform_verified" claim on the row.

ALTER FUNCTION public.save_traction_week(jsonb, jsonb) SECURITY DEFINER;
ALTER FUNCTION public.save_traction_week(jsonb, jsonb) SET search_path = public;
REVOKE ALL ON FUNCTION public.save_traction_week(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_traction_week(jsonb, jsonb) TO authenticated, service_role;
