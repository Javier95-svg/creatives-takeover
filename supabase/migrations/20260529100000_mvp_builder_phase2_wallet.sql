-- MVP Builder Phase 2+: dedicated MVP credit wallet.
-- This keeps app-building usage separate from the platform-wide credit ledger.

ALTER TABLE public.mvp_projects
  DROP CONSTRAINT IF EXISTS mvp_projects_project_type_check;

ALTER TABLE public.mvp_projects
  ADD CONSTRAINT mvp_projects_project_type_check
  CHECK (project_type IN ('html_single', 'react_multi', 'react_vite'));

CREATE TABLE IF NOT EXISTS public.mvp_credit_balances (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  monthly_quota INTEGER NOT NULL DEFAULT 0 CHECK (monthly_quota >= 0),
  subscription_tier TEXT NOT NULL DEFAULT 'rookie',
  last_reset_at TIMESTAMPTZ,
  billing_anchor_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mvp_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('grant', 'deduct', 'purchase', 'refund', 'adjustment', 'reset')),
  reason TEXT,
  feature TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mvp_credit_packs (
  id TEXT PRIMARY KEY,
  credits INTEGER NOT NULL CHECK (credits > 0),
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mvp_credit_transactions_user_created
  ON public.mvp_credit_transactions(user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mvp_credit_transactions_idempotency
  ON public.mvp_credit_transactions(user_id, feature, (metadata ->> 'idempotencyKey'))
  WHERE metadata ? 'idempotencyKey';

ALTER TABLE public.mvp_credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvp_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvp_credit_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their MVP credit balance" ON public.mvp_credit_balances;
CREATE POLICY "Users can view their MVP credit balance"
  ON public.mvp_credit_balances FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their MVP credit transactions" ON public.mvp_credit_transactions;
CREATE POLICY "Users can view their MVP credit transactions"
  ON public.mvp_credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can view active MVP credit packs" ON public.mvp_credit_packs;
CREATE POLICY "Authenticated users can view active MVP credit packs"
  ON public.mvp_credit_packs FOR SELECT
  USING (active = true AND auth.role() = 'authenticated');

INSERT INTO public.mvp_credit_packs (id, credits, price_cents, label, active, featured)
VALUES
  ('mvp_pack_micro', 30, 900, 'Micro MVP Pack', true, false),
  ('mvp_pack_builder', 100, 2500, 'Builder MVP Pack', true, true),
  ('mvp_pack_growth', 220, 4900, 'Growth MVP Pack', true, false),
  ('mvp_pack_scale', 500, 9900, 'Scale MVP Pack', true, false)
ON CONFLICT (id) DO UPDATE SET
  credits = EXCLUDED.credits,
  price_cents = EXCLUDED.price_cents,
  label = EXCLUDED.label,
  active = EXCLUDED.active,
  featured = EXCLUDED.featured,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.mvp_monthly_credits_for_tier(p_tier TEXT)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT CASE lower(coalesce(p_tier, 'rookie'))
    WHEN 'starter' THEN 30
    WHEN 'rising' THEN 75
    WHEN 'pro' THEN 150
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_mvp_credit_balance(
  p_user_id UUID,
  p_subscription_tier TEXT DEFAULT 'rookie'
)
RETURNS public.mvp_credit_balances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.mvp_credit_balances;
  v_quota INTEGER := public.mvp_monthly_credits_for_tier(p_subscription_tier);
BEGIN
  INSERT INTO public.mvp_credit_balances (user_id, balance, monthly_quota, subscription_tier, last_reset_at)
  VALUES (p_user_id, 0, v_quota, lower(coalesce(p_subscription_tier, 'rookie')), now())
  ON CONFLICT (user_id) DO UPDATE SET
    monthly_quota = GREATEST(public.mvp_credit_balances.monthly_quota, EXCLUDED.monthly_quota),
    subscription_tier = EXCLUDED.subscription_tier,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_monthly_mvp_credits(
  p_user_id UUID,
  p_subscription_tier TEXT,
  p_idempotency_key TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT 'Monthly MVP Builder credit grant',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount INTEGER := public.mvp_monthly_credits_for_tier(p_subscription_tier);
  v_existing public.mvp_credit_transactions;
  v_balance public.mvp_credit_balances;
  v_metadata JSONB := jsonb_strip_nulls(coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
    'idempotencyKey', nullif(trim(coalesce(p_idempotency_key, '')), ''),
    'subscriptionTier', lower(coalesce(p_subscription_tier, 'rookie'))
  ));
BEGIN
  PERFORM public.ensure_mvp_credit_balance(p_user_id, p_subscription_tier);

  IF v_amount <= 0 THEN
    SELECT * INTO v_balance FROM public.mvp_credit_balances WHERE user_id = p_user_id;
    RETURN jsonb_build_object('success', true, 'amount', 0, 'balance', v_balance.balance, 'monthlyQuota', v_balance.monthly_quota);
  END IF;

  IF nullif(trim(coalesce(p_idempotency_key, '')), '') IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.mvp_credit_transactions
    WHERE user_id = p_user_id
      AND tx_type = 'grant'
      AND metadata ->> 'idempotencyKey' = p_idempotency_key
    LIMIT 1;

    IF v_existing.id IS NOT NULL THEN
      SELECT * INTO v_balance FROM public.mvp_credit_balances WHERE user_id = p_user_id;
      RETURN jsonb_build_object('success', true, 'amount', 0, 'balance', v_balance.balance, 'monthlyQuota', v_balance.monthly_quota, 'duplicate', true);
    END IF;
  END IF;

  UPDATE public.mvp_credit_balances
  SET balance = balance + v_amount,
      monthly_quota = v_amount,
      subscription_tier = lower(coalesce(p_subscription_tier, 'rookie')),
      last_reset_at = now(),
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_balance;

  INSERT INTO public.mvp_credit_transactions (user_id, amount, tx_type, reason, feature, metadata)
  VALUES (p_user_id, v_amount, 'grant', p_reason, 'MVP Builder Monthly Grant', v_metadata);

  RETURN jsonb_build_object('success', true, 'amount', v_amount, 'balance', v_balance.balance, 'monthlyQuota', v_balance.monthly_quota);
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_mvp_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_pack_id TEXT,
  p_idempotency_key TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.mvp_credit_transactions;
  v_balance public.mvp_credit_balances;
  v_metadata JSONB := jsonb_strip_nulls(coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
    'idempotencyKey', nullif(trim(coalesce(p_idempotency_key, '')), ''),
    'packId', p_pack_id
  ));
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid MVP credit amount');
  END IF;

  PERFORM public.ensure_mvp_credit_balance(p_user_id, 'rookie');

  SELECT * INTO v_existing
  FROM public.mvp_credit_transactions
  WHERE user_id = p_user_id
    AND tx_type = 'purchase'
    AND metadata ->> 'idempotencyKey' = p_idempotency_key
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    SELECT * INTO v_balance FROM public.mvp_credit_balances WHERE user_id = p_user_id;
    RETURN jsonb_build_object('success', true, 'amount', 0, 'balance', v_balance.balance, 'duplicate', true);
  END IF;

  UPDATE public.mvp_credit_balances
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_balance;

  INSERT INTO public.mvp_credit_transactions (user_id, amount, tx_type, reason, feature, metadata)
  VALUES (p_user_id, p_amount, 'purchase', 'MVP Builder credit pack purchase', 'MVP Builder Credit Pack', v_metadata);

  RETURN jsonb_build_object('success', true, 'amount', p_amount, 'balance', v_balance.balance);
END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_mvp_credits_atomic(
  p_user_id UUID,
  p_amount INTEGER,
  p_feature TEXT,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.mvp_credit_transactions;
  v_balance public.mvp_credit_balances;
  v_idempotency_key TEXT := nullif(trim(coalesce(p_metadata ->> 'idempotencyKey', '')), '');
BEGIN
  IF p_amount < 0 THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'DEDUCTION_FAILED', 'error', 'Invalid MVP credit amount');
  END IF;

  PERFORM public.ensure_mvp_credit_balance(p_user_id, 'rookie');

  IF p_amount = 0 THEN
    SELECT * INTO v_balance FROM public.mvp_credit_balances WHERE user_id = p_user_id;
    RETURN jsonb_build_object('success', true, 'newBalance', v_balance.balance, 'usedFromBalance', 0);
  END IF;

  IF v_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.mvp_credit_transactions
    WHERE user_id = p_user_id
      AND tx_type = 'deduct'
      AND metadata ->> 'idempotencyKey' = v_idempotency_key
    LIMIT 1;

    IF v_existing.id IS NOT NULL THEN
      SELECT * INTO v_balance FROM public.mvp_credit_balances WHERE user_id = p_user_id;
      RETURN jsonb_build_object('success', true, 'newBalance', v_balance.balance, 'usedFromBalance', abs(v_existing.amount), 'duplicate', true);
    END IF;
  END IF;

  SELECT * INTO v_balance
  FROM public.mvp_credit_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF COALESCE(v_balance.balance, 0) < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'errorCode', 'INSUFFICIENT_MVP_CREDITS',
      'error', 'Not enough MVP Builder credits',
      'requiredCredits', p_amount,
      'newBalance', COALESCE(v_balance.balance, 0)
    );
  END IF;

  UPDATE public.mvp_credit_balances
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_balance;

  INSERT INTO public.mvp_credit_transactions (user_id, amount, tx_type, reason, feature, metadata)
  VALUES (p_user_id, -p_amount, 'deduct', coalesce(p_reason, p_feature), p_feature, coalesce(p_metadata, '{}'::jsonb));

  RETURN jsonb_build_object('success', true, 'newBalance', v_balance.balance, 'usedFromBalance', p_amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_mvp_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_feature TEXT,
  p_reason TEXT DEFAULT 'MVP Builder credit refund',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance public.mvp_credit_balances;
BEGIN
  IF p_amount <= 0 THEN
    SELECT * INTO v_balance FROM public.mvp_credit_balances WHERE user_id = p_user_id;
    RETURN jsonb_build_object('success', true, 'amount', 0, 'balance', COALESCE(v_balance.balance, 0));
  END IF;

  PERFORM public.ensure_mvp_credit_balance(p_user_id, 'rookie');

  UPDATE public.mvp_credit_balances
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_balance;

  INSERT INTO public.mvp_credit_transactions (user_id, amount, tx_type, reason, feature, metadata)
  VALUES (p_user_id, p_amount, 'refund', p_reason, p_feature, coalesce(p_metadata, '{}'::jsonb));

  RETURN jsonb_build_object('success', true, 'amount', p_amount, 'balance', v_balance.balance);
END;
$$;
