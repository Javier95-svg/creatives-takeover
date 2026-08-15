-- Social interactions are relationship infrastructure, not AI generation.
-- Keep historical credit rows intact while making all future mentor messages,
-- Discovery Calls, and co-founder listing publications balance-neutral.

DROP TRIGGER IF EXISTS trg_charge_mentor_dm ON public.messages;

CREATE OR REPLACE FUNCTION public.get_discovery_call_policy(p_plan TEXT)
RETURNS TABLE(
  normalized_plan TEXT,
  included_limit INTEGER,
  upgrade_target TEXT,
  overage_credit_cost INTEGER,
  has_unlimited BOOLEAN
)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.normalize_subscription_tier(p_plan), NULL::integer, NULL::text, 0, true;
$$;

CREATE OR REPLACE FUNCTION public.get_discovery_call_quota_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_period record; v_used integer := 0; v_total integer := 0;
BEGIN
  SELECT * INTO v_period FROM public.get_user_billing_period(p_user_id);
  SELECT COALESCE(included_calls_booked, 0) + COALESCE(overage_calls_booked, 0)
    INTO v_used FROM public.discovery_call_cycle_counters
    WHERE user_id = p_user_id AND billing_period_start = v_period.period_start_date;
  SELECT COALESCE(balance, 0) + COALESCE(monthly_quota, 0)
    INTO v_total FROM public.user_credits WHERE user_id = p_user_id;
  RETURN jsonb_build_object(
    'success', true, 'plan', public.normalize_subscription_tier(v_period.subscription_tier),
    'billingPeriodStart', v_period.period_start_date, 'billingPeriodEnd', v_period.period_end,
    'includedLimit', NULL, 'upgradeTarget', NULL, 'overageCreditCost', 0,
    'hasUnlimited', true, 'includedCallsBooked', COALESCE(v_used, 0),
    'overageCallsBooked', 0, 'usedCalls', COALESCE(v_used, 0),
    'remainingIncluded', NULL, 'requiresCredits', false, 'canBookNow', true,
    'totalCreditsAvailable', COALESCE(v_total, 0)
  );
END;
$$;

-- The V2 reservation lifecycle remains in place for scheduling idempotency,
-- but a free reservation holds zero credits.
ALTER TABLE public.discovery_call_credit_reservations
  DROP CONSTRAINT IF EXISTS discovery_call_credit_reservations_listed_price_check;
ALTER TABLE public.discovery_call_credit_reservations
  DROP CONSTRAINT IF EXISTS discovery_call_credit_reservations_held_amount_check;
ALTER TABLE public.discovery_call_credit_reservations
  ADD CONSTRAINT discovery_call_credit_reservations_listed_price_nonnegative CHECK (listed_price >= 0),
  ADD CONSTRAINT discovery_call_credit_reservations_held_amount_nonnegative CHECK (held_amount >= 0);

DO $$
BEGIN
  IF to_regprocedure('public.create_discovery_call_request_v2_metered_legacy(uuid,uuid,text,text,text,text,text,jsonb,text,text)') IS NULL THEN
    ALTER FUNCTION public.create_discovery_call_request_v2(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT)
      RENAME TO create_discovery_call_request_v2_metered_legacy;
  END IF;
  IF to_regprocedure('public.create_discovery_call_instant_booking_v4_metered_legacy(uuid,uuid,text,text,text,text,text,timestamptz,text,text)') IS NULL THEN
    ALTER FUNCTION public.create_discovery_call_instant_booking_v4(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT)
      RENAME TO create_discovery_call_instant_booking_v4_metered_legacy;
  END IF;
  IF to_regprocedure('public.finalize_discovery_call_reservation_v2_metered_legacy(uuid,timestamptz)') IS NULL THEN
    ALTER FUNCTION public.finalize_discovery_call_reservation_v2(UUID, TIMESTAMPTZ)
      RENAME TO finalize_discovery_call_reservation_v2_metered_legacy;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.social_action_idempotency (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_key text NOT NULL CHECK (action_key IN ('cofounder_publish', 'cofounder_renew')),
  idempotency_key text NOT NULL CHECK (char_length(idempotency_key) BETWEEN 8 AND 200),
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, action_key, idempotency_key)
);
ALTER TABLE public.social_action_idempotency ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.social_action_idempotency FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.social_action_idempotency TO service_role;

