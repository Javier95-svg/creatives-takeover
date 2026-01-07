-- Create storage bucket for founder journey GIFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'founder-journey-gifs',
  'founder-journey-gifs',
  true, -- Public bucket so GIFs can be viewed
  52428800, -- 50MB limit for GIF files
  ARRAY[
    'image/gif'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket
-- Admin can upload GIFs
CREATE POLICY "Admin can upload founder journey GIFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'founder-journey-gifs'
  AND (
    auth.email() IS NOT NULL 
    AND LOWER(auth.email()) = 'admin@creatives-takeover.com'
  )
);

-- Admin can update/delete GIFs
CREATE POLICY "Admin can update founder journey GIFs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'founder-journey-gifs'
  AND (
    auth.email() IS NOT NULL 
    AND LOWER(auth.email()) = 'admin@creatives-takeover.com'
  )
);

CREATE POLICY "Admin can delete founder journey GIFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'founder-journey-gifs'
  AND (
    auth.email() IS NOT NULL 
    AND LOWER(auth.email()) = 'admin@creatives-takeover.com'
  )
);

-- Public can view GIFs
CREATE POLICY "Public can view founder journey GIFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'founder-journey-gifs');

-- Create founder_journey_gifs table
CREATE TABLE IF NOT EXISTS public.founder_journey_gifs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gif_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.founder_journey_gifs ENABLE ROW LEVEL SECURITY;

-- RLS policies for GIFs table
-- Admin can insert GIFs
CREATE POLICY "Admin can insert founder journey GIFs"
ON public.founder_journey_gifs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.email() IS NOT NULL 
  AND LOWER(auth.email()) = 'admin@creatives-takeover.com'
);

-- Admin can update GIFs
CREATE POLICY "Admin can update founder journey GIFs"
ON public.founder_journey_gifs
FOR UPDATE
TO authenticated
USING (
  auth.email() IS NOT NULL 
  AND LOWER(auth.email()) = 'admin@creatives-takeover.com'
);

-- Admin can delete GIFs
CREATE POLICY "Admin can delete founder journey GIFs"
ON public.founder_journey_gifs
FOR DELETE
TO authenticated
USING (
  auth.email() IS NOT NULL 
  AND LOWER(auth.email()) = 'admin@creatives-takeover.com'
);

-- Public can view active GIFs
CREATE POLICY "Public can view active founder journey GIFs"
ON public.founder_journey_gifs
FOR SELECT
USING (is_active = true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_founder_journey_gifs_active 
ON public.founder_journey_gifs(is_active, uploaded_at DESC);

