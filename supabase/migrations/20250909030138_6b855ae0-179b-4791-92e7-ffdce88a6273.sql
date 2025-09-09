-- Tighten RLS and fix linter error by removing broad write policies and invoker security

-- Drop overly-permissive policies
DROP POLICY IF EXISTS "Service role can manage market data" ON public.market_data_sources;
DROP POLICY IF EXISTS "Service role can manage market intelligence" ON public.market_intelligence;
DROP POLICY IF EXISTS "Service role can manage insights cache" ON public.market_insights_cache;
DROP POLICY IF EXISTS "Anyone can view market intelligence summary" ON public.market_intelligence;

-- Recreate only safe READ policies (writes via service role bypass RLS)
DO $$ BEGIN
  -- Ensure SELECT policies exist as intended (idempotent)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='market_data_sources' AND policyname='Public can view market data sources'
  ) THEN
    CREATE POLICY "Public can view market data sources" 
      ON public.market_data_sources FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='market_intelligence' AND policyname='Public can view market intelligence'
  ) THEN
    CREATE POLICY "Public can view market intelligence" 
      ON public.market_intelligence FOR SELECT 
      USING (expires_at > now() AND freshness_score > 0.1);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='market_insights_cache' AND policyname='Public can view cached insights'
  ) THEN
    CREATE POLICY "Public can view cached insights" 
      ON public.market_insights_cache FOR SELECT 
      USING (expires_at > now());
  END IF;
END $$;

-- Recreate summary function explicitly as SECURITY INVOKER (default) to satisfy linter
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
SECURITY INVOKER
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