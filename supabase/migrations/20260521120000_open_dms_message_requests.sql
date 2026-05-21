-- Open direct messages to all accounts and route non-network inbound DMs into Requests.

ALTER TABLE public.conversation_user_settings
ADD COLUMN IF NOT EXISTS request_status TEXT NOT NULL DEFAULT 'accepted',
ADD COLUMN IF NOT EXISTS request_updated_at TIMESTAMPTZ;

DO $dm_request_status_constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_user_settings_request_status_check'
      AND conrelid = 'public.conversation_user_settings'::regclass
  ) THEN
    ALTER TABLE public.conversation_user_settings
    ADD CONSTRAINT conversation_user_settings_request_status_check
    CHECK (request_status IN ('accepted', 'pending', 'refused'));
  END IF;
END;
$dm_request_status_constraint$;

CREATE INDEX IF NOT EXISTS conversation_user_settings_request_status_idx
ON public.conversation_user_settings (user_id, request_status, request_updated_at DESC);

CREATE OR REPLACE FUNCTION public.is_admin_user_id(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $dm_is_admin_user_id$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = p_user_id
      AND lower(trim(u.email)) = 'admin@creatives-takeover.com'
  );
$dm_is_admin_user_id$;

GRANT EXECUTE ON FUNCTION public.is_admin_user_id(UUID) TO authenticated;

INSERT INTO public.conversation_user_settings (
  conversation_id,
  user_id,
  request_status,
  request_updated_at
)
SELECT
  c.id,
  participant.user_id,
  'accepted',
  COALESCE(c.last_message_at, c.created_at, now())
FROM public.conversations c
CROSS JOIN LATERAL unnest(c.participants) AS participant(user_id)
ON CONFLICT (conversation_id, user_id)
DO UPDATE
SET request_status = COALESCE(public.conversation_user_settings.request_status, 'accepted'),
    request_updated_at = COALESCE(public.conversation_user_settings.request_updated_at, EXCLUDED.request_updated_at);

CREATE OR REPLACE FUNCTION public.enforce_direct_conversation_connected()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $dm_enforce_direct_conversation$
DECLARE
  v_participant_count INTEGER;
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.is_group, false) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO v_participant_count
  FROM unnest(NEW.participants) AS participant;

  IF v_participant_count <> 2 THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> ALL(NEW.participants) THEN
    RAISE EXCEPTION 'You can only create conversations you participate in'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$dm_enforce_direct_conversation$;

