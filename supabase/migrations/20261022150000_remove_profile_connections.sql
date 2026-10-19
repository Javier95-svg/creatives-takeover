-- Allow either person in an accepted connection to remove it.
CREATE OR REPLACE FUNCTION public.remove_profile_connection_v1(p_connection_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to remove a connection.' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.friend_requests
  WHERE status = 'accepted'
    AND (
      (sender_id = auth.uid() AND receiver_id = p_connection_id)
      OR (sender_id = p_connection_id AND receiver_id = auth.uid())
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Accepted connection not found.' USING ERRCODE = 'P0002';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.remove_profile_connection_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_profile_connection_v1(uuid) TO authenticated;

COMMENT ON FUNCTION public.remove_profile_connection_v1(uuid) IS
  'Removes every accepted friend request between the signed-in account and the specified connected account.';

NOTIFY pgrst, 'reload schema';
