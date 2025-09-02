
-- 1) Ensure each article URL only appears once (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS uq_trends_article_url
ON public.trends (lower(article_url));

-- 2) Speed up queries that filter for active & non-expired items
CREATE INDEX IF NOT EXISTS idx_trends_active_expires
ON public.trends (is_active, expires_at DESC);
