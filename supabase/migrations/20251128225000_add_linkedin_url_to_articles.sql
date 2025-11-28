-- Add linkedin_post_url column to stories_articles table
-- This allows articles to be created from LinkedIn post URLs instead of direct markdown content

-- Add linkedin_post_url column (nullable to support existing articles)
ALTER TABLE public.stories_articles
ADD COLUMN IF NOT EXISTS linkedin_post_url TEXT;

-- Make body_content nullable to support both old and new article types
ALTER TABLE public.stories_articles
ALTER COLUMN body_content DROP NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN public.stories_articles.linkedin_post_url IS 'LinkedIn post URL for embedded posts. If provided, this will be used instead of body_content.';

