-- Restore Marketplace and mentor Message CTAs for valid linked accounts.
-- Provider/mentor links store auth.users IDs. Requiring a public.profiles row
-- here rejected legitimate accounts whose public profile was not provisioned.

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
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_other_user_id IS NULL THEN
    RAISE EXCEPTION 'Recipient user id is required' USING ERRCODE = '22004';
  END IF;

  IF v_self = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot message yourself' USING ERRCODE = '22023';
  END IF;

  -- Marketplace services and mentors are linked to authenticated account IDs.
  -- A public profile is presentation data and must not gate conversation access.
  IF NOT EXISTS (
    SELECT 1
    FROM auth.users account
    WHERE account.id = p_other_user_id
  ) THEN
    RAISE EXCEPTION 'Recipient is unavailable' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_blocks block
    WHERE (block.blocker_id = v_self AND block.blocked_id = p_other_user_id)
       OR (block.blocker_id = p_other_user_id AND block.blocked_id = v_self)
  ) THEN
    RAISE EXCEPTION 'Unable to contact this user' USING ERRCODE = '42501';
  END IF;

  v_user_a := LEAST(v_self, p_other_user_id);
  v_user_b := GREATEST(v_self, p_other_user_id);

  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_user_a::text || ':' || v_user_b::text, 0)
  );

  INSERT INTO public.conversations (participants, is_group, last_message_at)
  VALUES (ARRAY[v_user_a, v_user_b], false, NULL)
  ON CONFLICT (direct_user_a, direct_user_b)
  DO UPDATE SET updated_at = now()
  RETURNING * INTO v_conversation;

  INSERT INTO public.conversation_user_settings (
    conversation_id,
    user_id,
    request_status,
    request_updated_at
  )
  VALUES (v_conversation.id, v_self, 'accepted', now())
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET
    hidden_at = NULL,
    updated_at = now();

  RETURN v_conversation;
END;
$$;

REVOKE ALL ON FUNCTION public.create_or_get_direct_conversation(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_or_get_direct_conversation(uuid)
  TO authenticated;

COMMENT ON FUNCTION public.create_or_get_direct_conversation(uuid) IS
  'Atomically opens a safe direct conversation with a valid authenticated account, including Marketplace providers and mentors without a public profile row.';
