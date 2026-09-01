-- Podcast is a chronological feed: newest upload first. Keep an index that
-- matches the public feed query now that sort_order is no longer used.
DROP INDEX IF EXISTS public.idx_podcast_episodes_feed;

CREATE INDEX IF NOT EXISTS idx_podcast_episodes_feed
  ON public.podcast_episodes (is_published, created_at DESC);
