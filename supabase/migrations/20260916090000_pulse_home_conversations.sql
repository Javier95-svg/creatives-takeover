-- Isolate the preview assistant without changing legacy chat modes or billing.
ALTER TABLE public.chatbot_conversations ADD COLUMN IF NOT EXISTS purpose text;
CREATE INDEX IF NOT EXISTS chatbot_home_latest ON public.chatbot_conversations (user_id, created_at DESC) WHERE purpose = 'pulse_home';
CREATE UNIQUE INDEX IF NOT EXISTS chatbot_home_turn_once ON public.chatbot_messages
  (conversation_id, role, (metadata->>'homeTurnId')) WHERE metadata->>'homeTurnId' IS NOT NULL;

-- Restrictive policies constrain any broader legacy policies, while leaving
-- non-home conversations unchanged. Service-role writes are owner-checked in
-- the endpoint; clients only create/read home conversations and read messages.
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY pulse_home_conversation_owner ON public.chatbot_conversations AS RESTRICTIVE
  FOR ALL TO public USING (purpose IS DISTINCT FROM 'pulse_home' OR user_id = auth.uid())
  WITH CHECK (purpose IS DISTINCT FROM 'pulse_home' OR user_id = auth.uid());
CREATE POLICY pulse_home_message_owner ON public.chatbot_messages AS RESTRICTIVE
  FOR ALL TO public USING (EXISTS (
    SELECT 1 FROM public.chatbot_conversations c WHERE c.id = conversation_id
    AND (c.purpose IS DISTINCT FROM 'pulse_home' OR c.user_id = auth.uid())
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.chatbot_conversations c WHERE c.id = conversation_id
    AND (c.purpose IS DISTINCT FROM 'pulse_home' OR c.user_id = auth.uid())
  ));
