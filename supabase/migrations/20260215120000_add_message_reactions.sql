-- Create message_reactions table for emoji reactions
CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable Row Level Security
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_reactions
-- Users can view reactions in their conversations
CREATE POLICY "Users can view reactions in their conversations"
ON public.message_reactions FOR SELECT
USING (
  message_id IN (
    SELECT m.id FROM public.messages m
    JOIN public.conversations c ON m.conversation_id = c.id
    WHERE auth.uid() = ANY(c.participants)
  )
);

-- Users can add reactions to messages in their conversations
CREATE POLICY "Users can add reactions to messages in their conversations"
ON public.message_reactions FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  message_id IN (
    SELECT m.id FROM public.messages m
    JOIN public.conversations c ON m.conversation_id = c.id
    WHERE auth.uid() = ANY(c.participants)
  )
);

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions"
ON public.message_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON public.message_reactions(user_id);

-- Add comment for documentation
COMMENT ON TABLE public.message_reactions IS
'Stores emoji reactions to messages. Allows users to react to messages with emojis (like Instagram/Telegram).';