CREATE OR REPLACE FUNCTION public.set_direct_conversation_request_settings(
  p_conversation_id UUID,
  p_sender_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $dm_set_request_settings$
DECLARE
  v_conversation public.conversations;
  v_participant UUID;
  v_current_status TEXT;
  v_next_status TEXT;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT *
  INTO v_conversation
  FROM public.conversations
  WHERE id = p_conversation_id;

  IF NOT FOUND OR COALESCE(v_conversation.is_group, false) THEN
    RETURN;
  END IF;

  INSERT INTO public.conversation_user_settings (
    conversation_id,
    user_id,
    request_status,
    request_updated_at,
    archived_at
  )
  VALUES (
    p_conversation_id,
    p_sender_id,
    'accepted',
    v_now,
    NULL
  )
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE
  SET request_status = 'accepted',
      request_updated_at = v_now,
      archived_at = NULL,
      updated_at = v_now;

  FOREACH v_participant IN ARRAY v_conversation.participants LOOP
    IF v_participant = p_sender_id THEN
      CONTINUE;
    END IF;

    SELECT request_status
    INTO v_current_status
    FROM public.conversation_user_settings
    WHERE conversation_id = p_conversation_id
      AND user_id = v_participant;

    IF public.is_admin_user_id(p_sender_id) OR public.are_users_connected(p_sender_id, v_participant) THEN
      v_next_status := 'accepted';
    ELSIF v_current_status = 'accepted' THEN
      v_next_status := 'accepted';
    ELSE
      v_next_status := 'pending';
    END IF;

    INSERT INTO public.conversation_user_settings (
      conversation_id,
      user_id,
      request_status,
      request_updated_at,
      archived_at
    )
    VALUES (
      p_conversation_id,
      v_participant,
      v_next_status,
      v_now,
      NULL
    )
    ON CONFLICT (conversation_id, user_id)
    DO UPDATE
    SET request_status = v_next_status,
        request_updated_at = v_now,
        archived_at = CASE
          WHEN v_next_status IN ('accepted', 'pending') THEN NULL
          ELSE public.conversation_user_settings.archived_at
        END,
        updated_at = v_now;
  END LOOP;
END;
$dm_set_request_settings$;

CREATE OR REPLACE FUNCTION public.initialize_direct_conversation_requests()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $dm_initialize_requests$
BEGIN
  IF COALESCE(NEW.is_group, false) THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> ALL(NEW.participants) THEN
    RETURN NEW;
  END IF;

  PERFORM public.set_direct_conversation_request_settings(NEW.id, auth.uid());
  RETURN NEW;
END;
$dm_initialize_requests$;

DROP TRIGGER IF EXISTS conversations_initialize_message_requests ON public.conversations;
CREATE TRIGGER conversations_initialize_message_requests
AFTER INSERT ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.initialize_direct_conversation_requests();

CREATE OR REPLACE FUNCTION public.create_or_get_direct_conversation(p_other_user_id UUID)
RETURNS public.conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $dm_create_direct_conversation$
DECLARE
  v_self UUID := auth.uid();
  v_user_a UUID;
  v_user_b UUID;
  v_conversation public.conversations;
  v_created BOOLEAN := false;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '42501';
  END IF;

  IF p_other_user_id IS NULL THEN
    RAISE EXCEPTION 'Recipient user id is required'
      USING ERRCODE = '22004';
  END IF;

  IF v_self = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot create a direct conversation with yourself'
      USING ERRCODE = '22023';
  END IF;

  v_user_a := LEAST(v_self, p_other_user_id);
  v_user_b := GREATEST(v_self, p_other_user_id);

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_a::text || ':' || v_user_b::text, 0));

  SELECT *
  INTO v_conversation
  FROM public.conversations
  WHERE direct_user_a = v_user_a
    AND direct_user_b = v_user_b
    AND COALESCE(is_group, false) = false
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.conversations (participants, is_group, last_message_at)
    VALUES (ARRAY[v_user_a, v_user_b]::UUID[], false, now())
    ON CONFLICT (direct_user_a, direct_user_b)
    DO UPDATE
      SET updated_at = now()
    RETURNING * INTO v_conversation;

    v_created := true;
  END IF;

  IF v_created THEN
    PERFORM public.set_direct_conversation_request_settings(v_conversation.id, v_self);
  ELSE
    INSERT INTO public.conversation_user_settings (
      conversation_id,
      user_id,
      request_status,
      request_updated_at,
      archived_at
    )
    VALUES (
      v_conversation.id,
      v_self,
      'accepted',
      now(),
      NULL
    )
    ON CONFLICT (conversation_id, user_id)
    DO UPDATE
    SET request_status = 'accepted',
        request_updated_at = now(),
        archived_at = NULL,
        updated_at = now();
  END IF;

  RETURN v_conversation;
END;
$dm_create_direct_conversation$;

GRANT EXECUTE ON FUNCTION public.create_or_get_direct_conversation(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_message_not_blocked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $dm_enforce_message_not_blocked$
DECLARE
  v_participant UUID;
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT participant
  INTO v_participant
  FROM public.conversations c
  CROSS JOIN LATERAL unnest(c.participants) AS participant
  WHERE c.id = NEW.conversation_id
    AND participant <> NEW.sender_id
  LIMIT 1;

  IF v_participant IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_blocks ub
    WHERE (ub.blocker_id = v_participant AND ub.blocked_id = NEW.sender_id)
       OR (ub.blocker_id = NEW.sender_id AND ub.blocked_id = v_participant)
  ) THEN
    RAISE EXCEPTION 'This conversation is blocked'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$dm_enforce_message_not_blocked$;

DROP TRIGGER IF EXISTS messages_enforce_not_blocked ON public.messages;
CREATE TRIGGER messages_enforce_not_blocked
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_message_not_blocked();

CREATE OR REPLACE FUNCTION public.route_message_request_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $dm_route_message_request$
BEGIN
  PERFORM public.set_direct_conversation_request_settings(NEW.conversation_id, NEW.sender_id);
  RETURN NEW;
END;
$dm_route_message_request$;

DROP TRIGGER IF EXISTS messages_route_message_request_status ON public.messages;
CREATE TRIGGER messages_route_message_request_status
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.route_message_request_status();
