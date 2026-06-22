-- Anchor the navbar wallet counters to the ACCOUNT CREATION date.
--
-- "Top Up Credits" and "Credits Spent" now both count within the current
-- monthly window anchored to the day the account was created (auth.users
-- created_at). Example: account created July 8 -> windows run [..8th, next 8th);
-- on every 8th both counters reset to 0.
--
-- Changes vs the previous version (20260622140000):
--   * anchor = account creation date (was: billing anchor / period start).
--   * top_up_credits is now scoped to the current period (was: lifetime).
--
-- Day-of-month clamping is unchanged: a 31st anchor rolls over on the 30th in
-- 30-day months, 28th/29th in February.

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

  -- Anchor = the date the account was created.
  SELECT au.created_at INTO v_anchor FROM auth.users au WHERE au.id = v_user;

  IF v_anchor IS NULL THEN
    SELECT uc.created_at INTO v_anchor FROM public.user_credits uc WHERE uc.user_id = v_user;
  END IF;

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
    -- Before this month's anchor day: the active window began last month.
    v_period_start := make_date(
      EXTRACT(year FROM (v_now - interval '1 month'))::int,
      EXTRACT(month FROM (v_now - interval '1 month'))::int,
      LEAST(v_anchor_day, EXTRACT(day FROM (date_trunc('month', v_now::timestamp - interval '1 month') + interval '1 month - 1 day'))::int)
    );
  END IF;

  -- Next window start = clamped anchor day in the month after period_start.
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
        AND ct.created_at >= v_period_start::timestamptz
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
