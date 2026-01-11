-- ========================================
-- VERIFY SLUGS IN SUPABASE
-- ========================================
-- Run this in Supabase SQL Editor to check if slugs exist

-- Check all VCs and their slugs
SELECT
  id,
  firm_name,
  slug,
  CASE
    WHEN slug IS NULL THEN '❌ NULL'
    WHEN slug = '' THEN '❌ EMPTY'
    ELSE '✅ OK'
  END as status
FROM public.investors
WHERE investor_type = 'vc'
ORDER BY firm_name;

-- Count how many VCs are missing slugs
SELECT
  COUNT(*) as total_vcs,
  COUNT(slug) as vcs_with_slug,
  COUNT(*) - COUNT(slug) as vcs_missing_slug
FROM public.investors
WHERE investor_type = 'vc';

-- If you see missing slugs, run this to regenerate them:
-- UPDATE public.investors
-- SET slug = lower(
--   regexp_replace(
--     regexp_replace(firm_name, '[^a-zA-Z0-9\s-]', '', 'g'),
--     '\s+', '-', 'g'
--   )
-- )
-- WHERE slug IS NULL OR slug = '';
