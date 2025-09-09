-- Create helper functions for market intelligence (without cron scheduling)

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

-- Function to get fresh market data for specific query
CREATE OR REPLACE FUNCTION public.get_fresh_market_insights(
  p_industries TEXT[],
  p_keywords TEXT[] DEFAULT '{}',
  p_data_types TEXT[] DEFAULT '{}',
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  data_type TEXT,
  industry TEXT,
  title TEXT,
  summary TEXT,
  relevance_score NUMERIC,
  freshness_score NUMERIC,
  opportunity_score NUMERIC,
  source_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  insights TEXT[],
  market_impact TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mi.id,
    mi.data_type,
    mi.industry,
    COALESCE(mi.data_payload->>'title', 'Market Intelligence') as title,
    COALESCE(mi.data_payload->>'summary', 'No summary available') as summary,
    mi.relevance_score,
    mi.freshness_score,
    COALESCE((mi.data_payload->>'opportunity_score')::NUMERIC, 0) as opportunity_score,
    mds.source_name,
    mi.created_at,
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(mi.data_payload->'insights')),
      ARRAY['General market activity']
    ) as insights,
    COALESCE(mi.data_payload->>'market_impact', 'Unknown') as market_impact
  FROM market_intelligence mi
  JOIN market_data_sources mds ON mi.source_id = mds.id
  WHERE mi.expires_at > now()
    AND mi.freshness_score > 0.1
    AND (cardinality(p_industries) = 0 OR mi.industry = ANY(p_industries))
    AND (cardinality(p_data_types) = 0 OR mi.data_type = ANY(p_data_types))
    AND (cardinality(p_keywords) = 0 OR mi.keywords && p_keywords)
  ORDER BY 
    (mi.relevance_score * mi.freshness_score) DESC, 
    mi.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Add some sample market intelligence data for testing
DO $$
DECLARE
  tech_source_id UUID;
  news_source_id UUID;
  trends_source_id UUID;
BEGIN
  -- Get source IDs
  SELECT id INTO trends_source_id FROM market_data_sources WHERE source_name = 'Google Trends';
  SELECT id INTO news_source_id FROM market_data_sources WHERE source_name = 'News API';
  SELECT id INTO tech_source_id FROM market_data_sources WHERE source_name = 'Market Research DB';
  
  -- Insert sample technology trends
  INSERT INTO market_intelligence (source_id, data_type, industry, keywords, relevance_score, freshness_score, data_payload, expires_at) VALUES
  (trends_source_id, 'trend', 'technology', ARRAY['AI automation', 'machine learning'], 0.9, 0.8, 
   '{"title": "AI Automation Surge", "summary": "AI automation tools seeing 300% growth in enterprise adoption", "opportunity_score": 0.85, "market_impact": "High", "insights": ["AI automation search volume up 40% this month", "Increasing investment activity in AI sector", "New automation opportunities emerging"]}',
   now() + interval '24 hours'),
  
  (trends_source_id, 'trend', 'healthcare', ARRAY['telemedicine', 'digital health'], 0.8, 0.9,
   '{"title": "Telemedicine Expansion", "summary": "Remote healthcare services expanding globally post-pandemic", "opportunity_score": 0.75, "market_impact": "Medium", "insights": ["Telemedicine usage up 200% since 2020", "Regulatory barriers being reduced", "Investment in digital health platforms growing"]}',
   now() + interval '24 hours'),
   
  (news_source_id, 'news', 'fintech', ARRAY['digital banking', 'cryptocurrency'], 0.7, 0.95,
   '{"title": "Digital Banking Revolution", "summary": "Traditional banks accelerating digital transformation initiatives", "opportunity_score": 0.70, "market_impact": "High", "insights": ["Major banks announcing digital-first strategies", "Mobile banking adoption accelerating", "Fintech partnerships increasing"]}',
   now() + interval '24 hours'),

  (tech_source_id, 'ai_insight', 'retail', ARRAY['e-commerce', 'omnichannel'], 0.8, 1.0,
   '{"title": "E-commerce Growth Acceleration", "summary": "AI analysis shows continued strong growth in e-commerce sector with omnichannel strategies becoming essential", "opportunity_score": 0.78, "market_impact": "High", "insights": ["E-commerce growth rate maintaining 15% annually", "Omnichannel experiences becoming table stakes", "Social commerce emerging as key trend"], "analysis_type": "automated_ai", "confidence": 0.85}',
   now() + interval '48 hours'),

  (trends_source_id, 'trend', 'energy', ARRAY['renewable energy', 'solar power'], 0.85, 0.85,
   '{"title": "Renewable Energy Momentum", "summary": "Solar and wind energy installations reaching record highs globally", "opportunity_score": 0.82, "market_impact": "High", "insights": ["Solar installations up 50% year-over-year", "Government incentives driving adoption", "Energy storage solutions in high demand"]}',
   now() + interval '24 hours');
   
  RAISE NOTICE 'Sample market intelligence data inserted successfully';
END $$;