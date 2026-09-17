-- Connection request emails never reached anyone. Of 26 requests since the
-- feature shipped on 2026-08-25, zero emails were delivered.
--
-- The trigger on friend_requests dispatches to send-connection-request-email with
--   Authorization: Bearer <private.service_config.supabase_service_key>
-- and the function compared that against its own SUPABASE_SERVICE_ROLE_KEY. Those
-- are both service-role credentials for this project but not the same string, so
-- every genuine dispatch was rejected with HTTP 401 before the function ran. The
-- stored key was verified as a valid, unexpired service_role JWT, so refreshing
-- it changed nothing; the two values are simply different representations.
--
-- send-dm-notification-email survived the same situation only because it falls
-- back to verifying the queued row, which is why direct message emails kept
-- working while this path was silently dead.
--
-- This gives the function a way to check the token against the value the outbox
-- actually sends. The check stays strict equality and still fails closed. The
-- secret never leaves the database: the function returns a boolean, and execute
-- is revoked from anon and authenticated so it cannot be used as an oracle.
CREATE OR REPLACE FUNCTION public.verify_outbox_secret(p_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT value FROM private.service_config WHERE key = 'supabase_service_key')
      = NULLIF(btrim(COALESCE(p_token, '')), ''),
    false
  );
$function$;

REVOKE ALL ON FUNCTION public.verify_outbox_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_outbox_secret(text) TO service_role;

COMMENT ON FUNCTION public.verify_outbox_secret(text) IS
  'True when the presented token equals the outbox service key in private.service_config. Returns only a boolean; service_role only.';
