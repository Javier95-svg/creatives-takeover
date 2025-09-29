-- Create enhanced conversation system for AI chatbot
CREATE TABLE public.chatbot_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  business_context JSONB DEFAULT '{}',
  conversation_stage TEXT DEFAULT 'welcome',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversation messages table
CREATE TABLE public.chatbot_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.chatbot_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create business insights cache
CREATE TABLE public.business_insights_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  industry TEXT NOT NULL,
  business_stage TEXT NOT NULL,
  insights JSONB NOT NULL,
  confidence_score NUMERIC DEFAULT 0.8,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_insights_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Users can view their own conversations" ON public.chatbot_conversations
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create conversations" ON public.chatbot_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own conversations" ON public.chatbot_conversations
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- RLS policies for messages
CREATE POLICY "Users can view messages in their conversations" ON public.chatbot_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM public.chatbot_conversations 
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

CREATE POLICY "Users can create messages in their conversations" ON public.chatbot_messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.chatbot_conversations 
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

-- RLS policies for insights cache (public read)
CREATE POLICY "Anyone can read business insights" ON public.business_insights_cache
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage insights" ON public.business_insights_cache
  FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_chatbot_conversations_user_id ON public.chatbot_conversations(user_id);
CREATE INDEX idx_chatbot_conversations_session_id ON public.chatbot_conversations(session_id);
CREATE INDEX idx_chatbot_messages_conversation_id ON public.chatbot_messages(conversation_id);
CREATE INDEX idx_chatbot_messages_created_at ON public.chatbot_messages(created_at);
CREATE INDEX idx_business_insights_industry_stage ON public.business_insights_cache(industry, business_stage);
CREATE INDEX idx_business_insights_expires_at ON public.business_insights_cache(expires_at);

-- Function to clean up expired insights
CREATE OR REPLACE FUNCTION public.cleanup_expired_insights()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM business_insights_cache WHERE expires_at < now();
END;
$$;