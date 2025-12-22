-- Remove RLS policies for hero_images table and hero-images storage bucket
-- This allows unrestricted access for admin uploads

-- Drop all policies on hero_images table
DROP POLICY IF EXISTS "Anyone can view active hero images" ON public.hero_images;
DROP POLICY IF EXISTS "Admin can manage hero images" ON public.hero_images;

-- Disable RLS on hero_images table
ALTER TABLE public.hero_images DISABLE ROW LEVEL SECURITY;

-- Drop all policies on hero-images storage bucket
DROP POLICY IF EXISTS "Admin can upload hero images" ON storage.objects;
DROP POLICY IF EXISTS "Hero images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update hero images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete hero images" ON storage.objects;

