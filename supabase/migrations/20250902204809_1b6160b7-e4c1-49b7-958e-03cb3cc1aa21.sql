-- Purge AI-generated or non-NewsAPI articles from trends
DELETE FROM public.trends
WHERE 
  -- Likely AI-generated sources
  (article_source ILIKE '%perplexity%' OR article_source ILIKE '%openai%' OR article_source ILIKE '%chatgpt%' OR article_source IS NULL)
  OR 
  -- Invalid or missing URLs
  (article_url IS NULL OR article_url !~ '^https?://')
  OR 
  -- Suspicious formatting often from AI generations
  (title ILIKE '%**%' OR description ILIKE '%**%');