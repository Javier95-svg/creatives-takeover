-- Migration: Harden referral attribution for auth signup + OAuth callback flows
-- Date: 2026-04-18

CREATE OR REPLACE FUNCTION public.finalize_referral_attribution(
  p_referred_user_id UUID,
  p_referred_email TEXT,
  p_code TEXT
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer UUID;
  v_inserted_rows INT := 0;
  v_verified_count INT;
  v_max_rewarded_batch INT;
  v_target_batch INT;
  v_normalized_email TEXT;
BEGIN
  IF p_referred_user_id IS NULL THEN RETURN false; END IF;
  IF p_referred_email IS NULL OR length(trim(p_referred_email)) = 0 THEN RETURN false; END IF;
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN RETURN false; END IF;

  v_normalized_email := lower(trim(p_referred_email));

  SELECT user_id INTO v_referrer
    FROM public.referral_codes
    WHERE code = trim(p_code);

  IF v_referrer IS NULL OR v_referrer = p_referred_user_id THEN RETURN false; END IF;

  IF EXISTS (
    SELECT 1
    FROM public.referrals
    WHERE referred_user_id = p_referred_user_id
  ) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.referrals
    WHERE lower(referred_email) = v_normalized_email
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.referrals (
    referrer_user_id,
    referred_user_id,
    referred_email,
    code_used,
    status,
    verified_at
  )
  VALUES (
    v_referrer,
    p_referred_user_id,
    v_normalized_email,
    trim(p_code),
    'verified',
    now()
  )
  ON CONFLICT (referred_user_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted_rows = ROW_COUNT;
  IF v_inserted_rows = 0 THEN
    RETURN false;
  END IF;

  SELECT COUNT(*) INTO v_verified_count
    FROM public.referrals
    WHERE referrer_user_id = v_referrer AND status = 'verified';

  SELECT COALESCE(MAX(batch_number), 0) INTO v_max_rewarded_batch
    FROM public.referral_rewards
    WHERE user_id = v_referrer;

  v_target_batch := v_verified_count / 3;

  WHILE v_max_rewarded_batch < v_target_batch LOOP
    v_max_rewarded_batch := v_max_rewarded_batch + 1;
    PERFORM public.apply_referral_reward(v_referrer, v_max_rewarded_batch);
  END LOOP;

  RETURN true;
EXCEPTION
  WHEN unique_violation THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_referral(p_code TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := auth.uid();
  v_my_email TEXT;
BEGIN
  IF v_me IS NULL THEN RETURN false; END IF;

  SELECT email INTO v_my_email
    FROM auth.users
    WHERE id = v_me;

  RETURN public.finalize_referral_attribution(v_me, v_my_email, p_code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_referral(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.capture_referral_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  v_code := NULLIF(trim(COALESCE(NEW.raw_user_meta_data ->> 'referral_code', '')), '');

  IF v_code IS NOT NULL THEN
    PERFORM public.finalize_referral_attribution(NEW.id, NEW.email, v_code);
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'capture_referral_on_signup failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_capture_referral_on_signup ON auth.users;
CREATE TRIGGER trg_capture_referral_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.capture_referral_on_signup();

COMMENT ON FUNCTION public.finalize_referral_attribution(UUID, TEXT, TEXT)
  IS 'Internal referral attribution path shared by auth signup triggers and OAuth callback claims.';
