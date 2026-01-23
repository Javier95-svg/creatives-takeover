-- Create value_proposition_images table to store the 4 value proposition card images
CREATE TABLE IF NOT EXISTS public.value_proposition_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position INTEGER NOT NULL CHECK (position >= 1 AND position <= 4),
  image_url TEXT NOT NULL,
  alt_text TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(position)
);

CREATE INDEX IF NOT EXISTS idx_value_prop_images_active
  ON public.value_proposition_images (is_active, position);

-- Disable RLS (frontend enforces admin access)
ALTER TABLE public.value_proposition_images DISABLE ROW LEVEL SECURITY;

-- Storage bucket for value proposition images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'value-proposition-images',
  'value-proposition-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (authenticated users can write, public read)
CREATE POLICY "Authenticated users can upload value proposition images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'value-proposition-images' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can update value proposition images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'value-proposition-images' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete value proposition images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'value-proposition-images' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Anyone can view value proposition images"
ON storage.objects FOR SELECT
USING (bucket_id = 'value-proposition-images');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_value_proposition_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_value_proposition_images_updated_at ON public.value_proposition_images;
CREATE TRIGGER trg_value_proposition_images_updated_at
BEFORE UPDATE ON public.value_proposition_images
FOR EACH ROW EXECUTE FUNCTION update_value_proposition_images_updated_at();
