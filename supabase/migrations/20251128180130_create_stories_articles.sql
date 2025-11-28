-- Create storage bucket for story banner images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'story-banners',
  'story-banners',
  true, -- Public bucket for banner images
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket
-- Admin can upload banners
CREATE POLICY "Admin can upload story banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'story-banners' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND LOWER(email) = 'admin@creatives-takeover.com'
  )
);

-- Anyone can view banners (public bucket)
CREATE POLICY "Story banners are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'story-banners');

-- Admin can update banners
CREATE POLICY "Admin can update story banners"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'story-banners' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND LOWER(email) = 'admin@creatives-takeover.com'
  )
);

-- Admin can delete banners
CREATE POLICY "Admin can delete story banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'story-banners' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND LOWER(email) = 'admin@creatives-takeover.com'
  )
);

-- Create stories_articles table
CREATE TABLE IF NOT EXISTS public.stories_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  banner_image_url TEXT,
  body_content TEXT NOT NULL,
  excerpt TEXT,
  hashtags TEXT[] DEFAULT '{}',
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMP WITH TIME ZONE,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.stories_articles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can read published articles
CREATE POLICY "Published articles are viewable by everyone"
ON public.stories_articles FOR SELECT
USING (status = 'published');

-- Admin can read all articles (including drafts)
CREATE POLICY "Admin can view all articles"
ON public.stories_articles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND LOWER(email) = 'admin@creatives-takeover.com'
  )
);

-- Only admin can create articles
CREATE POLICY "Admin can create articles"
ON public.stories_articles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND LOWER(email) = 'admin@creatives-takeover.com'
  )
  AND author_id = auth.uid()
);

-- Only admin can update articles
CREATE POLICY "Admin can update articles"
ON public.stories_articles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND LOWER(email) = 'admin@creatives-takeover.com'
  )
);

-- Only admin can delete articles
CREATE POLICY "Admin can delete articles"
ON public.stories_articles FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND LOWER(email) = 'admin@creatives-takeover.com'
  )
);

-- Indexes
CREATE UNIQUE INDEX idx_stories_articles_slug ON public.stories_articles(slug);
CREATE INDEX idx_stories_articles_status_published ON public.stories_articles(status, published_at DESC);
CREATE INDEX idx_stories_articles_hashtags ON public.stories_articles USING GIN(hashtags);
CREATE INDEX idx_stories_articles_author ON public.stories_articles(author_id);
CREATE INDEX idx_stories_articles_created ON public.stories_articles(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stories_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER stories_articles_updated_at
BEFORE UPDATE ON public.stories_articles
FOR EACH ROW
EXECUTE FUNCTION update_stories_articles_updated_at();

-- Function to set published_at when status changes to 'published'
CREATE OR REPLACE FUNCTION set_stories_articles_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status != 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at = NOW();
  END IF;
  IF NEW.status = 'draft' THEN
    NEW.published_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set published_at
CREATE TRIGGER stories_articles_published_at
BEFORE UPDATE ON public.stories_articles
FOR EACH ROW
EXECUTE FUNCTION set_stories_articles_published_at();

