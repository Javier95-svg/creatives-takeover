-- Phase 1A: Add "Ask Me Anything" mode to chatbot_conversations
ALTER TABLE chatbot_conversations
ADD COLUMN chat_mode TEXT DEFAULT 'wizard',
ADD COLUMN context_loaded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN related_session_id UUID REFERENCES chat_sessions(id);

-- Add index for faster context retrieval
CREATE INDEX idx_chatbot_conv_user_mode 
ON chatbot_conversations(user_id, chat_mode, updated_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN chatbot_conversations.chat_mode IS 'Chat mode: wizard (guided flow) or freeform (ask me anything)';
COMMENT ON COLUMN chatbot_conversations.context_loaded_at IS 'Timestamp when business context was last loaded for this conversation';
COMMENT ON COLUMN chatbot_conversations.related_session_id IS 'Reference to the chat session (launch report) this conversation is related to';