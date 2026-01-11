-- ========================================
-- UPLOAD ALL VC LOGOS AND SOCIAL MEDIA
-- ========================================
-- This script backfills logos and social media links for ALL 28 VCs
-- Run this in Supabase SQL Editor
-- ========================================

-- 1. Y Combinator
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/ycombinator.com',
  twitter_url = 'https://twitter.com/ycombinator',
  linkedin_url = 'https://www.linkedin.com/company/y-combinator/',
  facebook_url = 'https://www.facebook.com/YCombinator',
  youtube_url = 'https://www.youtube.com/ycombinator',
  crunchbase_url = 'https://www.crunchbase.com/organization/y-combinator'
WHERE firm_name = 'Y Combinator';

-- 2. Techstars
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/techstars.com',
  twitter_url = 'https://twitter.com/techstars',
  linkedin_url = 'https://www.linkedin.com/company/techstars/',
  facebook_url = 'https://www.facebook.com/techstars',
  youtube_url = 'https://www.youtube.com/c/Techstars',
  instagram_url = 'https://www.instagram.com/techstars/',
  crunchbase_url = 'https://www.crunchbase.com/organization/techstars',
  medium_url = 'https://medium.com/techstars'
WHERE firm_name = 'Techstars';

-- 3. 500 Startups (now 500 Global)
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/500.co',
  twitter_url = 'https://twitter.com/500Global',
  linkedin_url = 'https://www.linkedin.com/company/500-global/',
  facebook_url = 'https://www.facebook.com/500Global',
  instagram_url = 'https://www.instagram.com/500global/',
  crunchbase_url = 'https://www.crunchbase.com/organization/500-global',
  medium_url = 'https://medium.com/500-global'
WHERE firm_name = '500 Startups';

-- 4. First Round Capital
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/firstround.com',
  twitter_url = 'https://twitter.com/firstround',
  linkedin_url = 'https://www.linkedin.com/company/first-round-capital/',
  crunchbase_url = 'https://www.crunchbase.com/organization/first-round-capital',
  medium_url = 'https://review.firstround.com/'
WHERE firm_name = 'First Round Capital';

-- 5. Andreessen Horowitz (a16z)
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/a16z.com',
  twitter_url = 'https://twitter.com/a16z',
  linkedin_url = 'https://www.linkedin.com/company/andreessen-horowitz/',
  facebook_url = 'https://www.facebook.com/a16z',
  youtube_url = 'https://www.youtube.com/c/a16z',
  instagram_url = 'https://www.instagram.com/a16z/',
  crunchbase_url = 'https://www.crunchbase.com/organization/andreessen-horowitz'
WHERE firm_name = 'Andreessen Horowitz';

-- 6. Sequoia Capital
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/sequoiacap.com',
  twitter_url = 'https://twitter.com/sequoia',
  linkedin_url = 'https://www.linkedin.com/company/sequoia-capital/',
  youtube_url = 'https://www.youtube.com/c/SequoiaCapital',
  instagram_url = 'https://www.instagram.com/sequoiacap/',
  crunchbase_url = 'https://www.crunchbase.com/organization/sequoia-capital'
WHERE firm_name = 'Sequoia Capital';

-- 7. Accel
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/accel.com',
  twitter_url = 'https://twitter.com/Accel',
  linkedin_url = 'https://www.linkedin.com/company/accel-partners/',
  facebook_url = 'https://www.facebook.com/accel',
  youtube_url = 'https://www.youtube.com/c/AccelPartners',
  instagram_url = 'https://www.instagram.com/accel/',
  crunchbase_url = 'https://www.crunchbase.com/organization/accel-partners'
WHERE firm_name = 'Accel';

-- 8. Greylock Partners
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/greylock.com',
  twitter_url = 'https://twitter.com/GreylockVC',
  linkedin_url = 'https://www.linkedin.com/company/greylock-partners/',
  facebook_url = 'https://www.facebook.com/GreylockPartners',
  youtube_url = 'https://www.youtube.com/c/GreylockPartners',
  crunchbase_url = 'https://www.crunchbase.com/organization/greylock'
WHERE firm_name = 'Greylock Partners';

-- 9. Index Ventures
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/indexventures.com',
  twitter_url = 'https://twitter.com/indexventures',
  linkedin_url = 'https://www.linkedin.com/company/index-ventures/',
  facebook_url = 'https://www.facebook.com/indexventures',
  instagram_url = 'https://www.instagram.com/indexventures/',
  crunchbase_url = 'https://www.crunchbase.com/organization/index-ventures'
WHERE firm_name = 'Index Ventures';

-- 10. Benchmark
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/benchmark.com',
  twitter_url = 'https://twitter.com/benchmark',
  linkedin_url = 'https://www.linkedin.com/company/benchmark/',
  crunchbase_url = 'https://www.crunchbase.com/organization/benchmark'
