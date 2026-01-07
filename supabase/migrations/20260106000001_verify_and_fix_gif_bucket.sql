-- First, check if bucket exists
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'founder-journey-gifs';

-- If the above returns nothing, the bucket doesn't exist. Run the creation below:

-- Create storage bucket for founder journey GIFs (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'founder-journey-gifs',
  'founder-journey-gifs',
  true,
  52428800, -- 50MB
  ARRAY['image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Verify bucket was created
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'founder-journey-gifs';

