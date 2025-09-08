-- Create ai_cache table for caching AI responses
CREATE TABLE public.ai_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  response_data JSONB NOT NULL,
  cost_estimate DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

-- Create ai_request_logs table for telemetry
CREATE TABLE public.ai_request_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  function_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER,
  cost_estimate DECIMAL,
  latency_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_ai_cache_key ON public.ai_cache(cache_key);
CREATE INDEX idx_ai_cache_expires_at ON public.ai_cache(expires_at);
CREATE INDEX idx_ai_request_logs_user_id ON public.ai_request_logs(user_id);
CREATE INDEX idx_ai_request_logs_created_at ON public.ai_request_logs(created_at);

-- Enable RLS
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_request_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_cache (internal use only)
CREATE POLICY "Service role can manage ai_cache" ON public.ai_cache
  FOR ALL USING (true);

-- RLS policies for ai_request_logs  
CREATE POLICY "Users can view their own request logs" ON public.ai_request_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage request logs" ON public.ai_request_logs
  FOR ALL USING (true);

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM ai_cache WHERE expires_at < now();
END;
$$;