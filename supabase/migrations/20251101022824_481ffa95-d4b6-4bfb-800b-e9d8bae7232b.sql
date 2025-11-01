-- Add is_pinned column to chat_sessions table
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Create index for faster queries on pinned conversations
CREATE INDEX IF NOT EXISTS idx_chat_sessions_pinned 
ON public.chat_sessions(user_id, is_pinned, updated_at DESC);