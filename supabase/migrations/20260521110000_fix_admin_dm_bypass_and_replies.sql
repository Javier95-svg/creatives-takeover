-- Fix DM reply regression from connection-gated messaging.
-- Admin can start direct messages with anyone; existing participants can reply
-- unless either side has blocked the other.

CREATE OR REPLACE FUNCTION public.enforce_direct_conversation_connected()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant_count INTEGER;
  v_user_a UUID;
  v_user_b UUID;
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.is_group, false) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*), MIN(participant), MAX(participant)
  INTO v_participant_count, v_user_a, v_user_b
  FROM unnest(NEW.participants) AS participant;

  IF v_participant_count <> 2 THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> ALL(NEW.participants) THEN
    RAISE EXCEPTION 'You can only create conversations you participate in'
      USING ERRCODE = '42501';
  END IF;

  IF public.is_admin_user() THEN
    RETURN NEW;
  END IF;

  IF NOT public.are_users_connected(v_user_a, v_user_b) THEN
    RAISE EXCEPTION 'You must be connected before starting a direct message'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_or_get_direct_conversation(p_other_user_id UUID)
RETURNS public.conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self UUID := auth.uid();
  v_user_a UUID;
  v_user_b UUID;
  v_conversation public.conversations;
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

  IF FOUND THEN
    RETURN v_conversation;
  END IF;

  IF NOT public.is_admin_user() AND NOT public.are_users_connected(v_self, p_other_user_id) THEN
    RAISE EXCEPTION 'You must be connected before starting a direct message'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.conversations (participants, is_group, last_message_at)
  VALUES (ARRAY[v_user_a, v_user_b]::UUID[], false, now())
  ON CONFLICT (direct_user_a, direct_user_b)
  DO UPDATE
    SET updated_at = now()
  RETURNING * INTO v_conversation;

  RETURN v_conversation;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_or_get_direct_conversation(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_message_not_blocked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

DROP TRIGGER IF EXISTS messages_enforce_not_blocked ON public.messages;
CREATE TRIGGER messages_enforce_not_blocked
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_message_not_blocked();
