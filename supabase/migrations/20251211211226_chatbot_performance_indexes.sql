-- Performance optimization indexes for BizMap AI chatbot
-- These indexes improve query performance for common chatbot operations

-- Composite index for chatbot_conversations lookup by session_id and user_id
-- This is the most common query pattern in chatbot-streaming function
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session_user 
ON public.chatbot_conversations(session_id, user_id);

-- Index for market_intelligence queries with freshness_score and created_at
-- Used in chatbot-ai-engine for context loading
CREATE INDEX IF NOT EXISTS idx_market_intelligence_freshness_created 
ON public.market_intelligence(freshness_score DESC, created_at DESC)
WHERE freshness_score >= 0.3;

-- Composite index for chatbot_messages by conversation and creation time
-- Improves message retrieval and ordering
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_conv_created 
ON public.chatbot_messages(conversation_id, created_at DESC);

-- Index for ai_cache lookups by cache_key and expiration
-- Used for response caching optimization
CREATE INDEX IF NOT EXISTS idx_ai_cache_key_expires 
ON public.ai_cache(cache_key, expires_at DESC)
WHERE expires_at > now();

-- Index for chatbot_conversations by updated_at for recent conversations
-- Helps with conversation ordering and cleanup
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_updated 
ON public.chatbot_conversations(updated_at DESC);

-- Index for chatbot_messages by role and created_at
-- Useful for filtering and analytics
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_role_created 
ON public.chatbot_messages(role, created_at DESC);

