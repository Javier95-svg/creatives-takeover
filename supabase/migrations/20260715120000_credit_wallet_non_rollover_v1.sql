-- Canonical credit wallet semantics.
--
-- monthly_quota: remaining plan credits in the current billing period. It is
-- replaced (never added) at a real billing boundary.
-- balance: persistent credits purchased or explicitly granted outside the plan.
-- total_available: monthly_quota + balance - active holds.

CREATE TABLE IF NOT EXISTS public.credit_wallet_reconciliation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  previous_balance integer NOT NULL,
  previous_monthly_quota integer NOT NULL,
  previous_total integer NOT NULL,
  new_balance integer NOT NULL,
  new_monthly_quota integer NOT NULL,
  new_total integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_wallet_reconciliation_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.credit_wallet_reconciliation_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.credit_wallet_reconciliation_audit TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS credit_refund_original_deduction_unique
  ON public.credit_transactions ((metadata ->> 'original_deduction_id'))
  WHERE tx_type = 'refund' AND metadata ->> 'original_deduction_id' IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_credit_wallet_v1()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance integer := 0;
  v_monthly_quota integer := 0;
  v_held integer := 0;
  v_tier text := 'rookie';
  v_plan_allocation integer := 50;
  v_period_start timestamptz;
  v_period_end timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    COALESCE(uc.balance, 0),
    COALESCE(uc.monthly_quota, 0),
    public.normalize_subscription_tier(COALESCE(uc.subscription_tier, 'rookie')),
    uc.current_period_start,
    uc.current_period_end
  INTO v_balance, v_monthly_quota, v_tier, v_period_start, v_period_end
  FROM public.user_credits uc
  WHERE uc.user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'version', 1,
      'walletFound', false,
      'persistentBalance', 0,
      'monthlyQuotaRemaining', 0,
      'heldCredits', 0,
      'totalAvailable', 0,
      'subscriptionTier', 'rookie',
      'planMonthlyAllocation', 50,
      'currentPeriodStart', NULL,
      'currentPeriodEnd', NULL
    );
  END IF;

  SELECT COALESCE(st.monthly_credits, 50)
  INTO v_plan_allocation
  FROM public.subscription_tiers st
  WHERE st.tier_name = v_tier;
  v_plan_allocation := COALESCE(v_plan_allocation, 50);

  IF to_regprocedure('public.get_mvp_builder_held_credits(uuid)') IS NOT NULL THEN
    v_held := COALESCE(public.get_mvp_builder_held_credits(v_user_id), 0);
  END IF;

  RETURN jsonb_build_object(
    'version', 1,
    'walletFound', true,
    'persistentBalance', v_balance,
    'monthlyQuotaRemaining', v_monthly_quota,
    'heldCredits', v_held,
    -- Active reservations have already been removed from the two spendable
    -- pools, so held credits are informational and must not be subtracted twice.
    'totalAvailable', GREATEST(0, v_balance + v_monthly_quota),
    'subscriptionTier', v_tier,
    'planMonthlyAllocation', v_plan_allocation,
    'currentPeriodStart', v_period_start,
    'currentPeriodEnd', v_period_end
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_credit_wallet_v1() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_credit_wallet_v1() TO authenticated, service_role;

-- Service-only inventory for reviewing historical wallets before any additional
-- account repair. It deliberately reports ledger categories instead of
-- auto-clawing accounts whose old metadata cannot prove whether a grant was a
-- purchase, bonus, or legacy subscription allocation.
CREATE OR REPLACE FUNCTION public.get_credit_wallet_reconciliation_candidates_v1()
RETURNS TABLE (
  user_id uuid,
  subscription_tier text,
  persistent_balance integer,
  monthly_quota_remaining integer,
  purchase_credits bigint,
  subscription_grants bigint,
  administrative_grants bigint,
  other_grants bigint,
  spent_from_persistent_balance bigint,
  refunded_to_persistent_balance bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    uc.user_id,
    public.normalize_subscription_tier(COALESCE(uc.subscription_tier, 'rookie')),
    uc.balance,
    uc.monthly_quota,
    COALESCE(SUM(ct.amount) FILTER (WHERE ct.tx_type = 'purchase'), 0)::bigint,
    COALESCE(SUM(GREATEST(ct.amount, 0)) FILTER (
      WHERE ct.tx_type = 'grant' AND COALESCE(ct.feature, '') LIKE 'Subscription - %'
    ), 0)::bigint,
    COALESCE(SUM(GREATEST(ct.amount, 0)) FILTER (
      WHERE ct.tx_type = 'grant'
        AND (COALESCE(ct.feature, '') ILIKE '%admin%' OR COALESCE(ct.reason, '') ILIKE '%admin%')
    ), 0)::bigint,
    COALESCE(SUM(GREATEST(ct.amount, 0)) FILTER (
      WHERE ct.tx_type = 'grant'
        AND COALESCE(ct.feature, '') NOT LIKE 'Subscription - %'
        AND COALESCE(ct.feature, '') NOT ILIKE '%admin%'
        AND COALESCE(ct.reason, '') NOT ILIKE '%admin%'
    ), 0)::bigint,
    COALESCE(SUM(COALESCE(
      NULLIF(ct.metadata ->> 'usedFromBalance', '')::integer,
      NULLIF(ct.metadata ->> 'used_from_balance', '')::integer,
      0
    )) FILTER (WHERE ct.tx_type = 'deduct'), 0)::bigint,
    COALESCE(SUM(COALESCE(
      NULLIF(ct.metadata ->> 'restoredToPersistentBalance', '')::integer,
      0
    )) FILTER (WHERE ct.tx_type = 'refund'), 0)::bigint
  FROM public.user_credits uc
  LEFT JOIN public.credit_transactions ct ON ct.user_id = uc.user_id
  GROUP BY uc.user_id, uc.subscription_tier, uc.balance, uc.monthly_quota;
$$;

REVOKE ALL ON FUNCTION public.get_credit_wallet_reconciliation_candidates_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_credit_wallet_reconciliation_candidates_v1() TO service_role;

-- Subscription synchronization must never put plan credits in the persistent
-- balance and must never refill a partially spent quota inside the same period.
CREATE OR REPLACE FUNCTION public.update_user_subscription_tier(
  target_user_id uuid,
  new_tier text,
  is_subscribed boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_tier text := public.normalize_subscription_tier(new_tier);
  v_previous_tier text := 'rookie';
  v_tier_credits integer;
  v_previous_quota integer := 0;
  v_next_quota integer := 0;
  v_period_end timestamptz;
  v_boundary_crossed boolean := false;
  v_tier_changed boolean := false;
  v_window record;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = target_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  SELECT COALESCE(st.monthly_credits, 0)
  INTO v_tier_credits
  FROM public.subscription_tiers st
  WHERE st.tier_name = v_tier;
  IF v_tier_credits IS NULL THEN
    RAISE EXCEPTION 'Invalid subscription tier: %', new_tier;
  END IF;

  INSERT INTO public.user_credits (
    user_id, balance, monthly_quota, subscription_tier, last_reset_at,
    billing_anchor_at, current_period_start, current_period_end
  ) VALUES (
    target_user_id, 0, v_tier_credits, v_tier, now(), now(), now(), now() + interval '1 month'
  ) ON CONFLICT (user_id) DO NOTHING;

  SELECT
    public.normalize_subscription_tier(COALESCE(uc.subscription_tier, 'rookie')),
    COALESCE(uc.monthly_quota, 0),
    uc.current_period_end
  INTO v_previous_tier, v_previous_quota, v_period_end
  FROM public.user_credits uc
  WHERE uc.user_id = target_user_id
  FOR UPDATE;

  v_tier_changed := v_previous_tier IS DISTINCT FROM v_tier;
  v_boundary_crossed := v_period_end IS NULL OR now() >= v_period_end;
  v_next_quota := CASE
    WHEN v_tier_changed OR v_boundary_crossed THEN v_tier_credits
    ELSE v_previous_quota
  END;

  SELECT * INTO v_window
  FROM public.compute_monthly_billing_window(
    COALESCE((SELECT billing_anchor_at FROM public.user_credits WHERE user_id = target_user_id), now()),
    now()
  );

  UPDATE public.user_credits
  SET subscription_tier = v_tier,
      monthly_quota = v_next_quota,
      last_reset_at = CASE WHEN v_tier_changed OR v_boundary_crossed THEN now() ELSE last_reset_at END,
      last_credit_grant = CASE WHEN v_tier_changed OR v_boundary_crossed THEN now() ELSE last_credit_grant END,
      current_period_start = CASE WHEN v_boundary_crossed THEN v_window.period_start ELSE current_period_start END,
      current_period_end = CASE WHEN v_boundary_crossed THEN v_window.period_end ELSE current_period_end END,
      updated_at = now()
  WHERE user_id = target_user_id;

  UPDATE public.profiles
  SET subscribed = is_subscribed,
      subscription_tier = v_tier,
      monthly_credits = v_tier_credits,
      credit_balance = (SELECT balance FROM public.user_credits WHERE user_id = target_user_id),
      updated_at = now()
  WHERE id = target_user_id;

  INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier, updated_at)
  VALUES (target_user_id, v_email, is_subscribed, v_tier, now())
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    subscribed = EXCLUDED.subscribed,
    subscription_tier = EXCLUDED.subscription_tier,
    updated_at = now();

  IF v_next_quota IS DISTINCT FROM v_previous_quota THEN
    INSERT INTO public.credit_transactions (user_id, amount, tx_type, reason, feature, metadata)
    VALUES (
      target_user_id,
      v_next_quota - v_previous_quota,
      'reset',
      'Non-rollover subscription quota replacement',
      'Monthly Quota Reset',
      jsonb_build_object(
        'grantType', 'monthly_quota_replacement',
        'previousQuota', v_previous_quota,
        'newQuota', v_next_quota,
        'tier', v_tier,
        'tierChanged', v_tier_changed,
        'billingBoundaryCrossed', v_boundary_crossed
      )
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_subscription_tier(
  user_email text,
  new_tier text,
  is_subscribed boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(btrim(user_email)) LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  PERFORM public.update_user_subscription_tier(v_user_id, new_tier, is_subscribed);
END;
$$;

REVOKE ALL ON FUNCTION public.update_user_subscription_tier(uuid, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_user_subscription_tier(text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_subscription_tier(uuid, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_user_subscription_tier(text, text, boolean) TO service_role;

-- Refund the exact pools used by the original deduction. Monthly credits are
-- restored only within their original billing period and are capped at the plan
-- allocation, so refunds can never create rollover credits.
CREATE OR REPLACE FUNCTION public.refund_platform_credits_atomic(
  p_user_id uuid,
  p_amount integer,
  p_feature text,
  p_reason text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deduction public.credit_transactions%ROWTYPE;
  v_requested_deduction_id uuid;
  v_used_quota integer;
  v_used_balance integer;
  v_restore_quota integer := 0;
  v_restore_balance integer := 0;
  v_balance integer;
  v_quota integer;
  v_plan_allocation integer := 0;
  v_period_start timestamptz;
  v_refund_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid refund request');
  END IF;

  BEGIN
    v_requested_deduction_id := NULLIF(p_metadata ->> 'deductionTransactionId', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid deduction transaction ID');
  END;

  SELECT ct.* INTO v_deduction
  FROM public.credit_transactions ct
  WHERE ct.user_id = p_user_id
    AND ct.tx_type = 'deduct'
    AND abs(ct.amount) = p_amount
    AND (v_requested_deduction_id IS NULL OR ct.id = v_requested_deduction_id)
    AND (v_requested_deduction_id IS NOT NULL OR ct.feature = p_feature)
    AND NOT EXISTS (
      SELECT 1 FROM public.credit_transactions refund
      WHERE refund.tx_type = 'refund'
        AND refund.metadata ->> 'original_deduction_id' = ct.id::text
    )
  ORDER BY ct.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Matching unrefunded deduction not found');
  END IF;

  v_used_quota := COALESCE(
    NULLIF(v_deduction.metadata ->> 'usedFromQuota', '')::integer,
    NULLIF(v_deduction.metadata ->> 'used_from_quota', '')::integer,
    0
  );
  v_used_balance := COALESCE(
    NULLIF(v_deduction.metadata ->> 'usedFromBalance', '')::integer,
    NULLIF(v_deduction.metadata ->> 'used_from_balance', '')::integer,
    0
  );

  IF v_used_quota + v_used_balance <> p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deduction pool metadata is incomplete');
  END IF;

  SELECT uc.balance, uc.monthly_quota, uc.current_period_start,
         COALESCE(st.monthly_credits, 0)
  INTO v_balance, v_quota, v_period_start, v_plan_allocation
  FROM public.user_credits uc
  LEFT JOIN public.subscription_tiers st
    ON st.tier_name = public.normalize_subscription_tier(uc.subscription_tier)
  WHERE uc.user_id = p_user_id
  FOR UPDATE OF uc;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Credit wallet not found');
  END IF;

  v_restore_quota := CASE
    WHEN v_period_start IS NULL OR v_deduction.created_at >= v_period_start
      THEN LEAST(v_used_quota, GREATEST(0, v_plan_allocation - v_quota))
    ELSE 0
  END;
  v_restore_balance := v_used_balance;

  UPDATE public.user_credits
  SET monthly_quota = monthly_quota + v_restore_quota,
      balance = balance + v_restore_balance,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.credit_transactions (user_id, amount, tx_type, reason, feature, metadata)
  VALUES (
    p_user_id,
    v_restore_quota + v_restore_balance,
    'refund',
    p_reason,
    p_feature,
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'original_deduction_id', v_deduction.id,
      'requestedAmount', p_amount,
      'restoredToMonthlyQuota', v_restore_quota,
      'restoredToPersistentBalance', v_restore_balance,
      'expiredMonthlyCreditsNotRestored', v_used_quota - v_restore_quota
    )
  ) RETURNING id INTO v_refund_id;

  RETURN jsonb_build_object(
    'success', true,
    'refundTransactionId', v_refund_id,
    'originalDeductionId', v_deduction.id,
    'restoredToMonthlyQuota', v_restore_quota,
    'restoredToPersistentBalance', v_restore_balance,
    'newQuota', v_quota + v_restore_quota,
    'newBalance', v_balance + v_restore_balance
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', true, 'alreadyRefunded', true);
END;
$$;

REVOKE ALL ON FUNCTION public.refund_platform_credits_atomic(uuid, integer, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_platform_credits_atomic(uuid, integer, text, text, jsonb) TO service_role;

-- One-time correction authorized by the account owner: the admin wallet's
-- confirmed spendable total is 671. Preserve the current monthly remainder and
-- classify only the residual as persistent balance.
DO $$
DECLARE
  v_user_id uuid;
  v_balance integer;
  v_quota integer;
  v_new_balance integer;
  v_expected_total constant integer := 671;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = 'admin@creatives-takeover.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Admin wallet correction skipped: account not found';
    RETURN;
  END IF;

  SELECT balance, monthly_quota INTO v_balance, v_quota
  FROM public.user_credits
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE NOTICE 'Admin wallet correction skipped: wallet not found';
    RETURN;
  END IF;

  v_new_balance := GREATEST(0, v_expected_total - v_quota);

  IF v_balance + v_quota IS DISTINCT FROM v_expected_total THEN
    INSERT INTO public.credit_wallet_reconciliation_audit (
      user_id, reason, previous_balance, previous_monthly_quota, previous_total,
      new_balance, new_monthly_quota, new_total, metadata
    ) VALUES (
      v_user_id,
      'Remove duplicated plan allowance from persistent admin balance',
      v_balance, v_quota, v_balance + v_quota,
      v_new_balance, v_quota, v_new_balance + v_quota,
      jsonb_build_object(
        'migration', '20260715120000_credit_wallet_non_rollover_v1',
        'confirmedExpectedTotal', v_expected_total
      )
    );

    UPDATE public.user_credits
    SET balance = v_new_balance, updated_at = now()
    WHERE user_id = v_user_id;

    UPDATE public.profiles
    SET credit_balance = v_new_balance, updated_at = now()
    WHERE id = v_user_id;

    INSERT INTO public.credit_transactions (user_id, amount, tx_type, reason, feature, metadata)
    VALUES (
      v_user_id,
      v_new_balance - v_balance,
      'adjustment',
      'Wallet reconciliation: remove duplicated non-rollover plan credits',
      'Wallet Reconciliation',
      jsonb_build_object(
        'previousBalance', v_balance,
        'newBalance', v_new_balance,
        'monthlyQuotaRemaining', v_quota,
        'previousTotal', v_balance + v_quota,
        'newTotal', v_new_balance + v_quota,
        'migration', '20260715120000_credit_wallet_non_rollover_v1'
      )
    );
  END IF;
END;
$$;
