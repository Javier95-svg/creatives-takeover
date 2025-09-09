-- Create market data tables for real-time intelligence
CREATE TABLE public.market_data_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_name TEXT NOT NULL UNIQUE,
  api_endpoint TEXT,
  last_updated_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.market_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL,
  data_type TEXT NOT NULL, -- 'trend', 'news', 'competitor', 'market_size', 'regulation'
  industry TEXT,
  geographic_region TEXT,
  keywords TEXT[],
  data_payload JSONB NOT NULL,
  relevance_score NUMERIC DEFAULT 0,
  freshness_score NUMERIC DEFAULT 1.0, -- decreases over time
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (source_id) REFERENCES market_data_sources(id)
);

CREATE TABLE public.market_insights_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  query_params JSONB NOT NULL,
  insights_data JSONB NOT NULL,
  confidence_score NUMERIC DEFAULT 0.5,
  data_sources TEXT[] DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '6 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.market_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_insights_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for market data (public read, service role write)
CREATE POLICY "Public can view market data sources" 
  ON public.market_data_sources FOR SELECT USING (true);

CREATE POLICY "Public can view market intelligence" 
  ON public.market_intelligence FOR SELECT 
  USING (expires_at > now() AND freshness_score > 0.1);

CREATE POLICY "Service role can manage market data" 
  ON public.market_data_sources FOR ALL USING (true);

CREATE POLICY "Service role can manage market intelligence" 
  ON public.market_intelligence FOR ALL USING (true);

CREATE POLICY "Public can view cached insights" 
  ON public.market_insights_cache FOR SELECT 
  USING (expires_at > now());

CREATE POLICY "Service role can manage insights cache" 
  ON public.market_insights_cache FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX idx_market_intelligence_industry ON public.market_intelligence(industry);
CREATE INDEX idx_market_intelligence_data_type ON public.market_intelligence(data_type);
CREATE INDEX idx_market_intelligence_expires_at ON public.market_intelligence(expires_at);
CREATE INDEX idx_market_intelligence_relevance ON public.market_intelligence(relevance_score DESC);
CREATE INDEX idx_market_intelligence_keywords ON public.market_intelligence USING GIN(keywords);
CREATE INDEX idx_market_insights_cache_key ON public.market_insights_cache(cache_key);
CREATE INDEX idx_market_insights_expires ON public.market_insights_cache(expires_at);

-- Insert initial data sources
INSERT INTO public.market_data_sources (source_name, api_endpoint, metadata) VALUES
  ('Google Trends', 'https://trends.google.com/trends/api', '{"type": "trend_analysis", "real_time": true}'),
  ('News API', 'https://newsapi.org/v2', '{"type": "news_aggregation", "categories": ["business", "technology"]}'),
  ('Social Media Monitor', 'internal', '{"type": "social_sentiment", "platforms": ["twitter", "linkedin", "reddit"]}'),
  ('Market Research DB', 'internal', '{"type": "market_sizing", "coverage": "global"}'),
  ('Regulatory Tracker', 'internal', '{"type": "regulation_changes", "jurisdictions": ["US", "EU", "APAC"]}');

-- Function to update freshness scores (decay over time)
CREATE OR REPLACE FUNCTION public.update_market_data_freshness()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Decay freshness score based on age
  UPDATE market_intelligence 
  SET 
    freshness_score = GREATEST(0.1, 1.0 - (EXTRACT(EPOCH FROM (now() - created_at)) / 86400.0)),
    updated_at = now()
  WHERE freshness_score > 0.1 AND expires_at > now();
  
  -- Clean up expired data
  DELETE FROM market_intelligence WHERE expires_at < now();
  DELETE FROM market_insights_cache WHERE expires_at < now();
END;
$$;

-- Trigger to update updated_at timestamps
CREATE TRIGGER update_market_data_sources_updated_at
  BEFORE UPDATE ON public.market_data_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_market_intelligence_updated_at
  BEFORE UPDATE ON public.market_intelligence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();