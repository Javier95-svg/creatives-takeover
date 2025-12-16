-- Recharge admin account with 150 credits for testing
-- This migration adds 150 credits to admin@creatives-takeover.com

DO $$
DECLARE
  admin_user_id UUID;
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Find the admin user ID
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE LOWER(email) = 'admin@creatives-takeover.com'
  LIMIT 1;

  -- Check if admin user exists
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Admin user with email admin@creatives-takeover.com not found';
  END IF;

  -- Ensure user_credits record exists
  INSERT INTO public.user_credits (user_id, balance, monthly_quota, last_reset_at)
  VALUES (admin_user_id, 0, 0, NOW())
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current balance
  SELECT balance INTO current_balance
  FROM public.user_credits
  WHERE user_id = admin_user_id;

  -- Calculate new balance
  new_balance := COALESCE(current_balance, 0) + 150;

  -- Update the balance
  UPDATE public.user_credits
  SET balance = new_balance,
      updated_at = NOW()
  WHERE user_id = admin_user_id;

  -- Log the credit transaction
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    tx_type,
    reason,
    metadata
  ) VALUES (
    admin_user_id,
    150,
    'grant',
    'Admin account recharge for testing',
    jsonb_build_object(
      'source', 'admin_recharge',
      'timestamp', NOW(),
      'previous_balance', COALESCE(current_balance, 0),
      'new_balance', new_balance
    )
  );

  RAISE NOTICE 'Successfully added 150 credits to admin account. New balance: %', new_balance;
END $$;

