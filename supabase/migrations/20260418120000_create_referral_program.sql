-- Migration: Referral Program
-- Description: Persistent per-user referral codes, referral ledger, and reward grants.
-- Date: 2026-04-18

-- =====================================================================
-- 1. Tables
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_codes_code_idx ON public.referral_codes (code);

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_email TEXT NOT NULL,
  code_used TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  CONSTRAINT referral_no_self CHECK (referrer_user_id <> referred_user_id)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals (referrer_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS referrals_email_unique ON public.referrals (lower(referred_email));

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('tier_upgrade', 'credits')),
  from_tier TEXT,
  to_tier TEXT,
  credits_granted INTEGER,
  batch_number INTEGER NOT NULL,
  referral_batch_size INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_rewards_user_idx ON public.referral_rewards (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS referral_rewards_user_batch_type_idx
  ON public.referral_rewards (user_id, batch_number, reward_type);

-- =====================================================================
-- 2. Row Level Security
-- =====================================================================

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own referral code" ON public.referral_codes;
CREATE POLICY "Users read own referral code"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read referrals they made" ON public.referrals;
CREATE POLICY "Users read referrals they made"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_user_id);

DROP POLICY IF EXISTS "Users read their referral rewards" ON public.referral_rewards;
CREATE POLICY "Users read their referral rewards"
  ON public.referral_rewards FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================================
-- 3. Code generation
-- =====================================================================

CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_attempt INT := 0;
BEGIN
  LOOP
    v_attempt := v_attempt + 1;
    v_code := substr(
      translate(encode(gen_random_bytes(6), 'base64'), '+/=', 'ABC'),
      1, 8
    );

    BEGIN
      INSERT INTO public.referral_codes (user_id, code)
      VALUES (p_user_id, v_code)
      ON CONFLICT (user_id) DO NOTHING;

      IF EXISTS (SELECT 1 FROM public.referral_codes WHERE user_id = p_user_id) THEN
        RETURN (SELECT code FROM public.referral_codes WHERE user_id = p_user_id);
      END IF;
    EXCEPTION
      WHEN unique_violation THEN
        IF v_attempt >= 10 THEN
          RAISE EXCEPTION 'Could not generate unique referral code after % attempts', v_attempt;
        END IF;
        CONTINUE;
    END;

    IF v_attempt >= 10 THEN
      RAISE EXCEPTION 'Could not generate unique referral code';
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_referral_code(UUID) TO authenticated;

-- Auto-create a code for every new auth user
CREATE OR REPLACE FUNCTION public.ensure_referral_code_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.generate_referral_code(NEW.id);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block signup; log and continue
    RAISE WARNING 'ensure_referral_code_on_signup failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_referral_code ON auth.users;
CREATE TRIGGER trg_ensure_referral_code
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.ensure_referral_code_on_signup();

-- =====================================================================
-- 4. Reward logic
-- =====================================================================

-- Grants one reward batch for the given batch_number.
-- Idempotent: the unique (user_id, batch_number, reward_type) index prevents
-- duplicate rewards if called twice for the same batch.
CREATE OR REPLACE FUNCTION public.apply_referral_reward(
  p_referrer_user_id UUID,
  p_batch_number INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_tier TEXT;
  v_next_tier TEXT;
BEGIN
  SELECT subscription_tier INTO v_current_tier
    FROM public.subscribers WHERE user_id = p_referrer_user_id
    ORDER BY updated_at DESC NULLS LAST LIMIT 1;

  v_current_tier := COALESCE(v_current_tier, 'rookie');

  v_next_tier := CASE v_current_tier
    WHEN 'free' THEN 'starter'
    WHEN 'rookie' THEN 'starter'
    WHEN 'starter' THEN 'rising'
    WHEN 'rising' THEN 'pro'
    ELSE NULL
  END;

  IF v_next_tier IS NOT NULL THEN
    PERFORM public.update_user_subscription_tier(p_referrer_user_id, v_next_tier, true);
    INSERT INTO public.referral_rewards (user_id, reward_type, from_tier, to_tier, batch_number)
      VALUES (p_referrer_user_id, 'tier_upgrade', v_current_tier, v_next_tier, p_batch_number)
      ON CONFLICT (user_id, batch_number, reward_type) DO NOTHING;
  END IF;

  -- Rising→Pro upgrade and Pro tier ceiling also grant 50 bonus credits
  IF v_current_tier IN ('rising', 'pro') THEN
    INSERT INTO public.user_credits (user_id, balance, monthly_quota, updated_at)
      VALUES (p_referrer_user_id, 50, 0, now())
      ON CONFLICT (user_id) DO UPDATE
        SET balance = public.user_credits.balance + 50,
            updated_at = now();
    INSERT INTO public.referral_rewards (user_id, reward_type, credits_granted, batch_number)
      VALUES (p_referrer_user_id, 'credits', 50, p_batch_number)
      ON CONFLICT (user_id, batch_number, reward_type) DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_referral_reward(UUID) TO authenticated;

-- =====================================================================
-- 5. Claim referral (client-facing RPC)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.claim_referral(p_code TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer UUID;
  v_me UUID := auth.uid();
  v_my_email TEXT;
  v_inserted_rows INT := 0;
  v_verified_count INT;
  v_max_rewarded_batch INT;
  v_target_batch INT;
BEGIN
  IF v_me IS NULL THEN RETURN false; END IF;
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN RETURN false; END IF;

  SELECT user_id INTO v_referrer
    FROM public.referral_codes
    WHERE code = trim(p_code);

  IF v_referrer IS NULL OR v_referrer = v_me THEN RETURN false; END IF;

  SELECT email INTO v_my_email FROM auth.users WHERE id = v_me;
  IF v_my_email IS NULL THEN RETURN false; END IF;

  INSERT INTO public.referrals (
    referrer_user_id, referred_user_id, referred_email, code_used, status, verified_at
  )
  VALUES (
    v_referrer, v_me, lower(v_my_email), trim(p_code), 'verified', now()
  )
  ON CONFLICT (referred_user_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted_rows = ROW_COUNT;
  IF v_inserted_rows = 0 THEN RETURN false; END IF;

  SELECT COUNT(*) INTO v_verified_count
    FROM public.referrals
    WHERE referrer_user_id = v_referrer AND status = 'verified';

  SELECT COALESCE(MAX(batch_number), 0) INTO v_max_rewarded_batch
    FROM public.referral_rewards
    WHERE user_id = v_referrer;

  v_target_batch := v_verified_count / 3;

  -- Grant rewards for any batches not yet paid out (handles catch-up).
  WHILE v_max_rewarded_batch < v_target_batch LOOP
    v_max_rewarded_batch := v_max_rewarded_batch + 1;
    PERFORM public.apply_referral_reward(v_referrer, v_max_rewarded_batch);
  END LOOP;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_referral(TEXT) TO authenticated;

-- =====================================================================
-- 6. Backfill referral codes for existing users
-- =====================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.referral_codes) LOOP
    BEGIN
      PERFORM public.generate_referral_code(r.id);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to generate referral code for %: %', r.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- =====================================================================
-- 7. Comments
-- =====================================================================

COMMENT ON TABLE public.referral_codes IS 'One persistent referral code per user.';
COMMENT ON TABLE public.referrals IS 'One row per successful signup using a referral link.';
COMMENT ON TABLE public.referral_rewards IS 'Immutable ledger of referral rewards granted.';
COMMENT ON FUNCTION public.claim_referral(TEXT) IS 'Client RPC: consume a referral code immediately after signup.';
