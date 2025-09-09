-- Enable pg_cron and pg_net extensions for scheduled market data refresh
SELECT cron.schedule(
  'market-intelligence-refresh',
  '0 */6 * * *', -- Every 6 hours
  $$
  SELECT
    net.http_post(
        url:='https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/market-intelligence-refresh',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjamxheWJqbm96cWJzb3h6Ym9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDM4MzQsImV4cCI6MjA3MTExOTgzNH0.mDo9bIJKgEYqEKkVzHawTw9eefIq3BzrywmwztBhzng"}'::jsonb,
        body:='{"scheduled": true, "timestamp": "' || now()::text || '"}'::jsonb
    ) as request_id;
  $$
);

-- Schedule cleanup of old market data every day at 2 AM
SELECT cron.schedule(
  'market-data-cleanup',
  '0 2 * * *', -- Daily at 2 AM
  $$
  SELECT public.update_market_data_freshness();
  $$
);

-- Create a function to get market intelligence summary for dashboard
CREATE OR REPLACE FUNCTION public.get_market_intelligence_summary(
  p_industry TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  data_type TEXT,
  industry TEXT,
  recent_insights INTEGER,
  avg_relevance NUMERIC,
  avg_freshness NUMERIC,
  top_sources TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mi.data_type,
    mi.industry,
    COUNT(*)::INTEGER as recent_insights,
    ROUND(AVG(mi.relevance_score), 2) as avg_relevance,
    ROUND(AVG(mi.freshness_score), 2) as avg_freshness,
    ARRAY_AGG(DISTINCT mds.source_name ORDER BY mds.source_name) as top_sources
  FROM market_intelligence mi
  JOIN market_data_sources mds ON mi.source_id = mds.id
  WHERE mi.expires_at > now()
    AND mi.freshness_score > 0.1
    AND (p_industry IS NULL OR mi.industry = p_industry)
    AND mi.created_at > now() - interval '7 days'
  GROUP BY mi.data_type, mi.industry
  ORDER BY recent_insights DESC, avg_relevance DESC
  LIMIT p_limit;
END;
$$;

-- Create RLS policy for the summary function
CREATE POLICY "Anyone can view market intelligence summary" 
  ON public.market_intelligence FOR SELECT 
  USING (true);

-- Create a view for trending market topics
CREATE OR REPLACE VIEW public.trending_market_topics AS
SELECT 
  unnest(keywords) as keyword,
  industry,
  data_type,
  COUNT(*) as mention_count,
  AVG(relevance_score) as avg_relevance,
  MAX(created_at) as last_seen
FROM market_intelligence 
WHERE expires_at > now() 
  AND freshness_score > 0.3
  AND created_at > now() - interval '48 hours'
GROUP BY unnest(keywords), industry, data_type
HAVING COUNT(*) > 1
ORDER BY mention_count DESC, avg_relevance DESC;

-- Enable RLS on the view (it inherits from the base table)
-- Views automatically inherit RLS from their base tables

-- Add some sample market intelligence data for testing
DO $$
DECLARE
  tech_source_id UUID;
  news_source_id UUID;
BEGIN
  -- Get source IDs
  SELECT id INTO tech_source_id FROM market_data_sources WHERE source_name = 'Google Trends';
  SELECT id INTO news_source_id FROM market_data_sources WHERE source_name = 'News API';
  
  -- Insert sample technology trends
  INSERT INTO market_intelligence (source_id, data_type, industry, keywords, relevance_score, freshness_score, data_payload, expires_at) VALUES
  (tech_source_id, 'trend', 'technology', ARRAY['AI automation', 'machine learning'], 0.9, 0.8, 
   '{"title": "AI Automation Surge", "summary": "AI automation tools seeing 300% growth in enterprise adoption", "opportunity_score": 0.85, "market_impact": "High"}',
   now() + interval '24 hours'),
  
  (tech_source_id, 'trend', 'healthcare', ARRAY['telemedicine', 'digital health'], 0.8, 0.9,
   '{"title": "Telemedicine Expansion", "summary": "Remote healthcare services expanding globally post-pandemic", "opportunity_score": 0.75, "market_impact": "Medium"}',
   now() + interval '24 hours'),
   
  (news_source_id, 'news', 'fintech', ARRAY['digital banking', 'cryptocurrency'], 0.7, 0.95,
   '{"title": "Digital Banking Revolution", "summary": "Traditional banks accelerating digital transformation initiatives", "opportunity_score": 0.70, "market_impact": "High"}',
   now() + interval '24 hours');
   
  RAISE NOTICE 'Sample market intelligence data inserted successfully';
END $$;