WHERE firm_name = 'Benchmark';

-- 11. Union Square Ventures
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/usv.com',
  twitter_url = 'https://twitter.com/usv',
  linkedin_url = 'https://www.linkedin.com/company/union-square-ventures/',
  crunchbase_url = 'https://www.crunchbase.com/organization/union-square-ventures',
  medium_url = 'https://www.usv.com/writing/'
WHERE firm_name = 'Union Square Ventures';

-- 12. Spark Capital
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/sparkcapital.com',
  twitter_url = 'https://twitter.com/sparkcapital',
  linkedin_url = 'https://www.linkedin.com/company/spark-capital/',
  crunchbase_url = 'https://www.crunchbase.com/organization/spark-capital'
WHERE firm_name = 'Spark Capital';

-- 13. General Catalyst
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/generalcatalyst.com',
  twitter_url = 'https://twitter.com/generalcatalyst',
  linkedin_url = 'https://www.linkedin.com/company/general-catalyst-partners/',
  facebook_url = 'https://www.facebook.com/GeneralCatalyst',
  youtube_url = 'https://www.youtube.com/c/GeneralCatalyst',
  instagram_url = 'https://www.instagram.com/generalcatalyst/',
  crunchbase_url = 'https://www.crunchbase.com/organization/general-catalyst-partners'
WHERE firm_name = 'General Catalyst';

-- 14. Founders Fund
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/foundersfund.com',
  twitter_url = 'https://twitter.com/foundersfund',
  linkedin_url = 'https://www.linkedin.com/company/founders-fund/',
  crunchbase_url = 'https://www.crunchbase.com/organization/founders-fund'
WHERE firm_name = 'Founders Fund';

-- 15. Lightspeed Venture Partners
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/lsvp.com',
  twitter_url = 'https://twitter.com/lightspeedvp',
  linkedin_url = 'https://www.linkedin.com/company/lightspeed-venture-partners/',
  youtube_url = 'https://www.youtube.com/c/LightspeedVenturePartners',
  crunchbase_url = 'https://www.crunchbase.com/organization/lightspeed-venture-partners'
WHERE firm_name = 'Lightspeed Venture Partners';

-- 16. Khosla Ventures
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/khoslaventures.com',
  twitter_url = 'https://twitter.com/khoslaventures',
  linkedin_url = 'https://www.linkedin.com/company/khosla-ventures/',
  crunchbase_url = 'https://www.crunchbase.com/organization/khosla-ventures'
WHERE firm_name = 'Khosla Ventures';

-- 17. Precursor Ventures
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/precursorvc.com',
  twitter_url = 'https://twitter.com/precursorvc',
  linkedin_url = 'https://www.linkedin.com/company/precursor-ventures/',
  crunchbase_url = 'https://www.crunchbase.com/organization/precursor-ventures'
WHERE firm_name = 'Precursor Ventures';

-- 18. Hustle Fund
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/hustlefund.vc',
  twitter_url = 'https://twitter.com/hustlefundvc',
  linkedin_url = 'https://www.linkedin.com/company/hustle-fund/',
  instagram_url = 'https://www.instagram.com/hustlefundvc/',
  crunchbase_url = 'https://www.crunchbase.com/organization/hustle-fund',
  medium_url = 'https://medium.com/hustle-fund'
WHERE firm_name = 'Hustle Fund';

-- 19. Day One Ventures
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/dayoneventures.com',
  twitter_url = 'https://twitter.com/DayOneVC',
  linkedin_url = 'https://www.linkedin.com/company/day-one-ventures/',
  crunchbase_url = 'https://www.crunchbase.com/organization/day-one-ventures'
WHERE firm_name = 'Day One Ventures';

-- 20. F-Prime Capital
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/fprimecapital.com',
  twitter_url = 'https://twitter.com/FPrimeCapital',
  linkedin_url = 'https://www.linkedin.com/company/f-prime-capital/',
  crunchbase_url = 'https://www.crunchbase.com/organization/f-prime-capital'
WHERE firm_name = 'F-Prime Capital';

-- 21. Insight Partners
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/insightpartners.com',
  twitter_url = 'https://twitter.com/insightpartners',
  linkedin_url = 'https://www.linkedin.com/company/insight-venture-partners/',
  facebook_url = 'https://www.facebook.com/InsightPartners',
  youtube_url = 'https://www.youtube.com/c/InsightPartners',
  crunchbase_url = 'https://www.crunchbase.com/organization/insight-venture-partners'
WHERE firm_name = 'Insight Partners';

-- 22. NEA (New Enterprise Associates)
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/nea.com',
  twitter_url = 'https://twitter.com/NEA',
  linkedin_url = 'https://www.linkedin.com/company/new-enterprise-associates/',
  youtube_url = 'https://www.youtube.com/c/NewEnterpriseAssociates',
  crunchbase_url = 'https://www.crunchbase.com/organization/new-enterprise-associates'
