-- Fix user account for does@elevatedynamics.pt
-- User UID: 15bba750-6594-4f48-a101-0c02a404835e
-- Issue: User cannot sign in, needs Pro plan with 150 credits
-- This migration ensures:
-- 1. User account is active and can sign in
-- 2. Profile exists in profiles table
-- 3. Subscription tier is set to 'professional'
-- 4. User has 150 credits (balance and monthly_quota)
-- 5. Subscribers table is updated

DO $$
DECLARE
  target_user_id UUID := '15bba750-6594-4f48-a101-0c02a404835e';
  target_email TEXT := 'does@elevatedynamics.pt';
  professional_credits INTEGER := 150;
  user_exists BOOLEAN := false;
  profile_exists BOOLEAN := false;
  current_balance INTEGER;
  current_tier TEXT;
BEGIN
  RAISE NOTICE 'Starting account fix for user: % (UID: %)', target_email, target_user_id;

  -- Step 1: Verify user exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = target_user_id) INTO user_exists;
  
  IF NOT user_exists THEN
    RAISE EXCEPTION 'User with UID % not found in auth.users table', target_user_id;
  END IF;

  RAISE NOTICE 'User found in auth.users';

  -- Step 2: Ensure user can sign in - confirm email and remove any bans
  -- Note: Direct update to auth.users may require service role permissions
  -- If this fails, you may need to update via Supabase Dashboard > Authentication > Users
  RAISE NOTICE 'Attempting to activate user account...';
  
  -- Try to update auth.users (may require elevated permissions)
  BEGIN
    UPDATE auth.users
    SET 
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      confirmed_at = COALESCE(confirmed_at, now()),
      banned_until = NULL,
      updated_at = now()
    WHERE id = target_user_id
      AND (email_confirmed_at IS NULL OR confirmed_at IS NULL OR banned_until IS NOT NULL);
    
    RAISE NOTICE 'User account activated for sign-in';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE WARNING 'Cannot update auth.users directly. Please manually confirm email and remove bans via Supabase Dashboard > Authentication > Users';
    WHEN OTHERS THEN
      RAISE WARNING 'Could not update auth.users: %. User may need manual activation.', SQLERRM;
  END;

  -- Step 3: Ensure profile exists in profiles table
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = target_user_id) INTO profile_exists;
  
  IF NOT profile_exists THEN
    -- Create profile if it doesn't exist
    INSERT INTO public.profiles (
      id,
      full_name,
      email,
      subscription_tier,
      created_at,
      updated_at
    )
    SELECT 
      id,
      COALESCE(raw_user_meta_data->>'full_name', 'User'),
      email,
      'professional',
      created_at,
      now()
    FROM auth.users
    WHERE id = target_user_id;
    
    RAISE NOTICE 'Profile created for user';
  ELSE
    RAISE NOTICE 'Profile already exists';
  END IF;

  -- Step 4: Update profile to professional tier
  UPDATE public.profiles
  SET 
    subscription_tier = 'professional',
    updated_at = now()
  WHERE id = target_user_id;

  RAISE NOTICE 'Profile updated to professional tier';

  -- Step 5: Get current balance before updating credits
  SELECT COALESCE(balance, 0), COALESCE(subscription_tier, 'free')
  INTO current_balance, current_tier
  FROM public.user_credits
  WHERE user_id = target_user_id;

  -- Step 6: Ensure user_credits record exists and set to professional with 150 credits
  INSERT INTO public.user_credits (
    user_id,
    balance,
    monthly_quota,
    subscription_tier,
    last_credit_grant,
    last_reset_at,
    created_at,
    updated_at
  )
  VALUES (
    target_user_id,
    professional_credits,
    professional_credits,
    'professional',
    now(),
    now(),
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    subscription_tier = 'professional',
    monthly_quota = professional_credits,
    balance = professional_credits,
    last_credit_grant = now(),
    updated_at = now();

  RAISE NOTICE 'User credits set to 150 (professional tier)';

  -- Step 7: Log credit transaction if upgrading or setting initial credits
  IF current_tier != 'professional' OR current_balance < professional_credits THEN
    INSERT INTO public.credit_transactions (
      user_id,
      amount,
      tx_type,
      reason,
      feature,
      metadata,
      created_at
    )
    VALUES (
      target_user_id,
      professional_credits - COALESCE(current_balance, 0),
      'grant',
      'Account fix: Set to Professional plan with 150 credits',
      'Subscription - professional',
      jsonb_build_object(
        'source', 'account_fix',
        'previous_tier', COALESCE(current_tier, 'none'),
        'previous_balance', COALESCE(current_balance, 0),
        'new_tier', 'professional',
        'new_balance', professional_credits,
        'timestamp', now()
      ),
      now()
    );
    
    RAISE NOTICE 'Credit transaction logged';
  END IF;

  -- Step 8: Update subscribers table
  INSERT INTO public.subscribers (
    user_id,
    email,
    subscribed,
    subscription_tier,
    created_at,
    updated_at
  )
  SELECT 
    target_user_id,
    email,
    true,
    'professional',
    now(),
    now()
  FROM auth.users
  WHERE id = target_user_id
  ON CONFLICT (email) DO UPDATE SET
    user_id = target_user_id,
    subscribed = true,
    subscription_tier = 'professional',
    updated_at = now();

  RAISE NOTICE 'Subscribers table updated';

  -- Step 9: Verify final state
  SELECT balance, subscription_tier, monthly_quota
  INTO current_balance, current_tier, professional_credits
  FROM public.user_credits
  WHERE user_id = target_user_id;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Account fix completed successfully!';
  RAISE NOTICE 'User: %', target_email;
  RAISE NOTICE 'UID: %', target_user_id;
  RAISE NOTICE 'Subscription Tier: %', current_tier;
  RAISE NOTICE 'Credits Balance: %', current_balance;
  RAISE NOTICE 'Monthly Quota: %', professional_credits;
  RAISE NOTICE '========================================';

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error fixing user account: %', SQLERRM;
END $$;

-- Verify the fix
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  u.banned_until IS NULL as not_banned,
  p.subscription_tier as profile_tier,
  uc.balance,
  uc.monthly_quota,
  uc.subscription_tier as credits_tier,
  s.subscription_tier as subscriber_tier,
  s.subscribed
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_credits uc ON uc.user_id = u.id
LEFT JOIN public.subscribers s ON s.user_id = u.id
WHERE u.id = '15bba750-6594-4f48-a101-0c02a404835e';
