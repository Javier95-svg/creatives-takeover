-- Add reddit_discussions column to market_validation_scores table
-- This stores Reddit posts/comments related to the business idea

ALTER TABLE public.market_validation_scores 
ADD COLUMN IF NOT EXISTS reddit_discussions JSONB DEFAULT '[]'::jsonb;

-- Index for querying Reddit discussions
CREATE INDEX IF NOT EXISTS idx_reddit_discussions_gin ON public.market_validation_scores 
USING GIN (reddit_discussions);

-- Add comment explaining the column
COMMENT ON COLUMN public.market_validation_scores.reddit_discussions IS 
'Array of Reddit discussions (posts/comments) relevant to the business idea, including sentiment analysis and relevance scores';

