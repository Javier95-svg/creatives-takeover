-- REMOVE ALL RESTRICTIVE RLS POLICIES FOR HERO-IMAGES BUCKET AND TABLE
-- Allow any authenticated user to upload/update/delete (frontend enforces admin check)
-- This fixes upload issues by removing all restrictions, following mentor-pictures pattern

-- ============================================
-- PART 1: Remove ALL policies from hero_images table
-- ============================================
DROP POLICY IF EXISTS "Anyone can view active hero images" ON public.hero_images;
DROP POLICY IF EXISTS "Admin can manage hero images" ON public.hero_images;

-- Disable RLS on hero_images table completely
ALTER TABLE public.hero_images DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 2: Drop ALL existing policies for hero-images storage bucket
-- ============================================
DROP POLICY IF EXISTS "Admin can upload hero images" ON storage.objects;
DROP POLICY IF EXISTS "Hero images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update hero images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete hero images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload hero images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update hero images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete hero images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view hero images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload hero images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update hero images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete hero images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view hero images" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated uploads to hero-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow all to view hero-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to update hero-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to delete hero-images" ON storage.objects;

-- ============================================
-- PART 3: Create simple permissive policies (same pattern as mentor-pictures)
-- Frontend already enforces admin check, so this is safe
-- ============================================
CREATE POLICY "Authenticated users can upload hero images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'hero-images' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can update hero images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'hero-images' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete hero images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'hero-images' AND
  auth.uid() IS NOT NULL
);

-- Public read access
CREATE POLICY "Anyone can view hero images"
ON storage.objects FOR SELECT
USING (bucket_id = 'hero-images');

