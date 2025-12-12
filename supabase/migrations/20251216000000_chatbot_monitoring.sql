-- Chatbot Monitoring Schema
-- Tracks errors, metrics, and performance for chatbot system

-- Error logs table
CREATE TABLE IF NOT EXISTS public.chatbot_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL, -- 'auth_failure', 'rate_limit', 'model_error', 'network_error', 'api_key_validation'
  error_code TEXT,
  error_message TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  conversation_id UUID REFERENCES public.chatbot_conversations(id) ON DELETE SET NULL,
  endpoint TEXT, -- 'chatbot-streaming', 'chatbot-ai-engine'
  api_key_name TEXT, -- 'LOVABLE_API_KEY', etc.
  status_code INTEGER,
  model TEXT,
  retry_after INTEGER, -- For rate limits
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Metrics table
CREATE TABLE IF NOT EXISTS public.chatbot_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  conversation_id UUID REFERENCES public.chatbot_conversations(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  response_time_ms INTEGER, -- Response time in milliseconds
  model TEXT,
  message_length INTEGER, -- Length of user message
  response_length INTEGER, -- Length of AI response
  context_length INTEGER, -- Number of messages in context
  ambiguity_score NUMERIC(5, 2), -- 0-100, higher = more ambiguous/nonsensical
  context_quality_score NUMERIC(5, 2), -- 0-100, higher = better context
  cache_hit BOOLEAN DEFAULT FALSE,
  template_match BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- API key validation status table
CREATE TABLE IF NOT EXISTS public.api_key_validation_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT NOT NULL, -- 'LOVABLE_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY'
  valid BOOLEAN NOT NULL,
  error_message TEXT,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_validation_at TIMESTAMPTZ, -- When to validate again
  consecutive_failures INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_chatbot_error_logs_created_at ON public.chatbot_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chatbot_error_logs_error_type ON public.chatbot_error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_chatbot_error_logs_user_id ON public.chatbot_error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_error_logs_session_id ON public.chatbot_error_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_error_logs_conversation_id ON public.chatbot_error_logs(conversation_id);

CREATE INDEX IF NOT EXISTS idx_chatbot_metrics_created_at ON public.chatbot_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chatbot_metrics_user_id ON public.chatbot_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_metrics_session_id ON public.chatbot_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_metrics_success ON public.chatbot_metrics(success);
CREATE INDEX IF NOT EXISTS idx_chatbot_metrics_endpoint ON public.chatbot_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_chatbot_metrics_ambiguity_score ON public.chatbot_metrics(ambiguity_score);

CREATE INDEX IF NOT EXISTS idx_api_key_validation_key_name ON public.api_key_validation_status(key_name);
CREATE INDEX IF NOT EXISTS idx_api_key_validation_validated_at ON public.api_key_validation_status(validated_at DESC);

-- RLS Policies (admin only for now, can be adjusted)
ALTER TABLE public.chatbot_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_validation_status ENABLE ROW LEVEL SECURITY;

-- Admin can view all
CREATE POLICY "Admins can view all error logs"
  ON public.chatbot_error_logs FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' IN (
    SELECT email FROM auth.users WHERE raw_user_meta_data->>'is_admin' = 'true'
  ));

CREATE POLICY "Admins can view all metrics"
  ON public.chatbot_metrics FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' IN (
    SELECT email FROM auth.users WHERE raw_user_meta_data->>'is_admin' = 'true'
  ));

CREATE POLICY "Admins can view API key status"
  ON public.api_key_validation_status FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' IN (
    SELECT email FROM auth.users WHERE raw_user_meta_data->>'is_admin' = 'true'
  ));

-- Service role can insert (for edge functions)
CREATE POLICY "Service role can insert error logs"
  ON public.chatbot_error_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can insert metrics"
  ON public.chatbot_metrics FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can insert API key status"
  ON public.api_key_validation_status FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update API key status"
  ON public.api_key_validation_status FOR UPDATE
  USING (auth.role() = 'service_role');

-- Helper function to calculate error rate
CREATE OR REPLACE FUNCTION public.get_chatbot_error_rate(
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_error_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_requests BIGINT,
  error_count BIGINT,
  error_rate NUMERIC(5, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_requests,
    COUNT(*) FILTER (WHERE NOT success)::BIGINT as error_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE NOT success)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0
    END as error_rate
  FROM public.chatbot_metrics
  WHERE created_at >= p_start_time 
    AND created_at <= p_end_time
    AND (p_error_type IS NULL OR endpoint = p_error_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get high ambiguity responses
CREATE OR REPLACE FUNCTION public.get_high_ambiguity_responses(
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_threshold NUMERIC DEFAULT 70.0
)
RETURNS TABLE (
  id UUID,
  session_id TEXT,
  ambiguity_score NUMERIC(5, 2),
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.session_id,
    cm.ambiguity_score,
    cm.created_at
  FROM public.chatbot_metrics cm
  WHERE cm.created_at >= p_start_time 
    AND cm.created_at <= p_end_time
    AND cm.ambiguity_score >= p_threshold
    AND cm.success = true
  ORDER BY cm.ambiguity_score DESC, cm.created_at DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get recent auth failures
CREATE OR REPLACE FUNCTION public.get_recent_auth_failures(
  p_hours INTEGER DEFAULT 1
)
RETURNS TABLE (
  id UUID,
  error_message TEXT,
  api_key_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cel.id,
    cel.error_message,
    cel.api_key_name,
    cel.created_at
  FROM public.chatbot_error_logs cel
  WHERE cel.error_type = 'auth_failure'
    AND cel.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
  ORDER BY cel.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

