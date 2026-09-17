-- The workspace header lost the unread message badge that the legacy navigation
-- carried, so a new direct message arrived with no visible signal. There was
-- never a badge for incoming connection requests at all.
--
-- The legacy bar got its number from useMessaging({ autoLoad: true }), which
-- loads every conversation and opens realtime subscriptions. That is far more
-- than a header badge needs, and the header renders on every workspace route.
-- This returns both counts in one query instead.
--
-- The unread rule matches get_inbox_v2 exactly, messages in a conversation the
-- caller participates in, not sent by them, not read, not deleted, so the badge
-- and the inbox can never disagree.
CREATE OR REPLACE FUNCTION public.get_workspace_header_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN jsonb_build_object('unreadMessages', 0, 'pendingConnectionRequests', 0)
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
      'pendingConnectionRequests', COALESCE((
        SELECT count(*)
        FROM public.friend_requests fr
        WHERE fr.receiver_id = auth.uid()
          AND fr.status = 'pending'
      ), 0)
    )
  END;
$function$;

REVOKE ALL ON FUNCTION public.get_workspace_header_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_header_counts() TO authenticated, service_role;

COMMENT ON FUNCTION public.get_workspace_header_counts() IS
  'Badge counts for the workspace header: unread direct messages and pending incoming connection requests, scoped to the calling user.';
