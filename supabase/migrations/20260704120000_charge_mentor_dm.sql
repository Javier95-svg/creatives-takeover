-- Charge 3 credits per direct message a founder sends to a mentor, with the
-- FIRST message to each mentor free (so the mentor-first activation path keeps a
-- real free entry point). Enforced by a BEFORE INSERT trigger on messages
-- because messages are inserted directly by the client — a client-side charge
-- would be trivially bypassable. Insufficient balance blocks the message.
--
-- Not charged: mentors replying to founders, group conversations, and the first
-- message to a given mentor. Charges land in the same ledger as every other
-- feature via deduct_credits_atomic (feature key MENTOR_DM).

CREATE OR REPLACE FUNCTION public.charge_mentor_dm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient uuid;
  v_result jsonb;
BEGIN
  -- The other participant in a 1:1 conversation.
  SELECT p INTO v_recipient
  FROM (
    SELECT unnest(participants) AS p
    FROM public.conversations
    WHERE id = NEW.conversation_id AND COALESCE(is_group, false) = false
  ) sub
  WHERE p <> NEW.sender_id
  LIMIT 1;

  IF v_recipient IS NULL THEN
    RETURN NEW; -- group chat or self-message: no charge
  END IF;

  -- Only charge when messaging a mentor account.
  IF NOT EXISTS (SELECT 1 FROM public.mentors WHERE user_id = v_recipient) THEN
    RETURN NEW;
  END IF;

  -- Never charge a mentor for replying.
  IF EXISTS (SELECT 1 FROM public.mentors WHERE user_id = NEW.sender_id) THEN
    RETURN NEW;
  END IF;

  -- First message from this sender in this conversation is free. Exclude the
  -- current client_message_id so a retried upsert of that first message stays
  -- free instead of counting itself as a prior message.
  IF NOT EXISTS (
    SELECT 1 FROM public.messages
    WHERE conversation_id = NEW.conversation_id
      AND sender_id = NEW.sender_id
      AND (NEW.client_message_id IS NULL OR client_message_id IS DISTINCT FROM NEW.client_message_id)
  ) THEN
    RETURN NEW;
  END IF;

  -- Charge 3 credits atomically. client_message_id is the idempotency key so a
  -- retried upsert of the same message never double-charges.
  v_result := public.deduct_credits_atomic(
    NEW.sender_id,
    3,
    'MENTOR_DM',
    NULL,
    jsonb_build_object(
      'idempotencyKey', COALESCE(NEW.client_message_id::text, NEW.id::text),
      'conversation_id', NEW.conversation_id,
      'mentor_user_id', v_recipient
    )
  );

  IF NOT COALESCE((v_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS: Messaging a mentor costs 3 credits.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_charge_mentor_dm ON public.messages;
CREATE TRIGGER trg_charge_mentor_dm
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.charge_mentor_dm();
