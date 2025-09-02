
-- 1) Remove any previously inserted sample rows
DELETE FROM public.trends
WHERE article_url LIKE 'https://example.com/%';

-- 2) Recreate the unique index on article_url (case-insensitive)
-- This ensures we don’t insert the same article twice in the future.
DROP INDEX IF EXISTS uq_trends_article_url;
CREATE UNIQUE INDEX uq_trends_article_url
  ON public.trends (lower(article_url));

-- 3) Ensure the active+expires index exists (for fast querying)
CREATE INDEX IF NOT EXISTS idx_trends_active_expires
  ON public.trends (is_active, expires_at DESC);
