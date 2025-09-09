-- Create supporting functions and data without cron scheduling

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

-- Add some sample market intelligence data for testing
DO $$
DECLARE
  tech_source_id UUID;
  news_source_id UUID;
  trends_source_id UUID;
BEGIN
  -- Get source IDs
  SELECT id INTO tech_source_id FROM market_data_sources WHERE source_name = 'Market Research DB';
  SELECT id INTO news_source_id FROM market_data_sources WHERE source_name = 'News API';
  SELECT id INTO trends_source_id FROM market_data_sources WHERE source_name = 'Google Trends';
  
  -- Insert sample technology trends
  INSERT INTO market_intelligence (source_id, data_type, industry, keywords, relevance_score, freshness_score, data_payload, expires_at) VALUES
  (trends_source_id, 'trend', 'technology', ARRAY['AI automation', 'machine learning'], 0.9, 0.8, 
   '{"title": "AI Automation Surge", "summary": "AI automation tools seeing 300% growth in enterprise adoption", "opportunity_score": 0.85, "market_impact": "High", "insights": ["Enterprise AI adoption accelerating", "Automation reducing operational costs by 40%", "New job categories emerging in AI management"]}',
   now() + interval '24 hours'),
  
  (trends_source_id, 'trend', 'healthcare', ARRAY['telemedicine', 'digital health'], 0.8, 0.9,
   '{"title": "Telemedicine Expansion", "summary": "Remote healthcare services expanding globally post-pandemic", "opportunity_score": 0.75, "market_impact": "Medium", "insights": ["Telemedicine usage up 3800% since 2020", "Regulatory barriers decreasing", "Patient satisfaction scores improving"]}',
   now() + interval '24 hours'),
   
  (news_source_id, 'news', 'fintech', ARRAY['digital banking', 'cryptocurrency'], 0.7, 0.95,
   '{"title": "Digital Banking Revolution", "summary": "Traditional banks accelerating digital transformation initiatives", "opportunity_score": 0.70, "market_impact": "High", "insights": ["Branch closures accelerating globally", "Mobile banking adoption at all-time high", "Neobanks gaining market share"]}',
   now() + interval '24 hours'),

  (tech_source_id, 'ai_insight', 'retail', ARRAY['e-commerce', 'omnichannel'], 0.85, 1.0,
   '{"title": "E-commerce Growth Acceleration", "summary": "AI analysis shows sustained e-commerce growth with omnichannel strategies leading", "opportunity_score": 0.80, "market_impact": "High", "insights": ["E-commerce sales up 15% YoY", "Omnichannel retailers outperforming by 30%", "Social commerce emerging as key channel"], "analysis_type": "automated_ai", "confidence": 0.85}',
   now() + interval '48 hours'),

  (news_source_id, 'news', 'manufacturing', ARRAY['Industry 4.0', 'automation'], 0.75, 0.85,
   '{"title": "Smart Manufacturing Investment Wave", "summary": "Major manufacturers investing heavily in Industry 4.0 technologies", "opportunity_score": 0.65, "market_impact": "Medium", "insights": ["$50B+ invested in smart manufacturing in 2024", "IoT sensor deployment growing 25% annually", "Predictive maintenance reducing downtime by 20%"]}',
   now() + interval '24 hours'),

  (trends_source_id, 'trend', 'energy', ARRAY['renewable energy', 'sustainability'], 0.9, 0.75,
   '{"title": "Renewable Energy Breakthrough", "summary": "Solar and wind energy costs hitting record lows, driving mass adoption", "opportunity_score": 0.90, "market_impact": "High", "insights": ["Solar costs down 80% in past decade", "Renewable energy job creation accelerating", "Energy storage solutions becoming viable"]}',
   now() + interval '24 hours');
   
  RAISE NOTICE 'Sample market intelligence data inserted successfully';
END $$;