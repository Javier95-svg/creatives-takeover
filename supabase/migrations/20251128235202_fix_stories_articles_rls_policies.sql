-- Fix RLS policies for stories_articles table
-- Replace direct auth.users queries with is_admin_user() function
-- This fixes the "permission denied for table users" error

-- Drop existing policies that query auth.users directly
DROP POLICY IF EXISTS "Admin can view all articles" ON public.stories_articles;
DROP POLICY IF EXISTS "Admin can create articles" ON public.stories_articles;
DROP POLICY IF EXISTS "Admin can update articles" ON public.stories_articles;
DROP POLICY IF EXISTS "Admin can delete articles" ON public.stories_articles;

-- Recreate policies using is_admin_user() function
-- Admin can read all articles (including drafts)
CREATE POLICY "Admin can view all articles"
ON public.stories_articles FOR SELECT
USING (
  public.is_admin_user() = true
);

-- Only admin can create articles
CREATE POLICY "Admin can create articles"
ON public.stories_articles FOR INSERT
WITH CHECK (
  public.is_admin_user() = true
  AND author_id = auth.uid()
);

-- Only admin can update articles
CREATE POLICY "Admin can update articles"
ON public.stories_articles FOR UPDATE
USING (
  public.is_admin_user() = true
);

-- Only admin can delete articles
CREATE POLICY "Admin can delete articles"
ON public.stories_articles FOR DELETE
USING (
  public.is_admin_user() = true
);

