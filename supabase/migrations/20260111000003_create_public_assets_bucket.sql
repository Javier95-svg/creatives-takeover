-- Create public-assets storage bucket for VC logos and other public files
-- This bucket will store images that need to be publicly accessible

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets',
  'public-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload
CREATE POLICY "Authenticated users can upload public assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public-assets');

-- Create policy to allow public read access
CREATE POLICY "Public assets are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'public-assets');

-- Create policy to allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update public assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'public-assets');

-- Create policy to allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete public assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'public-assets');
