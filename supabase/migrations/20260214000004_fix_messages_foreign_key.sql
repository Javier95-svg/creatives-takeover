-- Add foreign key constraint with cascade delete to fix conversation deletion persistence
-- This ensures messages are automatically deleted when their parent conversation is deleted

ALTER TABLE public.messages
ADD CONSTRAINT fk_messages_conversation_id
FOREIGN KEY (conversation_id)
REFERENCES public.conversations(id)
ON DELETE CASCADE;

-- Add index for better query performance on conversation lookups
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
ON public.messages(conversation_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT fk_messages_conversation_id ON public.messages IS
'Ensures messages are cascade-deleted when their conversation is deleted. Fixes bug where deleted conversations would reappear after refresh.';
