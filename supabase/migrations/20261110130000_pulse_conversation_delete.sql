-- Founders can delete their own Pulse Home conversations from the
-- "Conversations" history. Until now no policy allowed a client delete, so the
-- request silently removed nothing. Messages go with the conversation through
-- the existing ON DELETE CASCADE on chatbot_messages.conversation_id.
--
-- Only the owner, and only Pulse Home conversations: the restrictive
-- pulse_home_conversation_owner policy already requires user_id = auth.uid()
-- for these rows, and this policy grants nothing for other chat modes.

DROP POLICY IF EXISTS "Users delete their own Pulse conversations" ON public.chatbot_conversations;
CREATE POLICY "Users delete their own Pulse conversations" ON public.chatbot_conversations
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id AND purpose = 'pulse_home');
