-- Migration: Credit Add-On Packs + Plan Credit Rebalancing
-- Rising (creator): 50 → 100 credits/month
-- Pro (professional): 150 → 300 credits/month
-- New: credit_packs table for one-time purchasable credit bundles

-- 1. Update subscription_tiers table with new credit amounts
UPDATE public.subscription_tiers
SET monthly_credits = 100
WHERE tier_name = 'creator';

UPDATE public.subscription_tiers
SET monthly_credits = 300
WHERE tier_name = 'professional';

-- 2. Update existing active subscribers' current monthly_quota
--    Using GREATEST so users never lose credits they already have
UPDATE public.user_credits
SET monthly_quota = GREATEST(monthly_quota, 100)
WHERE subscription_tier = 'creator';

UPDATE public.user_credits
SET monthly_quota = GREATEST(monthly_quota, 300)
WHERE subscription_tier = 'professional';

-- Log the quota upgrade as an adjustment for creator users
INSERT INTO public.credit_transactions (user_id, amount, tx_type, reason, feature, metadata)
SELECT
  uc.user_id,
  GREATEST(100, uc.monthly_quota) - uc.monthly_quota AS amount,
  'adjustment',
  'Plan credit rebalancing — Rising plan upgraded from 50 to 100 credits/month',
  'Plan Rebalance',
  jsonb_build_object('previousQuota', uc.monthly_quota, 'newQuota', GREATEST(100, uc.monthly_quota))
FROM public.user_credits uc
WHERE uc.subscription_tier = 'creator'
  AND uc.monthly_quota < 100;

-- Log the quota upgrade as an adjustment for professional users
INSERT INTO public.credit_transactions (user_id, amount, tx_type, reason, feature, metadata)
SELECT
  uc.user_id,
  GREATEST(300, uc.monthly_quota) - uc.monthly_quota AS amount,
  'adjustment',
  'Plan credit rebalancing — Pro plan upgraded from 150 to 300 credits/month',
  'Plan Rebalance',
  jsonb_build_object('previousQuota', uc.monthly_quota, 'newQuota', GREATEST(300, uc.monthly_quota))
FROM public.user_credits uc
WHERE uc.subscription_tier = 'professional'
  AND uc.monthly_quota < 300;

-- 3. Create credit_packs table
CREATE TABLE IF NOT EXISTS public.credit_packs (
  id TEXT PRIMARY KEY,
  credits INTEGER NOT NULL CHECK (credits > 0),
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  stripe_price_id TEXT,
  stripe_payment_link TEXT,
  label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Insert the three credit pack options
INSERT INTO public.credit_packs (id, credits, price_cents, label, active)
VALUES
  ('pack_20', 20, 800, 'Starter Pack', true),
  ('pack_40', 40, 1600, 'Boost Pack', true),
  ('pack_60', 60, 2400, 'Power Pack', true)
ON CONFLICT (id) DO UPDATE SET
  credits = EXCLUDED.credits,
  price_cents = EXCLUDED.price_cents,
  label = EXCLUDED.label,
  active = EXCLUDED.active;

-- 5. Enable RLS on credit_packs (read-only for authenticated users)
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active credit packs"
  ON public.credit_packs
  FOR SELECT
  USING (active = true);

-- 6. Add atomic increment function for credit pack purchases
--    Increments the persistent balance (not monthly_quota)
CREATE OR REPLACE FUNCTION public.increment_credit_balance(
  p_user_id uuid,
  p_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Credit amount must be positive';
  END IF;

  UPDATE public.user_credits
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User credits record not found for user %', p_user_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'newBalance', v_new_balance);
END;
$$;
