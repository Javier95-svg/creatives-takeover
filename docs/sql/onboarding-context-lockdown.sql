-- Run only after the onboarding-context edge function is deployed and a real
-- onboarding completion and focus edit have succeeded through it.
--
-- After this, the browser can no longer call the onboarding write functions
-- directly, so the stage stored for every account is the one the server
-- derived from the answers. The edge function keeps working because it calls
-- the *_as_v1 functions with the service role.
--
-- To undo: GRANT EXECUTE ON FUNCTION ... TO authenticated; for the same two.

REVOKE EXECUTE ON FUNCTION public.complete_onboarding_v1(uuid, jsonb, jsonb, jsonb, jsonb, text, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_onboarding_focus_v1(jsonb, jsonb, text, jsonb) FROM authenticated;
