-- Add message notification support to community_notifications table
-- This extends the existing notification system to support direct messages

-- Add conversation_id column to link notifications to conversations
ALTER TABLE public.community_notifications
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Add message_id column to reference the specific message
ALTER TABLE public.community_notifications
ADD COLUMN IF NOT EXISTS message_id UUID;

-- Add index on conversation_id for efficient queries
CREATE INDEX IF NOT EXISTS idx_community_notifications_conversation_id 
ON public.community_notifications(conversation_id);

-- Add index on message_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_community_notifications_message_id 
ON public.community_notifications(message_id);

-- Create function to notify message recipient
CREATE OR REPLACE FUNCTION public.notify_message_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participants UUID[];
  v_recipient_id UUID;
BEGIN
  -- Get conversation participants
  SELECT participants INTO v_participants
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  -- Find the recipient (the user who is not the sender)
  -- For 1-on-1 conversations, participants array has 2 elements
  IF array_length(v_participants, 1) = 2 THEN
    -- Find the recipient (the one who is not the sender)
    SELECT participant_id INTO v_recipient_id
    FROM unnest(v_participants) AS participant_id
    WHERE participant_id != NEW.sender_id
    LIMIT 1;
  ELSE
    -- For group conversations, we'd need more logic
    -- For now, skip notification for group chats (can be extended later)
    RETURN NEW;
  END IF;

  -- Don't create notification if sender is the same as recipient (self-messages)
  IF v_recipient_id IS NULL OR v_recipient_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  -- Create notification for the recipient
  INSERT INTO public.community_notifications (
    user_id,
    actor_id,
    notification_type,
    conversation_id,
    message_id,
    metadata
  ) VALUES (
    v_recipient_id,
    NEW.sender_id,
    'message',
    NEW.conversation_id,
    NEW.id,
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'message_id', NEW.id
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger to fire after message insert
DROP TRIGGER IF EXISTS messages_notify_recipient ON public.messages;

CREATE TRIGGER messages_notify_recipient
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_message_recipient();

-- Add comment for documentation
COMMENT ON FUNCTION public.notify_message_recipient() IS 'Creates a notification for the recipient when a new message is inserted. Only works for 1-on-1 conversations.';
COMMENT ON COLUMN public.community_notifications.conversation_id IS 'References the conversation this notification is about (for message notifications)';
COMMENT ON COLUMN public.community_notifications.message_id IS 'References the specific message that triggered this notification';

