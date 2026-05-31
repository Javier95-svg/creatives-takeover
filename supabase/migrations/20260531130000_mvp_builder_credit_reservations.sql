-- Reserve regular platform-wallet credits while MVP Builder work is in flight.
-- The unused dedicated MVP wallet remains intact and intentionally unwired.

CREATE TABLE IF NOT EXISTS public.mvp_builder_credit_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  action_feature TEXT NOT NULL CHECK (action_feature LIKE 'APP_BUILDER_%'),
  listed_price INTEGER NOT NULL CHECK (listed_price > 0),
  held_amount INTEGER NOT NULL CHECK (held_amount > 0),
  used_from_quota INTEGER NOT NULL DEFAULT 0 CHECK (used_from_quota >= 0),
  used_from_balance INTEGER NOT NULL DEFAULT 0 CHECK (used_from_balance >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'finalized', 'released', 'expired')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  release_reason TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '10 minutes',
  finalized_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_mvp_builder_credit_reservations_pending_expiry
  ON public.mvp_builder_credit_reservations (expires_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_mvp_builder_credit_reservations_user_status
  ON public.mvp_builder_credit_reservations (user_id, status, created_at DESC);

ALTER TABLE public.mvp_builder_credit_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own MVP Builder credit reservations"
  ON public.mvp_builder_credit_reservations;
CREATE POLICY "Users can view their own MVP Builder credit reservations"
  ON public.mvp_builder_credit_reservations FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.release_mvp_builder_credit_reservation(
  p_reservation_id UUID,
  p_release_reason TEXT DEFAULT 'MVP Builder action released',
  p_expired BOOLEAN DEFAULT false,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation public.mvp_builder_credit_reservations;
  v_balance INTEGER;
  v_quota INTEGER;
BEGIN
  SELECT *
    INTO v_reservation
    FROM public.mvp_builder_credit_reservations
   WHERE id = p_reservation_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'RESERVATION_NOT_FOUND');
  END IF;

  IF v_reservation.status IN ('released', 'expired') THEN
    SELECT balance, monthly_quota INTO v_balance, v_quota
      FROM public.user_credits WHERE user_id = v_reservation.user_id;
    RETURN jsonb_build_object(
      'success', true,
      'reservationId', v_reservation.id,
      'reservationStatus', v_reservation.status,
      'userId', v_reservation.user_id,
      'actionFeature', v_reservation.action_feature,
      'wasReleased', false,
      'listedCreditCost', v_reservation.listed_price,
      'heldCredits', v_reservation.held_amount,
      'creditsUsed', 0,
      'balanceAfter', COALESCE(v_balance, 0) + COALESCE(v_quota, 0),
      'releaseReason', v_reservation.release_reason
    );
  END IF;

  IF v_reservation.status = 'finalized' THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'RESERVATION_FINALIZED');
  END IF;

  UPDATE public.user_credits
     SET monthly_quota = COALESCE(monthly_quota, 0) + v_reservation.used_from_quota,
         balance = COALESCE(balance, 0) + v_reservation.used_from_balance
   WHERE user_id = v_reservation.user_id
   RETURNING balance, monthly_quota INTO v_balance, v_quota;

  UPDATE public.mvp_builder_credit_reservations
     SET status = CASE WHEN p_expired THEN 'expired' ELSE 'released' END,
         release_reason = p_release_reason,
         released_at = now(),
         updated_at = now(),
         metadata = metadata || COALESCE(p_metadata, '{}'::jsonb)
   WHERE id = p_reservation_id;

  RETURN jsonb_build_object(
    'success', true,
    'reservationId', v_reservation.id,
    'reservationStatus', CASE WHEN p_expired THEN 'expired' ELSE 'released' END,
    'userId', v_reservation.user_id,
    'actionFeature', v_reservation.action_feature,
    'wasReleased', true,
    'listedCreditCost', v_reservation.listed_price,
    'heldCredits', v_reservation.held_amount,
    'creditsUsed', 0,
    'balanceAfter', COALESCE(v_balance, 0) + COALESCE(v_quota, 0),
    'releaseReason', p_release_reason
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_mvp_builder_credit_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_reservation IN
    SELECT id
      FROM public.mvp_builder_credit_reservations
     WHERE status = 'pending' AND expires_at <= now()
     FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.release_mvp_builder_credit_reservation(
      v_reservation.id,
      'MVP Builder reservation expired',
      true,
      jsonb_build_object('releaseReason', 'expired')
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_mvp_builder_credits(
  p_user_id UUID,
  p_action_feature TEXT,
  p_listed_price INTEGER,
  p_idempotency_key TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.mvp_builder_credit_reservations;
  v_reservation public.mvp_builder_credit_reservations;
  v_balance INTEGER;
  v_quota INTEGER;
  v_total INTEGER;
  v_held INTEGER;
  v_from_quota INTEGER;
  v_from_balance INTEGER;
BEGIN
  PERFORM public.cleanup_expired_mvp_builder_credit_reservations();

  IF p_action_feature IS NULL OR p_action_feature NOT LIKE 'APP_BUILDER_%'
     OR p_listed_price IS NULL OR p_listed_price <= 0
     OR NULLIF(TRIM(COALESCE(p_idempotency_key, '')), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_RESERVATION');
  END IF;

  SELECT *
    INTO v_existing
    FROM public.mvp_builder_credit_reservations
   WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    SELECT balance, monthly_quota INTO v_balance, v_quota
      FROM public.user_credits WHERE user_id = p_user_id;
    RETURN jsonb_build_object(
      'success', v_existing.status IN ('pending', 'finalized'),
      'reservationId', v_existing.id,
      'reservationStatus', v_existing.status,
      'listedCreditCost', v_existing.listed_price,
      'heldCredits', v_existing.held_amount,
      'creditsUsed', CASE WHEN v_existing.status = 'finalized' THEN v_existing.held_amount ELSE 0 END,
      'balanceAfter', COALESCE(v_balance, 0) + COALESCE(v_quota, 0)
    );
  END IF;

  SELECT balance, monthly_quota
    INTO v_balance, v_quota
    FROM public.user_credits
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'USER_NOT_FOUND');
  END IF;

  -- A concurrent retry can pass the first lookup before this wallet lock is acquired.
  SELECT *
    INTO v_existing
    FROM public.mvp_builder_credit_reservations
   WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', v_existing.status IN ('pending', 'finalized'),
      'reservationId', v_existing.id,
      'reservationStatus', v_existing.status,
      'listedCreditCost', v_existing.listed_price,
      'heldCredits', v_existing.held_amount,
      'creditsUsed', CASE WHEN v_existing.status = 'finalized' THEN v_existing.held_amount ELSE 0 END,
      'balanceAfter', COALESCE(v_balance, 0) + COALESCE(v_quota, 0)
    );
  END IF;

  v_total := COALESCE(v_balance, 0) + COALESCE(v_quota, 0);
  IF v_total <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'errorCode', 'INSUFFICIENT_CREDITS',
      'requiredCredits', p_listed_price
    );
  END IF;

  v_held := LEAST(v_total, p_listed_price);
  v_from_quota := LEAST(COALESCE(v_quota, 0), v_held);
  v_from_balance := v_held - v_from_quota;

  UPDATE public.user_credits
     SET monthly_quota = COALESCE(monthly_quota, 0) - v_from_quota,
         balance = COALESCE(balance, 0) - v_from_balance
   WHERE user_id = p_user_id
   RETURNING balance, monthly_quota INTO v_balance, v_quota;

  INSERT INTO public.mvp_builder_credit_reservations (
    user_id, idempotency_key, action_feature, listed_price, held_amount,
    used_from_quota, used_from_balance, metadata
  ) VALUES (
    p_user_id, p_idempotency_key, p_action_feature, p_listed_price, v_held,
    v_from_quota, v_from_balance, COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO v_reservation;

  RETURN jsonb_build_object(
    'success', true,
    'reservationId', v_reservation.id,
    'reservationStatus', 'pending',
    'listedCreditCost', p_listed_price,
    'heldCredits', v_held,
    'creditsUsed', 0,
    'balanceAfter', COALESCE(v_balance, 0) + COALESCE(v_quota, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_mvp_builder_credit_reservation(
  p_reservation_id UUID,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation public.mvp_builder_credit_reservations;
  v_balance INTEGER;
  v_quota INTEGER;
BEGIN
  SELECT *
    INTO v_reservation
    FROM public.mvp_builder_credit_reservations
   WHERE id = p_reservation_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'RESERVATION_NOT_FOUND');
  END IF;

  SELECT balance, monthly_quota INTO v_balance, v_quota
    FROM public.user_credits WHERE user_id = v_reservation.user_id;

  IF v_reservation.status = 'finalized' THEN
    RETURN jsonb_build_object(
      'success', true,
      'reservationId', v_reservation.id,
      'reservationStatus', 'finalized',
      'userId', v_reservation.user_id,
      'actionFeature', v_reservation.action_feature,
      'wasFinalized', false,
      'listedCreditCost', v_reservation.listed_price,
      'heldCredits', v_reservation.held_amount,
      'creditsUsed', v_reservation.held_amount,
      'balanceAfter', COALESCE(v_balance, 0) + COALESCE(v_quota, 0)
    );
  END IF;

  IF v_reservation.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'RESERVATION_NOT_PENDING');
  END IF;

  INSERT INTO public.credit_transactions (
    user_id, amount, tx_type, reason, feature, metadata
  ) VALUES (
    v_reservation.user_id,
    -v_reservation.held_amount,
    'deduct',
    FORMAT('Used %s credits for %s', v_reservation.held_amount, v_reservation.action_feature),
    v_reservation.action_feature,
    jsonb_strip_nulls(
      v_reservation.metadata ||
      COALESCE(p_metadata, '{}'::jsonb) ||
      jsonb_build_object(
        'reservationId', v_reservation.id,
        'idempotencyKey', v_reservation.idempotency_key,
        'listedCreditCost', v_reservation.listed_price,
        'creditCost', v_reservation.held_amount,
        'usedFromQuota', v_reservation.used_from_quota,
        'usedFromBalance', v_reservation.used_from_balance,
        'balanceAfter', v_balance,
        'monthlyQuotaAfter', v_quota,
        'balance_after', v_balance,
        'monthly_quota_after', v_quota
      )
    )
  );

  UPDATE public.mvp_builder_credit_reservations
     SET status = 'finalized',
         finalized_at = now(),
         updated_at = now(),
         metadata = metadata || COALESCE(p_metadata, '{}'::jsonb)
   WHERE id = p_reservation_id;

  RETURN jsonb_build_object(
    'success', true,
    'reservationId', v_reservation.id,
    'reservationStatus', 'finalized',
    'userId', v_reservation.user_id,
    'actionFeature', v_reservation.action_feature,
    'wasFinalized', true,
    'listedCreditCost', v_reservation.listed_price,
    'heldCredits', v_reservation.held_amount,
    'creditsUsed', v_reservation.held_amount,
    'balanceAfter', COALESCE(v_balance, 0) + COALESCE(v_quota, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_mvp_builder_held_credits(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() = p_user_id OR auth.role() = 'service_role'
      THEN COALESCE(SUM(held_amount), 0)::INTEGER
    ELSE 0
  END
  FROM public.mvp_builder_credit_reservations
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND expires_at > now();
$$;

-- Exact, idempotent refund allocation for legacy deduct-then-refund paths.
CREATE OR REPLACE FUNCTION public.refund_platform_credits_atomic(
  p_user_id UUID,
  p_amount INTEGER,
  p_feature TEXT,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deduction public.credit_transactions;
  v_existing_refund public.credit_transactions;
  v_balance INTEGER;
  v_quota INTEGER;
  v_from_quota INTEGER := 0;
  v_from_balance INTEGER := 0;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_REFUND');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    FORMAT('platform-refund:%s:%s:%s', p_user_id, p_feature, p_amount),
    0
  ));

  SELECT *
    INTO v_deduction
    FROM public.credit_transactions d
   WHERE d.user_id = p_user_id
     AND d.tx_type = 'deduct'
     AND d.feature = p_feature
     AND ABS(d.amount) = p_amount
   ORDER BY d.created_at DESC
   LIMIT 1
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'DEDUCTION_NOT_FOUND');
  END IF;

  SELECT *
    INTO v_existing_refund
    FROM public.credit_transactions r
   WHERE r.user_id = p_user_id
     AND r.tx_type = 'refund'
     AND r.metadata ->> 'refundedDeductionId' = v_deduction.id::text
   ORDER BY r.created_at DESC
   LIMIT 1;

  IF FOUND THEN
    SELECT balance, monthly_quota INTO v_balance, v_quota
      FROM public.user_credits WHERE user_id = p_user_id;
    RETURN jsonb_build_object(
      'success', true,
      'replayed', true,
      'newBalance', COALESCE(v_balance, 0),
      'newQuota', COALESCE(v_quota, 0),
      'refundedToQuota', COALESCE((v_existing_refund.metadata ->> 'restoredToQuota')::INTEGER, 0),
      'refundedToBalance', COALESCE((v_existing_refund.metadata ->> 'restoredToBalance')::INTEGER, 0)
    );
  END IF;

  v_from_quota := COALESCE((v_deduction.metadata ->> 'usedFromQuota')::INTEGER, 0);
  v_from_balance := COALESCE((v_deduction.metadata ->> 'usedFromBalance')::INTEGER, p_amount - v_from_quota);

  UPDATE public.user_credits
     SET monthly_quota = COALESCE(monthly_quota, 0) + v_from_quota,
         balance = COALESCE(balance, 0) + v_from_balance
   WHERE user_id = p_user_id
   RETURNING balance, monthly_quota INTO v_balance, v_quota;

  INSERT INTO public.credit_transactions (user_id, amount, tx_type, reason, feature, metadata)
  VALUES (
    p_user_id, p_amount, 'refund', p_reason, p_feature,
    COALESCE(p_metadata, '{}'::jsonb) ||
    jsonb_strip_nulls(jsonb_build_object(
      'refundedDeductionId', v_deduction.id,
      'restoredToQuota', v_from_quota,
      'restoredToBalance', v_from_balance
    ))
  );

  RETURN jsonb_build_object(
    'success', true,
    'newBalance', v_balance,
    'newQuota', v_quota,
    'refundedToQuota', v_from_quota,
    'refundedToBalance', v_from_balance
  );
END;
$$;

REVOKE ALL ON TABLE public.mvp_builder_credit_reservations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.mvp_builder_credit_reservations TO authenticated;
GRANT ALL ON TABLE public.mvp_builder_credit_reservations TO service_role;

REVOKE ALL ON FUNCTION public.reserve_mvp_builder_credits(UUID, TEXT, INTEGER, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_mvp_builder_credit_reservation(UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_mvp_builder_credit_reservation(UUID, TEXT, BOOLEAN, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_expired_mvp_builder_credit_reservations() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_platform_credits_atomic(UUID, INTEGER, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_mvp_builder_held_credits(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_mvp_builder_credits(UUID, TEXT, INTEGER, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_mvp_builder_credit_reservation(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_mvp_builder_credit_reservation(UUID, TEXT, BOOLEAN, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_mvp_builder_credit_reservations() TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_platform_credits_atomic(UUID, INTEGER, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_mvp_builder_held_credits(UUID) TO authenticated, service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('cleanup-mvp-builder-credit-reservations');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;
SELECT cron.schedule(
  'cleanup-mvp-builder-credit-reservations',
  '*/5 * * * *',
  $$SELECT public.cleanup_expired_mvp_builder_credit_reservations();$$
);
