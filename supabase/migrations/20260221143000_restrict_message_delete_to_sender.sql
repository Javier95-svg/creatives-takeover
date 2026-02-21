-- Restrict DM deletion to the original sender.
-- This replaces the broader participant-based delete policy.

ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_delete_conversation_participant" ON public.messages;
DROP POLICY IF EXISTS "Users can delete messages in their conversations" ON public.messages;

CREATE POLICY "messages_delete_sender_only" ON public.messages
FOR DELETE
USING (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = conversation_id
      AND auth.uid() = ANY (c.participants)
  )
);
