-- Reliable monthly credit refresh for Rookie (free) accounts.
--
-- New accounts get 50 credits and an anniversary billing window
-- (current_period_start/end via ensure_user_credit_billing_window). But nothing
-- actually re-granted the monthly allowance: the old reset_monthly_credits()
-- targets legacy tier names / columns and no cron runs it, and the client-side
-- grant_monthly_credits() is env-flag gated and uses calendar-month (not
-- anniversary) logic. So a Rookie who opened on the 6th would not reliably get a
-- fresh 50 on the 6th of the next month.
--
-- This adds a server-side, anniversary-accurate refresh run daily by cron:
-- whenever a Rookie's current period has elapsed, set monthly_quota back to the
-- Rookie allowance (50), roll the billing window forward from their anchor, and
-- log a grant transaction. Paid subscribers are skipped (their credits are
-- managed by their subscription).

CREATE OR REPLACE FUNCTION public.grant_due_rookie_monthly_credits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier_credits integer;
  v_count integer := 0;
  r record;
  w record;
BEGIN
  SELECT COALESCE(monthly_credits, 50) INTO v_tier_credits
  FROM public.subscription_tiers WHERE tier_name = 'rookie';
  v_tier_credits := COALESCE(v_tier_credits, 50);

  FOR r IN
    SELECT uc.user_id, uc.billing_anchor_at
    FROM public.user_credits uc
    LEFT JOIN public.subscribers s
      ON s.user_id = uc.user_id AND s.subscribed = true
    WHERE uc.subscription_tier = 'rookie'
      AND s.user_id IS NULL                       -- not a paying subscriber
      AND uc.current_period_end IS NOT NULL
      AND now() >= uc.current_period_end          -- anniversary period elapsed
  LOOP
    SELECT period_start, period_end INTO w
    FROM public.compute_monthly_billing_window(
      COALESCE(r.billing_anchor_at, now()), now()
    );

    UPDATE public.user_credits
    SET monthly_quota = v_tier_credits,
        last_reset_at = now(),
        last_credit_grant = now(),
        current_period_start = w.period_start,
        current_period_end = w.period_end
    WHERE user_id = r.user_id;

    INSERT INTO public.credit_transactions (
      user_id, amount, tx_type, reason, feature, metadata
    ) VALUES (
      r.user_id, v_tier_credits, 'grant',
      'Monthly Rookie credit allocation', 'Subscription - rookie',
      jsonb_build_object(
        'grantType', 'monthly_quota',
        'quotaGranted', v_tier_credits,
        'periodStart', w.period_start,
        'periodEnd', w.period_end
      )
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_due_rookie_monthly_credits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_due_rookie_monthly_credits() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'grant-rookie-monthly-credits-daily') THEN
    PERFORM cron.unschedule('grant-rookie-monthly-credits-daily');
  END IF;
END;
$$;

-- Daily at 05:00 UTC; per-user anniversary gating lives in the function.
SELECT cron.schedule(
  'grant-rookie-monthly-credits-daily',
  '0 5 * * *',
  $$SELECT public.grant_due_rookie_monthly_credits();$$
);
