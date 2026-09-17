-- The header badge counted only incoming pending requests. The sender of a
-- request that gets accepted was never told, even though the connection
-- requests modal already renders those acceptances.
--
-- This returns ids rather than counts. Which notifications have been seen is
-- tracked per browser in localStorage, not in the database, so the count has to
-- be finished on the client against the same helpers the modal uses. Returning a
-- server-side count would badge forever, because nothing here can know what the
-- user has already acknowledged. See src/lib/connectionSeenState.ts.
--
-- Accepted ids are capped at the 100 most recent so the payload cannot grow
-- without bound on a long-lived account.
CREATE OR REPLACE FUNCTION public.get_workspace_header_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN jsonb_build_object(
      'unreadMessages', 0,
      'pendingConnectionRequestIds', '[]'::jsonb,
      'acceptedConnectionRequestIds', '[]'::jsonb
    )
    ELSE jsonb_build_object(
      'unreadMessages', COALESCE((
        SELECT count(*)
        FROM public.messages m
        JOIN public.conversations c ON c.id = m.conversation_id
        WHERE auth.uid() = ANY (c.participants)
          AND m.sender_id <> auth.uid()
          AND m.is_read = false
          AND m.deleted_at IS NULL
      ), 0),
      'pendingConnectionRequestIds', COALESCE((
        SELECT jsonb_agg(fr.id)
        FROM public.friend_requests fr
        WHERE fr.receiver_id = auth.uid()
          AND fr.status = 'pending'
      ), '[]'::jsonb),
      'acceptedConnectionRequestIds', COALESCE((
        SELECT jsonb_agg(recent.id)
        FROM (
          SELECT fr.id
          FROM public.friend_requests fr
          WHERE fr.sender_id = auth.uid()
            AND fr.status = 'accepted'
          ORDER BY fr.created_at DESC
          LIMIT 100
        ) recent
      ), '[]'::jsonb)
    )
  END;
$function$;

REVOKE ALL ON FUNCTION public.get_workspace_header_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_header_counts() TO authenticated, service_role;

COMMENT ON FUNCTION public.get_workspace_header_counts() IS
  'Workspace header badge inputs: unread direct message count, incoming pending connection request ids, and ids of requests this user sent that were accepted. Ids rather than counts because which ones have been seen is tracked per browser in localStorage.';
