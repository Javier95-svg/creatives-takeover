-- Let a signed-in account owner open the Connections count on their profile
-- and see the accepted accounts on either side of the request.

CREATE OR REPLACE FUNCTION public.my_connections()
RETURNS TABLE (
  account_id uuid,
  username text,
  full_name text,
  avatar_url text,
  connected_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH connected_accounts AS (
    SELECT
      CASE
        WHEN fr.sender_id = auth.uid() THEN fr.receiver_id
        ELSE fr.sender_id
      END AS account_id,
      max(fr.updated_at) AS connected_at
    FROM public.friend_requests fr
    WHERE auth.uid() IS NOT NULL
      AND fr.status = 'accepted'
      AND (fr.sender_id = auth.uid() OR fr.receiver_id = auth.uid())
    GROUP BY 1
  )
  SELECT
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    connected.connected_at
  FROM connected_accounts connected
  JOIN public.profiles p ON p.id = connected.account_id
  ORDER BY connected.connected_at DESC,
           lower(COALESCE(p.full_name, p.username, ''));
$function$;

REVOKE ALL ON FUNCTION public.my_connections() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_connections() TO authenticated;

COMMENT ON FUNCTION public.my_connections() IS
  'Accepted connections for the signed-in account in either request direction. Returns only safe profile-card fields and never accepts another user id.';

-- Count unique connected accounts too. The directed uniqueness constraint on
-- friend_requests permits historical A->B and B->A rows, but the UI represents
-- the relationship once.
CREATE OR REPLACE FUNCTION public.connection_count(target_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COALESCE(COUNT(DISTINCT CASE
    WHEN sender_id = target_id THEN receiver_id
    ELSE sender_id
  END), 0)::integer
  FROM public.friend_requests
  WHERE status = 'accepted'
    AND (sender_id = target_id OR receiver_id = target_id);
$function$;

GRANT EXECUTE ON FUNCTION public.connection_count(uuid) TO anon, authenticated;