CREATE OR REPLACE FUNCTION public.create_discovery_call_request_v2(
  p_founder_id UUID, p_mentor_id UUID, p_idempotency_key TEXT,
  p_topic TEXT, p_desired_outcome TEXT, p_notes TEXT, p_timezone TEXT,
  p_slots JSONB, p_token_hash TEXT, p_token_ciphertext TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE v_balance integer; v_quota integer; v_result jsonb; v_call uuid;
BEGIN
  SELECT balance, monthly_quota INTO v_balance, v_quota
  FROM public.user_credits WHERE user_id = p_founder_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'errorCode', 'CREDIT_ACCOUNT_MISSING'); END IF;
  UPDATE public.user_credits SET monthly_quota = monthly_quota + 10 WHERE user_id = p_founder_id;
  v_result := public.create_discovery_call_request_v2_metered_legacy(
    p_founder_id, p_mentor_id, p_idempotency_key, p_topic, p_desired_outcome,
    p_notes, p_timezone, p_slots, p_token_hash, p_token_ciphertext
  );
  UPDATE public.user_credits SET balance = v_balance, monthly_quota = v_quota, updated_at = now()
  WHERE user_id = p_founder_id;
  IF COALESCE((v_result->>'success')::boolean, false) THEN
    v_call := NULLIF(v_result->>'callId', '')::uuid;
    UPDATE public.discovery_call_credit_reservations
    SET listed_price = 0, held_amount = 0, used_from_quota = 0, used_from_balance = 0,
        metadata = metadata || '{"pricingModel":"free_social_loop"}'::jsonb
    WHERE discovery_call_id = v_call;
    UPDATE public.discovery_calls
    SET credit_charge_amount = 0, credits_charged = false, used_from_quota = 0, used_from_balance = 0,
        consumption_mode = 'included'
    WHERE id = v_call;
    v_result := v_result || jsonb_build_object('heldCredits', 0, 'balanceAfter', v_balance + v_quota);
  END IF;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_discovery_call_instant_booking_v4(
  p_founder_id UUID, p_mentor_id UUID, p_idempotency_key TEXT,
  p_topic TEXT, p_desired_outcome TEXT, p_notes TEXT, p_timezone TEXT,
  p_starts_at TIMESTAMPTZ, p_management_token_hash TEXT, p_management_token_ciphertext TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE v_balance integer; v_quota integer; v_result jsonb; v_call uuid;
BEGIN
  SELECT balance, monthly_quota INTO v_balance, v_quota
  FROM public.user_credits WHERE user_id = p_founder_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'errorCode', 'CREDIT_ACCOUNT_MISSING'); END IF;
  UPDATE public.user_credits SET monthly_quota = monthly_quota + 10 WHERE user_id = p_founder_id;
  v_result := public.create_discovery_call_instant_booking_v4_metered_legacy(
    p_founder_id, p_mentor_id, p_idempotency_key, p_topic, p_desired_outcome,
    p_notes, p_timezone, p_starts_at, p_management_token_hash, p_management_token_ciphertext
  );
  UPDATE public.user_credits SET balance = v_balance, monthly_quota = v_quota, updated_at = now()
  WHERE user_id = p_founder_id;
  IF COALESCE((v_result->>'success')::boolean, false) THEN
    v_call := NULLIF(v_result->>'callId', '')::uuid;
    UPDATE public.discovery_call_credit_reservations
    SET listed_price = 0, held_amount = 0, used_from_quota = 0, used_from_balance = 0,
        metadata = metadata || '{"pricingModel":"free_social_loop"}'::jsonb
    WHERE discovery_call_id = v_call;
    UPDATE public.discovery_calls
    SET credit_charge_amount = 0, credits_charged = false, used_from_quota = 0, used_from_balance = 0,
        consumption_mode = 'included'
    WHERE id = v_call;
    v_result := v_result || jsonb_build_object('heldCredits', 0, 'balanceAfter', v_balance + v_quota);
  END IF;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_discovery_call_reservation_v2(
  p_reservation_id UUID, p_scheduled_for TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_res public.discovery_call_credit_reservations%ROWTYPE; v_period record;
BEGIN
  SELECT * INTO v_res FROM public.discovery_call_credit_reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'errorCode', 'RESERVATION_NOT_FOUND'); END IF;
  IF v_res.held_amount > 0 THEN
    RETURN public.finalize_discovery_call_reservation_v2_metered_legacy(p_reservation_id, p_scheduled_for);
  END IF;
  IF v_res.status = 'finalized' THEN RETURN jsonb_build_object('success', true, 'alreadyFinalized', true, 'creditsUsed', 0); END IF;
  IF v_res.status <> 'pending' OR v_res.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'RESERVATION_NOT_PENDING');
  END IF;
  SELECT * INTO v_period FROM public.get_user_billing_period(v_res.user_id, p_scheduled_for);
  UPDATE public.discovery_call_credit_reservations SET status = 'finalized', finalized_at = now() WHERE id = p_reservation_id;
  UPDATE public.discovery_calls SET billing_period_start = v_period.period_start_date,
    billing_period_end = v_period.period_end, subscription_tier_snapshot = public.normalize_subscription_tier(v_period.subscription_tier),
    included_call_limit = NULL, counted_in_cycle = true, counted_at = now(), consumption_mode = 'included',
    credit_charge_amount = 0, credits_charged = false, used_from_quota = 0, used_from_balance = 0
  WHERE id = v_res.discovery_call_id;
  RETURN jsonb_build_object('success', true, 'creditsUsed', 0);
END;
$$;

