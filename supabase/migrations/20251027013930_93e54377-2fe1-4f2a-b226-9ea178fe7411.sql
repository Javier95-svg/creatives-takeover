-- Fix chatbot_messages RLS policies to prevent unauthorized access
-- Drop existing policies
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.chatbot_messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.chatbot_messages;

-- Create stricter policies that only allow access to authenticated users
CREATE POLICY "Authenticated users can create messages in their conversations"
ON public.chatbot_messages
FOR INSERT
TO authenticated
WITH CHECK (
  conversation_id IN (
    SELECT id FROM public.chatbot_conversations
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can view their own messages"
ON public.chatbot_messages
FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM public.chatbot_conversations
    WHERE user_id = auth.uid()
  )
);

-- Also update chatbot_conversations policies to remove null user_id access
DROP POLICY IF EXISTS "Users can create conversations" ON public.chatbot_conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.chatbot_conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.chatbot_conversations;

CREATE POLICY "Authenticated users can create conversations"
ON public.chatbot_conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their conversations"
ON public.chatbot_conversations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view their conversations"
ON public.chatbot_conversations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);