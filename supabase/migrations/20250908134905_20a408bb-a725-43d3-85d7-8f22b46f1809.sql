-- Create tables for third-party analytics integrations
CREATE TABLE public.user_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL, -- 'whatagraph', 'klipfolio', 'tableau', 'powerbi', 'google_analytics', 'facebook_ads', etc.
  provider_name TEXT NOT NULL, -- Display name for the integration
  account_id TEXT, -- Provider-specific account identifier
  access_token TEXT, -- Encrypted access token
  refresh_token TEXT, -- Encrypted refresh token
  token_expires_at TIMESTAMP WITH TIME ZONE,
  connection_status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired', 'error', 'revoked'
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_frequency TEXT NOT NULL DEFAULT 'daily', -- 'hourly', 'daily', 'weekly', 'manual'
  metadata JSONB DEFAULT '{}', -- Provider-specific configuration
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider, account_id)
);

-- Create table for cached analytics data
CREATE TABLE public.analytics_data_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.user_integrations(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL, -- 'metrics', 'campaigns', 'audiences', 'conversions', etc.
  time_period TEXT NOT NULL, -- '24h', '7d', '30d', '90d', '1y'
  data_payload JSONB NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '1 hour'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for custom report templates
CREATE TABLE public.report_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_config JSONB NOT NULL, -- Configuration for widgets, data sources, layout
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for scheduled data refreshes
CREATE TABLE public.data_refresh_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.user_integrations(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL, -- 'sync_metrics', 'sync_campaigns', 'full_refresh'
  schedule_expression TEXT NOT NULL, -- Cron expression
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for integration webhooks
CREATE TABLE public.integration_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.user_integrations(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  webhook_secret TEXT, -- For verifying webhook authenticity
  event_types TEXT[] NOT NULL, -- Array of event types to listen for
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_data_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_refresh_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_webhooks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_integrations
CREATE POLICY "Users can view their own integrations" 
ON public.user_integrations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own integrations" 
ON public.user_integrations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations" 
ON public.user_integrations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations" 
ON public.user_integrations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for analytics_data_cache
CREATE POLICY "Users can view their cached analytics data" 
ON public.analytics_data_cache 
FOR SELECT 
USING (integration_id IN (
  SELECT id FROM public.user_integrations WHERE user_id = auth.uid()
));

CREATE POLICY "Service role can manage analytics cache" 
ON public.analytics_data_cache 
FOR ALL 
USING (true);

-- Create RLS policies for report_templates
CREATE POLICY "Users can view their own templates and public templates" 
ON public.report_templates 
FOR SELECT 
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own templates" 
ON public.report_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" 
ON public.report_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" 
ON public.report_templates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for data_refresh_jobs
CREATE POLICY "Users can view their refresh jobs" 
ON public.data_refresh_jobs 
FOR SELECT 
USING (integration_id IN (
  SELECT id FROM public.user_integrations WHERE user_id = auth.uid()
));

CREATE POLICY "Service role can manage refresh jobs" 
ON public.data_refresh_jobs 
FOR ALL 
USING (true);

-- Create RLS policies for integration_webhooks
CREATE POLICY "Users can manage their integration webhooks" 
ON public.integration_webhooks 
FOR ALL 
USING (integration_id IN (
  SELECT id FROM public.user_integrations WHERE user_id = auth.uid()
));

-- Create indexes for performance
CREATE INDEX idx_user_integrations_user_id ON public.user_integrations(user_id);
CREATE INDEX idx_user_integrations_provider ON public.user_integrations(provider);
CREATE INDEX idx_user_integrations_status ON public.user_integrations(connection_status);
CREATE INDEX idx_analytics_cache_integration_id ON public.analytics_data_cache(integration_id);
CREATE INDEX idx_analytics_cache_expires_at ON public.analytics_data_cache(expires_at);
CREATE INDEX idx_analytics_cache_data_type ON public.analytics_data_cache(data_type, time_period);
CREATE INDEX idx_report_templates_user_id ON public.report_templates(user_id);
CREATE INDEX idx_refresh_jobs_integration_id ON public.data_refresh_jobs(integration_id);
CREATE INDEX idx_refresh_jobs_next_run ON public.data_refresh_jobs(next_run_at) WHERE is_active = true;

-- Create trigger for updating timestamps
CREATE TRIGGER update_user_integrations_updated_at
BEFORE UPDATE ON public.user_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at
BEFORE UPDATE ON public.report_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_refresh_jobs_updated_at
BEFORE UPDATE ON public.data_refresh_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at
BEFORE UPDATE ON public.integration_webhooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to clean up expired cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_analytics_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM analytics_data_cache 
  WHERE expires_at < now();
END;
$$;