-- Fix admin account onboarding_completed status
-- This ensures the admin account never sees the onboarding page again

-- First, check the current status
SELECT 
  u.id,
  u.email,
  p.onboarding_completed,
  p.subscription_tier,
  p.full_name
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE LOWER(u.email) = 'admin@creatives-takeover.com';

-- Update admin account to mark onboarding as completed
-- This ensures admin never gets redirected to /onboarding
UPDATE public.profiles
SET 
  onboarding_completed = TRUE,
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM auth.users WHERE LOWER(email) = 'admin@creatives-takeover.com'
)
AND (onboarding_completed IS NULL OR onboarding_completed = FALSE);

-- Verify the update
SELECT 
  u.id,
  u.email,
  p.onboarding_completed,
  p.subscription_tier,
  p.updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE LOWER(u.email) = 'admin@creatives-takeover.com';
