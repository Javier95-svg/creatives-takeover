-- Transform trends table to store article data instead of generic trends
-- Add article-specific columns
ALTER TABLE public.trends 
ADD COLUMN article_url TEXT,
ADD COLUMN article_source TEXT,
ADD COLUMN publication_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN summary TEXT,
ADD COLUMN author TEXT;

-- Update existing description column to be summary
COMMENT ON COLUMN public.trends.description IS 'Article summary or trend description';
COMMENT ON COLUMN public.trends.article_url IS 'URL to the original article';
COMMENT ON COLUMN public.trends.article_source IS 'Publication or website name';
COMMENT ON COLUMN public.trends.publication_date IS 'When the article was published';
COMMENT ON COLUMN public.trends.summary IS 'AI-generated summary of the article';
COMMENT ON COLUMN public.trends.author IS 'Article author name';

-- Update the RLS policy to be more descriptive for articles
COMMENT ON TABLE public.trends IS 'Stores trending articles and business insights discovered via AI analysis';