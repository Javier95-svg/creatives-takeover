-- ========================================
-- VERIFY VC LOGOS AND SOCIAL MEDIA
-- ========================================
-- Run this in Supabase SQL Editor to check if data was saved
-- ========================================

-- Check if logos exist
SELECT
  firm_name,
  slug,
  logo_url,
  linkedin_url,
  crunchbase_url
FROM public.investors
WHERE investor_type = 'vc'
ORDER BY firm_name
LIMIT 10;

-- Count how many VCs have logos
SELECT
  COUNT(*) as total_vcs,
  COUNT(logo_url) as have_logo,
  COUNT(linkedin_url) as have_linkedin,
  COUNT(crunchbase_url) as have_crunchbase
FROM public.investors
WHERE investor_type = 'vc';
