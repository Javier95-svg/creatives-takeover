-- Upgrade admin account (admin@creatives-takeover.com) to professional subscription tier
-- This migration is idempotent and can be run multiple times safely

DO $$
DECLARE
  admin_user_id UUID;
  professional_credits INTEGER := 150;
  current_balance INTEGER;
BEGIN
  -- Find admin user by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE LOWER(email) = 'admin@creatives-takeover.com'
  LIMIT 1;

  -- If admin user doesn't exist, exit gracefully
  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'Admin user (admin@creatives-takeover.com) not found. Skipping upgrade.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found admin user: %', admin_user_id;

  -- 1. Update profiles table
  UPDATE public.profiles
  SET subscription_tier = 'professional'
  WHERE id = admin_user_id
    AND subscription_tier != 'professional';

  -- 2. Get current balance BEFORE updating (to calculate credit grant if upgrading)
  SELECT COALESCE(balance, 0) INTO current_balance
  FROM public.user_credits
  WHERE user_id = admin_user_id;

  -- 3. Ensure user_credits record exists, then update subscription tier
  -- IMPORTANT: Only set balance during initial setup (NULL/0) or tier upgrade, NOT on every conflict
  -- This prevents auto-resetting balance after credit deductions
  INSERT INTO public.user_credits (user_id, balance, subscription_tier, monthly_quota, last_credit_grant)
  VALUES (
    admin_user_id,
    professional_credits,
    'professional',
    professional_credits,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    subscription_tier = 'professional',
    monthly_quota = professional_credits,
    -- Only update balance if:
    -- 1. Balance is NULL (initial setup)
    -- 2. Balance is 0 (initial setup)
    -- 3. User is upgrading FROM a different tier (not already professional)
    -- DO NOT reset balance if user is already on professional tier and has used credits
    balance = CASE 
      WHEN user_credits.balance IS NULL THEN professional_credits
      WHEN user_credits.balance = 0 AND user_credits.subscription_tier != 'professional' THEN professional_credits
      WHEN user_credits.subscription_tier != 'professional' AND user_credits.balance < professional_credits THEN professional_credits
      ELSE user_credits.balance  -- Keep existing balance if already on professional tier
    END,
    last_credit_grant = CASE 
      WHEN user_credits.subscription_tier != 'professional' THEN now()
      ELSE user_credits.last_credit_grant
    END;

  -- 4. If upgrading (balance was less than professional credits), log the credit transaction
  IF current_balance < professional_credits THEN
    INSERT INTO public.credit_transactions (
      user_id,
      amount,
      tx_type,
      reason,
      feature
    ) VALUES (
      admin_user_id,
      professional_credits - current_balance,
      'grant',
      'Subscription tier upgrade to professional',
      'Subscription - professional'
    );
  END IF;

  -- 5. Upsert subscribers table
  INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier, updated_at)
  SELECT 
    admin_user_id,
    email,
    true,
    'professional',
    now()
  FROM auth.users
  WHERE id = admin_user_id
  ON CONFLICT (email) DO UPDATE SET
    subscribed = true,
    subscription_tier = 'professional',
    updated_at = now();

  RAISE NOTICE 'Successfully upgraded admin account to professional tier';
END $$;

