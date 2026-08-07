-- stripe-webhook calls public.downgrade_stripe_subscription_to_rookie() on
-- customer.subscription.deleted, but the function was never present in the live
-- database: it is defined only in 20260514090000_add_stripe_price_ids.sql, which
-- is absent from supabase_migrations.schema_migrations (never applied).
--
-- Effect before this migration: every cancellation threw inside the webhook,
-- returned 400, and Stripe retried until it gave up. The cancelled customer kept
-- their paid tier, quota and feature access indefinitely. A happy-path test
-- purchase never surfaces this, because the failure only occurs at churn.
--
-- This migration deliberately restores ONLY the downgrade function. Applying
-- 20260514090000 wholesale would also overwrite apply_stripe_subscription_checkout
-- with its legacy version, which resolves tiers via the deprecated single
-- `stripe_price_id` column instead of the stripe_price_id_monthly /
-- stripe_price_id_yearly columns that 20260805101000_canonical_subscription_fulfillment
-- installed and that create-checkout + stripe-webhook now depend on.

CREATE OR REPLACE FUNCTION public.downgrade_stripe_subscription_to_rookie(
  p_user_id UUID DEFAULT NULL,
  p_stripe_customer_id TEXT DEFAULT NULL,
  p_stripe_subscription_id TEXT DEFAULT NULL,
  p_stripe_event_id TEXT DEFAULT NULL,
  p_stripe_event_type TEXT DEFAULT 'customer.subscription.deleted'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := p_user_id;
  v_rookie_credits INTEGER;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF v_user_id IS NULL AND NULLIF(btrim(COALESCE(p_stripe_customer_id, '')), '') IS NOT NULL THEN
    SELECT s.user_id
      INTO v_user_id
      FROM public.subscribers s
     WHERE s.stripe_customer_id = p_stripe_customer_id
     ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
     LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'no_user',
      'stripe_customer_id', p_stripe_customer_id,
      'stripe_subscription_id', p_stripe_subscription_id
    );
  END IF;

  -- Rookie allocation is sourced from subscription_tiers so it stays in step with
  -- PLAN_MONTHLY_CREDITS (rookie = 50). The literal is only a last-resort default.
  SELECT st.monthly_credits
    INTO v_rookie_credits
    FROM public.subscription_tiers st
   WHERE st.tier_name = 'rookie'
   LIMIT 1;

  v_rookie_credits := COALESCE(v_rookie_credits, 50);

  UPDATE public.profiles
     SET subscription_tier = 'rookie'
   WHERE id = v_user_id;

  -- Quota drops to the free allocation; `balance` is intentionally untouched so
  -- purchased top-up credits survive cancellation.
  UPDATE public.user_credits
     SET subscription_tier = 'rookie',
         monthly_quota = v_rookie_credits
   WHERE user_id = v_user_id;

  UPDATE public.subscribers
     SET subscribed = false,
         subscription_tier = 'rookie',
         subscription_end = NULL,
         stripe_customer_id = NULL,
         current_period_start = v_now,
         current_period_end = v_now + interval '1 month',
         updated_at = v_now
   WHERE user_id = v_user_id
      OR (
        NULLIF(btrim(COALESCE(p_stripe_customer_id, '')), '') IS NOT NULL
        AND stripe_customer_id = p_stripe_customer_id
      );

  RETURN jsonb_build_object(
    'status', 'downgraded',
    'user_id', v_user_id,
    'tier', 'rookie',
    'monthly_credits', v_rookie_credits,
    'stripe_event_id', p_stripe_event_id,
    'stripe_event_type', p_stripe_event_type
  );
END;
$$;

REVOKE ALL ON FUNCTION public.downgrade_stripe_subscription_to_rookie(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.downgrade_stripe_subscription_to_rookie(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;
