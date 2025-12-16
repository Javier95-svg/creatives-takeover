-- Add support for 'gtm-strategy' chat mode
-- The chat_mode column is already TEXT, so it can accept the new value
-- Update the comment to reflect all supported modes

COMMENT ON COLUMN chatbot_conversations.chat_mode IS 'Chat mode: wizard (guided business planning), freeform (ask me anything), tour-guide (platform help), or gtm-strategy (go-to-market strategy)';

