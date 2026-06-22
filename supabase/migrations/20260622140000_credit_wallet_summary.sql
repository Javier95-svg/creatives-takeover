-- Credit wallet summary for the navbar Credit Balance dropdown.
--
-- Returns, for the authenticated user:
--   * top_up_credits  — lifetime credits purchased through the Quick Top Ups
--                       packs (platform wallet, feature = 'Credit Pack':
--                       Starter +20 / Boost +40 / Power +60).
--   * credits_spent   — net credits spent (deduct minus refund) since the
--                       current billing period start. Auto-resets to 0 each
--                       period because the period start advances every month.
--   * period_start    — start of the current billing period (the plan's
--                       monthly anchor day).
--   * period_end      — start of the next billing period (when the spent
--                       counter rolls back to 0).
--
-- Billing anchor / "31st" handling: the anchor day is clamped to the length of
-- each month, so a plan started on the 31st rolls over on the 30th in 30-day
-- months (28th/29th in February), then back to the 31st in 31-day months. This
-- mirrors _shared/billing-period.ts (addUtcMonthsClamped) used by the Stripe
-- webhook, so the on-screen counter and the actual monthly grant stay aligned.

CREATE OR REPLACE FUNCTION public.get_credit_wallet_summary()
RETURNS TABLE (
  top_up_credits integer,
  credits_spent integer,
  period_start timestamptz,
  period_end timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_anchor timestamptz;
  v_anchor_day int;
  v_now date := (now() AT TIME ZONE 'UTC')::date;
  v_this_month date;
  v_period_start date;
  v_period_end date;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Anchor = the plan's start date. Prefer the billing anchor, then the stored
  -- period start, then the last reset / account creation date as a fallback.
  SELECT COALESCE(uc.billing_anchor_at, uc.current_period_start, uc.last_reset_at, uc.created_at)
    INTO v_anchor
  FROM public.user_credits uc
  WHERE uc.user_id = v_user;

  IF v_anchor IS NULL THEN
    v_anchor := now();
  END IF;

  v_anchor_day := EXTRACT(day FROM v_anchor)::int;

  -- Clamp the anchor day into the current month (handles the 31st -> 30th case).
  v_this_month := make_date(
    EXTRACT(year FROM v_now)::int,
    EXTRACT(month FROM v_now)::int,
    LEAST(v_anchor_day, EXTRACT(day FROM (date_trunc('month', v_now::timestamp) + interval '1 month - 1 day'))::int)
  );

  IF v_now >= v_this_month THEN
    v_period_start := v_this_month;
  ELSE
    -- We are before this month's anchor day, so the active period began last month.
    v_period_start := make_date(
      EXTRACT(year FROM (v_now - interval '1 month'))::int,
      EXTRACT(month FROM (v_now - interval '1 month'))::int,
      LEAST(v_anchor_day, EXTRACT(day FROM (date_trunc('month', v_now::timestamp - interval '1 month') + interval '1 month - 1 day'))::int)
    );
  END IF;

  -- Next period start = clamped anchor day in the month after period_start.
  v_period_end := make_date(
    EXTRACT(year FROM (v_period_start + interval '1 month'))::int,
    EXTRACT(month FROM (v_period_start + interval '1 month'))::int,
    LEAST(v_anchor_day, EXTRACT(day FROM (date_trunc('month', v_period_start::timestamp + interval '1 month') + interval '1 month - 1 day'))::int)
  );

  RETURN QUERY
  SELECT
    COALESCE((
      SELECT SUM(ct.amount)
      FROM public.credit_transactions ct
      WHERE ct.user_id = v_user
        AND ct.tx_type = 'purchase'
        AND ct.feature = 'Credit Pack'
    ), 0)::integer AS top_up_credits,
    GREATEST(COALESCE((
      SELECT SUM(
               CASE
                 WHEN ct.tx_type = 'deduct' THEN ABS(ct.amount)   -- deductions stored negative
                 WHEN ct.tx_type = 'refund' THEN -ABS(ct.amount)  -- refunds give credits back
                 ELSE 0
               END)
      FROM public.credit_transactions ct
      WHERE ct.user_id = v_user
        AND ct.tx_type IN ('deduct', 'refund')
        AND ct.created_at >= v_period_start::timestamptz
    ), 0), 0)::integer AS credits_spent,
    v_period_start::timestamptz AS period_start,
    v_period_end::timestamptz AS period_end;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_credit_wallet_summary() TO authenticated;
