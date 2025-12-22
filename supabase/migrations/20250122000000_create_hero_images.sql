-- Create hero_images table to store the 4 hero section images
CREATE TABLE IF NOT EXISTS public.hero_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position INTEGER NOT NULL CHECK (position >= 1 AND position <= 4),
  image_url TEXT NOT NULL,
  alt_text TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(position)
);

-- Create index for active images
CREATE INDEX IF NOT EXISTS idx_hero_images_active ON public.hero_images(is_active, position);

-- Enable RLS
ALTER TABLE public.hero_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view active hero images
CREATE POLICY "Anyone can view active hero images"
  ON public.hero_images FOR SELECT
  USING (is_active = true);

-- Admin can manage all hero images
CREATE POLICY "Admin can manage hero images"
  ON public.hero_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND LOWER(auth.users.email) = 'admin@creatives-takeover.com'
    )
  );

-- Create storage bucket for hero images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hero-images',
  'hero-images',
  true, -- Public bucket
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket
-- Admin can upload hero images
CREATE POLICY "Admin can upload hero images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'hero-images' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND LOWER(email) = 'admin@creatives-takeover.com'
  )
);

-- Anyone can view hero images (public bucket)
CREATE POLICY "Hero images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'hero-images');

-- Admin can update hero images
CREATE POLICY "Admin can update hero images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'hero-images' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND LOWER(email) = 'admin@creatives-takeover.com'
  )
);

-- Admin can delete hero images
CREATE POLICY "Admin can delete hero images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'hero-images' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND LOWER(email) = 'admin@creatives-takeover.com'
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hero_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_hero_images_updated_at ON public.hero_images;
CREATE TRIGGER trg_hero_images_updated_at
BEFORE UPDATE ON public.hero_images
FOR EACH ROW EXECUTE FUNCTION update_hero_images_updated_at();

