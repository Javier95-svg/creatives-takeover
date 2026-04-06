-- Billing-anchor backend work
-- Persist monthly anchor windows and make usage counters resolve from the user's
-- anchored billing cadence instead of UTC calendar months.

ALTER TABLE public.user_credits
ADD COLUMN IF NOT EXISTS billing_anchor_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

ALTER TABLE public.subscribers
ADD COLUMN IF NOT EXISTS billing_anchor_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

COMMENT ON COLUMN public.user_monthly_quotas.month IS
'Anchored billing-period start date. Older rows may still reflect UTC calendar-month starts.';

CREATE OR REPLACE FUNCTION public.add_months_clamped_utc(
  p_anchor_at TIMESTAMPTZ,
  p_months INTEGER
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anchor_utc TIMESTAMP;
  v_target_year INTEGER;
  v_target_month INTEGER;
  v_target_day INTEGER;
  v_last_day INTEGER;
BEGIN
  v_anchor_utc := date_trunc('day', timezone('UTC', COALESCE(p_anchor_at, now())));
  v_target_year := EXTRACT(YEAR FROM v_anchor_utc)::INTEGER;
  v_target_month := EXTRACT(MONTH FROM v_anchor_utc)::INTEGER + p_months;

  WHILE v_target_month > 12 LOOP
    v_target_month := v_target_month - 12;
    v_target_year := v_target_year + 1;
  END LOOP;

  WHILE v_target_month < 1 LOOP
    v_target_month := v_target_month + 12;
    v_target_year := v_target_year - 1;
  END LOOP;

  v_last_day := EXTRACT(DAY FROM ((make_date(v_target_year, v_target_month, 1) + INTERVAL '1 month - 1 day')::DATE))::INTEGER;
  v_target_day := LEAST(EXTRACT(DAY FROM v_anchor_utc)::INTEGER, v_last_day);

  RETURN make_timestamptz(v_target_year, v_target_month, v_target_day, 0, 0, 0, 'UTC');
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_monthly_billing_window(
  p_anchor_at TIMESTAMPTZ,
  p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE(period_start TIMESTAMPTZ, period_end TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anchor_at TIMESTAMPTZ := COALESCE(p_anchor_at, p_now);
  v_offset INTEGER := 0;
BEGIN
  period_start := public.add_months_clamped_utc(v_anchor_at, v_offset);
  period_end := public.add_months_clamped_utc(v_anchor_at, v_offset + 1);

  WHILE p_now >= period_end LOOP
    v_offset := v_offset + 1;
    period_start := public.add_months_clamped_utc(v_anchor_at, v_offset);
    period_end := public.add_months_clamped_utc(v_anchor_at, v_offset + 1);
  END LOOP;

  WHILE p_now < period_start LOOP
    v_offset := v_offset - 1;
    period_start := public.add_months_clamped_utc(v_anchor_at, v_offset);
    period_end := public.add_months_clamped_utc(v_anchor_at, v_offset + 1);
  END LOOP;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_billing_period(
  p_user_id UUID,
  p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE(
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  period_start_date DATE,
  billing_anchor_at TIMESTAMPTZ,
  subscription_tier TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing_anchor_at TIMESTAMPTZ;
  v_subscription_tier TEXT;
  v_profile_created_at TIMESTAMPTZ;
BEGIN
  SELECT
    uc.billing_anchor_at,
    COALESCE(NULLIF(TRIM(uc.subscription_tier), ''), NULLIF(TRIM(s.subscription_tier), ''), 'rookie'),
    p.created_at
  INTO
    v_billing_anchor_at,
    v_subscription_tier,
    v_profile_created_at
  FROM public.profiles p
  LEFT JOIN public.user_credits uc ON uc.user_id = p.id
  LEFT JOIN public.subscribers s ON s.user_id = p.id
  WHERE p.id = p_user_id;

  IF v_billing_anchor_at IS NULL THEN
    SELECT COALESCE(uc.last_reset_at, uc.last_credit_grant, uc.created_at, v_profile_created_at, p_now)
    INTO v_billing_anchor_at
    FROM public.user_credits uc
    WHERE uc.user_id = p_user_id;
  END IF;

  IF v_billing_anchor_at IS NULL THEN
    v_billing_anchor_at := COALESCE(v_profile_created_at, p_now);
  END IF;

  SELECT win.period_start, win.period_end
  INTO period_start, period_end
  FROM public.compute_monthly_billing_window(v_billing_anchor_at, p_now) win;

  billing_anchor_at := v_billing_anchor_at;
  subscription_tier := LOWER(TRIM(COALESCE(v_subscription_tier, 'rookie')));
  period_start_date := period_start::DATE;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_billing_period_start(p_user_id UUID)
RETURNS DATE
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT period_start_date
  FROM public.get_user_billing_period(p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.ensure_user_credit_billing_window()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_window RECORD;
BEGIN
  NEW.billing_anchor_at := COALESCE(NEW.billing_anchor_at, NEW.current_period_start, NEW.last_reset_at, NEW.last_credit_grant, NEW.created_at, now());

  IF NEW.current_period_start IS NULL OR NEW.current_period_end IS NULL THEN
    SELECT period_start, period_end
    INTO v_window
    FROM public.compute_monthly_billing_window(NEW.billing_anchor_at, COALESCE(NEW.last_reset_at, NEW.created_at, now()));

    NEW.current_period_start := COALESCE(NEW.current_period_start, v_window.period_start);
    NEW.current_period_end := COALESCE(NEW.current_period_end, v_window.period_end);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_credits_billing_window_defaults ON public.user_credits;
CREATE TRIGGER trg_user_credits_billing_window_defaults
  BEFORE INSERT OR UPDATE OF billing_anchor_at, current_period_start, current_period_end, last_reset_at, last_credit_grant
  ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_user_credit_billing_window();

CREATE OR REPLACE FUNCTION public.ensure_subscriber_billing_window()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_window RECORD;
BEGIN
  NEW.billing_anchor_at := COALESCE(NEW.billing_anchor_at, NEW.current_period_start, now());

  IF NEW.current_period_start IS NULL OR NEW.current_period_end IS NULL THEN
    SELECT period_start, period_end
    INTO v_window
    FROM public.compute_monthly_billing_window(NEW.billing_anchor_at);

    NEW.current_period_start := COALESCE(NEW.current_period_start, v_window.period_start);
    NEW.current_period_end := COALESCE(NEW.current_period_end, v_window.period_end);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscribers_billing_window_defaults ON public.subscribers;
CREATE TRIGGER trg_subscribers_billing_window_defaults
  BEFORE INSERT OR UPDATE OF billing_anchor_at, current_period_start, current_period_end
  ON public.subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_subscriber_billing_window();

WITH anchored_credit_rows AS (
  SELECT
    uc.user_id,
    COALESCE(uc.billing_anchor_at, uc.last_reset_at, uc.last_credit_grant, uc.created_at, p.created_at, now()) AS anchor_at
  FROM public.user_credits uc
  LEFT JOIN public.profiles p ON p.id = uc.user_id
), computed_credit_windows AS (
  SELECT
    acr.user_id,
    acr.anchor_at,
    win.period_start,
    win.period_end
  FROM anchored_credit_rows acr
  CROSS JOIN LATERAL public.compute_monthly_billing_window(acr.anchor_at) win
)
UPDATE public.user_credits uc
SET
  billing_anchor_at = ccw.anchor_at,
  current_period_start = ccw.period_start,
  current_period_end = ccw.period_end
FROM computed_credit_windows ccw
WHERE uc.user_id = ccw.user_id
  AND (
    uc.billing_anchor_at IS DISTINCT FROM ccw.anchor_at OR
    uc.current_period_start IS DISTINCT FROM ccw.period_start OR
    uc.current_period_end IS DISTINCT FROM ccw.period_end
  );

UPDATE public.subscribers s
SET
  billing_anchor_at = COALESCE(s.billing_anchor_at, uc.billing_anchor_at, now()),
  current_period_start = COALESCE(s.current_period_start, uc.current_period_start),
  current_period_end = COALESCE(s.current_period_end, uc.current_period_end)
FROM public.user_credits uc
WHERE uc.user_id = s.user_id
  AND (
    s.billing_anchor_at IS NULL OR
    s.current_period_start IS NULL OR
    s.current_period_end IS NULL
  );

CREATE OR REPLACE FUNCTION public.get_monthly_vc_view_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.vc_views views
  CROSS JOIN public.get_user_billing_period(p_user_id) period
  WHERE views.user_id = p_user_id
    AND views.viewed_at >= period.period_start
    AND views.viewed_at < period.period_end;
$$;

CREATE OR REPLACE FUNCTION public.get_monthly_accelerator_view_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.accelerator_views views
  CROSS JOIN public.get_user_billing_period(p_user_id) period
  WHERE views.user_id = p_user_id
    AND views.viewed_at >= period.period_start
    AND views.viewed_at < period.period_end;
$$;

CREATE OR REPLACE FUNCTION public.check_and_increment_usage(
  p_user_id UUID,
  p_feature_name TEXT,
  p_increment_by INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_tier_name TEXT;
  v_usage_limits JSONB;
  v_current_usage INTEGER;
  v_limit INTEGER;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
BEGIN
  SELECT subscription_tier INTO v_tier_name
  FROM public.user_credits
  WHERE user_id = p_user_id;

  IF v_tier_name IS NULL THEN
    v_tier_name := 'rookie';
  END IF;

  SELECT usage_limits INTO v_usage_limits
  FROM public.subscription_tiers
  WHERE tier_name = v_tier_name;

  v_limit := COALESCE((v_usage_limits->>p_feature_name)::INTEGER, 0);

  IF v_limit = -1 THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'current_usage', 0,
      'limit', -1,
      'remaining', -1
    );
  END IF;

  SELECT period_start, period_end
  INTO v_period_start, v_period_end
  FROM public.get_user_billing_period(p_user_id);

  INSERT INTO public.feature_usage (user_id, feature_name, usage_count, period_start, period_end)
  VALUES (p_user_id, p_feature_name, 0, v_period_start, v_period_end)
  ON CONFLICT (user_id, feature_name, period_start)
  DO UPDATE SET updated_at = now(), period_end = EXCLUDED.period_end
  RETURNING usage_count INTO v_current_usage;

  IF v_current_usage IS NULL THEN
    SELECT usage_count INTO v_current_usage
    FROM public.feature_usage
    WHERE user_id = p_user_id
      AND feature_name = p_feature_name
      AND period_start = v_period_start;
  END IF;

  IF (v_current_usage + p_increment_by) > v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current_usage', v_current_usage,
      'limit', v_limit,
      'remaining', GREATEST(0, v_limit - v_current_usage),
      'message', format('Usage limit exceeded. You have used %s of %s %s this billing period.',
        v_current_usage, v_limit, p_feature_name)
    );
  END IF;

  UPDATE public.feature_usage
  SET usage_count = usage_count + p_increment_by,
      updated_at = now(),
      period_end = v_period_end
  WHERE user_id = p_user_id
    AND feature_name = p_feature_name
    AND period_start = v_period_start;

  RETURN jsonb_build_object(
    'allowed', true,
    'current_usage', v_current_usage + p_increment_by,
    'limit', v_limit,
    'remaining', GREATEST(0, v_limit - (v_current_usage + p_increment_by))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_feature_usage(
  p_user_id UUID,
  p_feature_name TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_tier_name TEXT;
  v_usage_limits JSONB;
  v_current_usage INTEGER;
  v_limit INTEGER;
  v_period_start TIMESTAMPTZ;
BEGIN
  SELECT subscription_tier INTO v_tier_name
  FROM public.user_credits
  WHERE user_id = p_user_id;

  IF v_tier_name IS NULL THEN
    v_tier_name := 'rookie';
  END IF;

  SELECT usage_limits INTO v_usage_limits
  FROM public.subscription_tiers
  WHERE tier_name = v_tier_name;

  v_limit := COALESCE((v_usage_limits->>p_feature_name)::INTEGER, 0);

  IF v_limit = -1 THEN
    RETURN jsonb_build_object(
      'current_usage', 0,
      'limit', -1,
      'remaining', -1,
      'unlimited', true
    );
  END IF;

  SELECT period_start
  INTO v_period_start
  FROM public.get_user_billing_period(p_user_id);

  SELECT COALESCE(usage_count, 0) INTO v_current_usage
  FROM public.feature_usage
  WHERE user_id = p_user_id
    AND feature_name = p_feature_name
    AND period_start = v_period_start;

  IF v_current_usage IS NULL THEN
    v_current_usage := 0;
  END IF;

  RETURN jsonb_build_object(
    'current_usage', v_current_usage,
    'limit', v_limit,
    'remaining', GREATEST(0, v_limit - v_current_usage),
    'unlimited', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.add_months_clamped_utc(TIMESTAMPTZ, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_monthly_billing_window(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_billing_period(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_billing_period_start(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_vc_view_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_accelerator_view_count(UUID) TO authenticated;