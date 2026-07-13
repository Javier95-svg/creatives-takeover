-- Production-safe DM restoration for databases that predate generated
-- direct-conversation pair columns. The advisory lock still serializes
-- creation for the same pair, while lookup uses the original participants array.

CREATE OR REPLACE FUNCTION public.create_or_get_direct_conversation(p_other_user_id uuid)
RETURNS public.conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := auth.uid();
  v_user_a uuid;
  v_user_b uuid;
  v_conversation public.conversations;
  v_created boolean := false;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_other_user_id IS NULL THEN
    RAISE EXCEPTION 'Recipient user id is required' USING ERRCODE = '22004';
  END IF;

  IF v_self = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot create a direct conversation with yourself'
      USING ERRCODE = '22023';
  END IF;

  v_user_a := LEAST(v_self, p_other_user_id);
  v_user_b := GREATEST(v_self, p_other_user_id);

  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_user_a::text || ':' || v_user_b::text, 0)
  );

  SELECT *
  INTO v_conversation
  FROM public.conversations
  WHERE COALESCE(is_group, false) = false
    AND array_length(participants, 1) = 2
    AND participants @> ARRAY[v_user_a, v_user_b]::uuid[]
  ORDER BY COALESCE(last_message_at, created_at) DESC, created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.conversations (participants, is_group, last_message_at)
    VALUES (ARRAY[v_user_a, v_user_b]::uuid[], false, now())
    RETURNING * INTO v_conversation;

    v_created := true;
  END IF;

  IF v_created THEN
    PERFORM public.set_direct_conversation_request_settings(
      v_conversation.id,
      v_self
    );
  ELSE
    INSERT INTO public.conversation_user_settings (
      conversation_id,
      user_id,
      request_status,
      request_updated_at,
      archived_at
    )
    VALUES (v_conversation.id, v_self, 'accepted', now(), NULL)
    ON CONFLICT (conversation_id, user_id)
    DO UPDATE SET
      request_status = 'accepted',
      request_updated_at = now(),
      archived_at = NULL,
      updated_at = now();
  END IF;

  RETURN v_conversation;
END;
$$;

REVOKE ALL ON FUNCTION public.create_or_get_direct_conversation(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_or_get_direct_conversation(uuid)
  TO authenticated;

COMMENT ON FUNCTION public.create_or_get_direct_conversation(uuid) IS
  'Opens direct conversations using the legacy participants-array schema without requiring generated direct-user columns.';
