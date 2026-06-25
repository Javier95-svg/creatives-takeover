-- ================================================
-- PODCAST — "Founders Unleashed" episodes
-- YouTube-backed, admin-managed. Episodes are public (read), but only the
-- admin account may create/update/delete (mirrors the mentors table policy).
-- The thumbnail and in-platform player are derived client-side from the
-- YouTube video id, so no media storage bucket is needed.
-- ================================================

CREATE TABLE IF NOT EXISTS public.podcast_episodes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  description      TEXT        NOT NULL DEFAULT '',
  youtube_url      TEXT        NOT NULL,
  youtube_video_id TEXT        NOT NULL,
  hashtags         TEXT[]      NOT NULL DEFAULT '{}',
  sort_order       INTEGER     NOT NULL DEFAULT 0,
  is_published     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.podcast_episodes ENABLE ROW LEVEL SECURITY;

-- Everyone can view published episodes.
CREATE POLICY "Anyone can view published podcast episodes"
  ON public.podcast_episodes FOR SELECT
  USING (is_published = true);

-- Admin can do everything (including read unpublished/draft episodes).
CREATE POLICY "Admin can manage all podcast episodes"
  ON public.podcast_episodes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'admin@creatives-takeover.com'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'admin@creatives-takeover.com'
    )
  );

-- Newest / highest sort_order first.
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_feed
  ON public.podcast_episodes (is_published, sort_order DESC, created_at DESC);

-- Auto-update updated_at on every write.
CREATE OR REPLACE FUNCTION public.update_podcast_episodes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS podcast_episodes_updated_at ON public.podcast_episodes;
CREATE TRIGGER podcast_episodes_updated_at
  BEFORE UPDATE ON public.podcast_episodes
  FOR EACH ROW EXECUTE FUNCTION public.update_podcast_episodes_updated_at();