WHERE firm_name = 'NEA';

-- 23. Bessemer Venture Partners
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/bvp.com',
  twitter_url = 'https://twitter.com/BessemerVP',
  linkedin_url = 'https://www.linkedin.com/company/bessemer-venture-partners/',
  youtube_url = 'https://www.youtube.com/c/BessemerVenturePartners',
  crunchbase_url = 'https://www.crunchbase.com/organization/bessemer-venture-partners'
WHERE firm_name = 'Bessemer Venture Partners';

-- 24. Atomico
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/atomico.com',
  twitter_url = 'https://twitter.com/atomicovc',
  linkedin_url = 'https://www.linkedin.com/company/atomico/',
  facebook_url = 'https://www.facebook.com/atomico',
  crunchbase_url = 'https://www.crunchbase.com/organization/atomico'
WHERE firm_name = 'Atomico';

-- 25. LocalGlobe
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/localglobe.vc',
  twitter_url = 'https://twitter.com/localglobe',
  linkedin_url = 'https://www.linkedin.com/company/localglobe/',
  crunchbase_url = 'https://www.crunchbase.com/organization/localglobe'
WHERE firm_name = 'LocalGlobe';

-- 26. Cherry Ventures
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/cherry.vc',
  twitter_url = 'https://twitter.com/CherryVentures',
  linkedin_url = 'https://www.linkedin.com/company/cherry-ventures/',
  crunchbase_url = 'https://www.crunchbase.com/organization/cherry-ventures'
WHERE firm_name = 'Cherry Ventures';

-- 27. TinySeed
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/tinyseed.com',
  twitter_url = 'https://twitter.com/tinyseedvc',
  linkedin_url = 'https://www.linkedin.com/company/tinyseed/',
  crunchbase_url = 'https://www.crunchbase.com/organization/tinyseed'
WHERE firm_name = 'TinySeed';

-- 28. Indie.vc
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/indie.vc',
  twitter_url = 'https://twitter.com/indie_vc',
  linkedin_url = 'https://www.linkedin.com/company/indie-vc/',
  crunchbase_url = 'https://www.crunchbase.com/organization/indie-vc'
WHERE firm_name = 'Indie.vc';

-- Additional major VCs not in seed but potentially added later:

-- GV (Google Ventures)
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/gv.com',
  twitter_url = 'https://twitter.com/GVteam',
  linkedin_url = 'https://www.linkedin.com/company/google-ventures/',
  crunchbase_url = 'https://www.crunchbase.com/organization/google-ventures'
WHERE firm_name = 'GV';

-- Kleiner Perkins
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/kleinerperkins.com',
  twitter_url = 'https://twitter.com/kpcb',
  linkedin_url = 'https://www.linkedin.com/company/kleiner-perkins/',
  youtube_url = 'https://www.youtube.com/c/KleinerPerkins',
  crunchbase_url = 'https://www.crunchbase.com/organization/kleiner-perkins'
WHERE firm_name = 'Kleiner Perkins';

-- Tiger Global Management
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/tigerglobal.com',
  linkedin_url = 'https://www.linkedin.com/company/tiger-global-management/',
  crunchbase_url = 'https://www.crunchbase.com/organization/tiger-global-management'
WHERE firm_name = 'Tiger Global Management';

-- Coatue Management
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/coatue.com',
  twitter_url = 'https://twitter.com/Coatue',
  linkedin_url = 'https://www.linkedin.com/company/coatue-management/',
  crunchbase_url = 'https://www.crunchbase.com/organization/coatue-management'
WHERE firm_name = 'Coatue Management';

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check all VCs with logos and social media
SELECT
  firm_name,
  slug,
  CASE WHEN logo_url IS NOT NULL THEN '✅' ELSE '❌' END as has_logo,
  CASE WHEN twitter_url IS NOT NULL THEN '✅' ELSE '❌' END as has_twitter,
  CASE WHEN linkedin_url IS NOT NULL THEN '✅' ELSE '❌' END as has_linkedin
FROM public.investors
WHERE investor_type = 'vc'
ORDER BY firm_name;

-- Count VCs with logos
SELECT
  COUNT(*) as total_vcs,
  COUNT(logo_url) as vcs_with_logo,
  COUNT(twitter_url) as vcs_with_twitter,
  COUNT(linkedin_url) as vcs_with_linkedin,
  COUNT(*) - COUNT(logo_url) as vcs_missing_logo
FROM public.investors
WHERE investor_type = 'vc';

-- Show all VC logos and social media URLs
SELECT
  firm_name,
  logo_url,
  twitter_url,
  linkedin_url,
  facebook_url,
  youtube_url,
  instagram_url,
  crunchbase_url,
  medium_url
FROM public.investors
WHERE investor_type = 'vc'
ORDER BY firm_name;
