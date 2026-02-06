-- Count Professional Tier Accounts
-- This query shows how many accounts are on the Professional tier

-- Count from profiles table (main source of truth)
SELECT 
  'Profiles Table' as source,
  COUNT(*) as professional_tier_count,
  COUNT(DISTINCT id) as unique_users
FROM public.profiles
WHERE subscription_tier = 'professional';

-- Count from subscribers table
SELECT 
  'Subscribers Table' as source,
  COUNT(*) as professional_tier_count,
  COUNT(DISTINCT user_id) as unique_users
FROM public.subscribers
WHERE subscription_tier = 'professional'
AND subscribed = true;

-- Count from user_credits table
SELECT 
  'User Credits Table' as source,
  COUNT(*) as professional_tier_count,
  COUNT(DISTINCT user_id) as unique_users
FROM public.user_credits
WHERE subscription_tier = 'professional';

-- Detailed breakdown: Professional tier users with their email and status
SELECT 
  u.email,
  p.subscription_tier as profile_tier,
  s.subscription_tier as subscriber_tier,
  s.subscribed,
  uc.subscription_tier as credits_tier,
  uc.balance,
  uc.monthly_quota,
  p.onboarding_completed,
  p.created_at as account_created
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.subscribers s ON s.user_id = u.id
LEFT JOIN public.user_credits uc ON uc.user_id = u.id
WHERE p.subscription_tier = 'professional'
ORDER BY p.created_at DESC;

-- Summary: Total unique professional tier accounts
SELECT 
  COUNT(DISTINCT p.id) as total_professional_accounts
FROM public.profiles p
WHERE p.subscription_tier = 'professional';