DO $$
BEGIN
  IF to_regprocedure('public.publish_cofounder_listing_v2_metered_legacy(jsonb,text)') IS NULL THEN
    ALTER FUNCTION public.publish_cofounder_listing_v2(JSONB, TEXT) RENAME TO publish_cofounder_listing_v2_metered_legacy;
  END IF;
  IF to_regprocedure('public.renew_cofounder_listing_v2_metered_legacy(uuid,text)') IS NULL THEN
    ALTER FUNCTION public.renew_cofounder_listing_v2(UUID, TEXT) RENAME TO renew_cofounder_listing_v2_metered_legacy;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_cofounder_listing_v2(p_listing JSONB, p_idempotency_key TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_user uuid := auth.uid(); v_balance integer; v_quota integer; v_result jsonb;
BEGIN
  SELECT result INTO v_result FROM public.social_action_idempotency
  WHERE user_id = v_user AND action_key = 'cofounder_publish' AND idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN v_result; END IF;
  SELECT balance, monthly_quota INTO v_balance, v_quota FROM public.user_credits WHERE user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Credit account missing'; END IF;
  UPDATE public.user_credits SET monthly_quota = monthly_quota + 5 WHERE user_id = v_user;
  v_result := public.publish_cofounder_listing_v2_metered_legacy(p_listing, p_idempotency_key);
  UPDATE public.user_credits SET balance = v_balance, monthly_quota = v_quota, updated_at = now() WHERE user_id = v_user;
  DELETE FROM public.credit_transactions WHERE user_id = v_user AND feature = 'COFOUNDER_POST'
    AND metadata->>'idempotencyKey' = p_idempotency_key;
  INSERT INTO public.social_action_idempotency(user_id, action_key, idempotency_key, result)
  VALUES (v_user, 'cofounder_publish', p_idempotency_key, v_result);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.renew_cofounder_listing_v2(p_listing_id UUID, p_idempotency_key TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_user uuid := auth.uid(); v_balance integer; v_quota integer; v_result jsonb;
BEGIN
  SELECT result INTO v_result FROM public.social_action_idempotency
  WHERE user_id = v_user AND action_key = 'cofounder_renew' AND idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN v_result; END IF;
  SELECT balance, monthly_quota INTO v_balance, v_quota FROM public.user_credits WHERE user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Credit account missing'; END IF;
  UPDATE public.user_credits SET monthly_quota = monthly_quota + 5 WHERE user_id = v_user;
  v_result := public.renew_cofounder_listing_v2_metered_legacy(p_listing_id, p_idempotency_key);
  UPDATE public.user_credits SET balance = v_balance, monthly_quota = v_quota, updated_at = now() WHERE user_id = v_user;
  DELETE FROM public.credit_transactions WHERE user_id = v_user AND feature = 'COFOUNDER_POST'
    AND metadata->>'idempotencyKey' = p_idempotency_key;
  INSERT INTO public.social_action_idempotency(user_id, action_key, idempotency_key, result)
  VALUES (v_user, 'cofounder_renew', p_idempotency_key, v_result);
  RETURN v_result;
END;
$$;

-- Legacy direct inserts retain validation and shaping without charging.
CREATE OR REPLACE FUNCTION public.enforce_cofounder_post_credit_charge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('app.cofounder_marketplace_rpc', true) = '1' THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only create a co-founder post for your own account.' USING ERRCODE = '42501';
  END IF;
  IF char_length(NEW.project_name) > 100 OR char_length(NEW.project_description) > 1200
     OR concat_ws(' ', NEW.project_name, NEW.project_description, NEW.additional_info) ~* '(<script|javascript:|data:text/html)' THEN
    RAISE EXCEPTION 'Listing content is invalid';
  END IF;
  NEW.status := 'active';
  NEW.listing_type := COALESCE(NULLIF(NEW.listing_type, ''), 'building');
  NEW.headline := COALESCE(NULLIF(NEW.headline, ''), NEW.project_name);
  NEW.summary := COALESCE(NULLIF(NEW.summary, ''), NEW.project_description);
  NEW.startup_name := COALESCE(NULLIF(NEW.startup_name, ''), NEW.project_name);
  NEW.industries := CASE WHEN cardinality(NEW.industries) > 0 THEN NEW.industries WHEN NULLIF(NEW.industry, '') IS NOT NULL THEN ARRAY[NEW.industry] ELSE '{}'::text[] END;
  NEW.skills_sought := CASE WHEN cardinality(NEW.skills_sought) > 0 THEN NEW.skills_sought ELSE NEW.looking_for END;
  NEW.published_at := now(); NEW.expires_at := now() + interval '30 days'; NEW.last_active_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.create_discovery_call_request_v2(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_discovery_call_instant_booking_v4(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_discovery_call_request_v2(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_discovery_call_instant_booking_v4(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_cofounder_listing_v2(JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.renew_cofounder_listing_v2(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.publish_cofounder_listing_v2(JSONB, TEXT) IS 'Publishes one active co-founder listing without deducting credits; historical charges are unchanged.';
COMMENT ON FUNCTION public.renew_cofounder_listing_v2(UUID, TEXT) IS 'Renews a co-founder listing without deducting credits; historical charges are unchanged.';
