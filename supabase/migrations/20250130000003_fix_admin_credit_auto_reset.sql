-- Fix Admin Credit Auto-Reset Issue
-- This migration ensures admin account credits are NOT automatically reset after deduction
-- The previous migration had logic that reset balance to 150 whenever balance < 150
-- This fix ensures balance is only set during initial setup, not on every update

DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Find admin user by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE LOWER(email) = 'admin@creatives-takeover.com'
  LIMIT 1;

  -- If admin user doesn't exist, exit gracefully
  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'Admin user (admin@creatives-takeover.com) not found. Skipping fix.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found admin user: %. Ensuring credits are not auto-reset.', admin_user_id;

  -- Ensure user_credits record exists with professional tier
  -- But DO NOT reset balance if it already exists and user is on professional tier
  INSERT INTO public.user_credits (user_id, balance, subscription_tier, monthly_quota, last_credit_grant)
  VALUES (
    admin_user_id,
    150,  -- Only used if record doesn't exist
    'professional',
    150,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    -- Update subscription tier and monthly_quota if needed
    subscription_tier = 'professional',
    monthly_quota = CASE 
      WHEN user_credits.monthly_quota < 150 THEN 150  -- Only reset quota if below expected
      ELSE user_credits.monthly_quota  -- Keep existing quota
    END,
    -- CRITICAL: Do NOT reset balance if user is already on professional tier
    -- Only set balance if it's NULL or 0 (initial setup)
    balance = CASE 
      WHEN user_credits.balance IS NULL THEN 150
      WHEN user_credits.balance = 0 AND user_credits.subscription_tier != 'professional' THEN 150
      ELSE user_credits.balance  -- Keep existing balance - DO NOT reset
    END,
    -- Only update last_credit_grant if upgrading tier
    last_credit_grant = CASE 
      WHEN user_credits.subscription_tier != 'professional' THEN now()
      ELSE user_credits.last_credit_grant
    END;

  RAISE NOTICE 'Admin credit auto-reset fix applied. Balance will not be reset after credit deductions.';
END $$;

-- Verify the fix: Check admin account credit status
SELECT 
  u.email,
  uc.balance,
  uc.monthly_quota,
  uc.subscription_tier,
  uc.last_reset_at,
  (uc.balance + uc.monthly_quota) as total_credits
FROM auth.users u
LEFT JOIN public.user_credits uc ON uc.user_id = u.id
WHERE LOWER(u.email) = 'admin@creatives-takeover.com';
