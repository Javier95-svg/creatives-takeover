-- Backend quota and credit enforcement unification
-- Move quota authority for direct inserts into Postgres and normalize tier
-- lookups so credit and quota enforcement stop trusting client-supplied plans.

CREATE OR REPLACE FUNCTION public.normalize_subscription_tier(p_tier TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(COALESCE(p_tier, 'rookie')))
    WHEN 'starter' THEN 'starter'
    WHEN 'basic' THEN 'starter'
    WHEN 'rising' THEN 'rising'
    WHEN 'creator' THEN 'rising'
    WHEN 'premium' THEN 'rising'
    WHEN 'pro' THEN 'pro'
    WHEN 'professional' THEN 'pro'
    WHEN 'elite' THEN 'pro'
    WHEN 'team' THEN 'pro'
    WHEN 'teams' THEN 'pro'
    WHEN 'enterprise' THEN 'pro'
    ELSE 'rookie'
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_normalized_subscription_tier(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.normalize_subscription_tier(
    COALESCE(
      (
        SELECT s.subscription_tier
        FROM public.subscribers s
        WHERE s.user_id = p_user_id
        ORDER BY s.subscribed DESC, s.updated_at DESC NULLS LAST
        LIMIT 1
      ),
      (
        SELECT uc.subscription_tier
        FROM public.user_credits uc
        WHERE uc.user_id = p_user_id
        LIMIT 1
      ),
      (
        SELECT p.subscription_tier
        FROM public.profiles p
        WHERE p.id = p_user_id
        LIMIT 1
      ),
      'rookie'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_feature_quota_limit(p_feature_name TEXT, p_tier TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(COALESCE(p_feature_name, '')))
    WHEN 'discovery_calls' THEN CASE public.normalize_subscription_tier(p_tier)
      WHEN 'rookie' THEN 1
      WHEN 'starter' THEN 2
      WHEN 'rising' THEN 3
      WHEN 'pro' THEN -1
      ELSE 0
    END
    WHEN 'cofounder_posts' THEN CASE public.normalize_subscription_tier(p_tier)
      WHEN 'rookie' THEN 1
      WHEN 'starter' THEN 2
      WHEN 'rising' THEN -1
      WHEN 'pro' THEN -1
      ELSE 0
    END
    WHEN 'vc_search_profile' THEN CASE public.normalize_subscription_tier(p_tier)
      WHEN 'rookie' THEN 0
      WHEN 'starter' THEN 2
      WHEN 'rising' THEN 5
      WHEN 'pro' THEN -1
      ELSE 0
    END
    WHEN 'accelerator_profile' THEN CASE public.normalize_subscription_tier(p_tier)
      WHEN 'rookie' THEN 0
      WHEN 'starter' THEN 2
      WHEN 'rising' THEN 5
      WHEN 'pro' THEN -1
      ELSE 0
    END
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_quota_upgrade_target(p_feature_name TEXT, p_tier TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(COALESCE(p_feature_name, '')))
    WHEN 'discovery_calls' THEN CASE public.normalize_subscription_tier(p_tier)
      WHEN 'rookie' THEN 'starter'
      WHEN 'starter' THEN 'rising'
      WHEN 'rising' THEN 'pro'
      ELSE NULL
    END
    WHEN 'cofounder_posts' THEN CASE public.normalize_subscription_tier(p_tier)
      WHEN 'rookie' THEN 'starter'
      WHEN 'starter' THEN 'rising'
      ELSE NULL
    END
    WHEN 'vc_search_profile' THEN CASE public.normalize_subscription_tier(p_tier)
      WHEN 'rookie' THEN 'starter'
      WHEN 'starter' THEN 'rising'
      WHEN 'rising' THEN 'pro'
      ELSE NULL
    END
    WHEN 'accelerator_profile' THEN CASE public.normalize_subscription_tier(p_tier)
      WHEN 'rookie' THEN 'starter'
      WHEN 'starter' THEN 'rising'
      WHEN 'rising' THEN 'pro'
      ELSE NULL
    END
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_feature_usage_count(p_user_id UUID, p_feature_name TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_feature_name TEXT := lower(trim(COALESCE(p_feature_name, '')));
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_period_date DATE;
  v_count INTEGER := 0;
BEGIN
  SELECT period_start, period_end, period_start_date
  INTO v_period_start, v_period_end, v_period_date
  FROM public.get_user_billing_period(p_user_id);

  CASE v_feature_name
    WHEN 'discovery_calls' THEN
      SELECT COALESCE(q.discovery_calls_used, 0)
      INTO v_count
      FROM public.user_monthly_quotas q
      WHERE q.user_id = p_user_id
        AND q.month = v_period_date;
    WHEN 'cofounder_posts' THEN
      SELECT COUNT(*)::INTEGER
      INTO v_count
      FROM public.cofounder_posts posts
      WHERE posts.user_id = p_user_id
        AND posts.created_at >= v_period_start
        AND posts.created_at < v_period_end;
    WHEN 'vc_search_profile' THEN
      SELECT COUNT(*)::INTEGER
      INTO v_count
      FROM public.vc_views views
      WHERE views.user_id = p_user_id
        AND views.viewed_at >= v_period_start
        AND views.viewed_at < v_period_end;
    WHEN 'accelerator_profile' THEN
      SELECT COUNT(*)::INTEGER
      INTO v_count
      FROM public.accelerator_views views
      WHERE views.user_id = p_user_id
        AND views.viewed_at >= v_period_start
        AND views.viewed_at < v_period_end;
    ELSE
      v_count := 0;
  END CASE;

  RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_monthly_feature_quota(
  p_user_id UUID,
  p_feature_name TEXT,
  p_increment_by INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_feature_name TEXT := lower(trim(COALESCE(p_feature_name, '')));
  v_tier TEXT;
  v_limit INTEGER;
  v_upgrade_target TEXT;
  v_period_date DATE;
  v_current_usage INTEGER := 0;
  v_new_usage INTEGER := 0;
BEGIN
  IF p_increment_by IS NULL OR p_increment_by <= 0 THEN
    RAISE EXCEPTION 'p_increment_by must be a positive integer';
  END IF;

  IF v_feature_name <> 'discovery_calls' THEN
    RAISE EXCEPTION 'Unsupported quota feature: %', p_feature_name;
  END IF;

  v_tier := public.get_user_normalized_subscription_tier(p_user_id);
  v_limit := public.get_feature_quota_limit(v_feature_name, v_tier);
  v_upgrade_target := public.get_quota_upgrade_target(v_feature_name, v_tier);
  v_period_date := public.get_current_billing_period_start(p_user_id);

  INSERT INTO public.user_monthly_quotas (user_id, month)
  VALUES (p_user_id, v_period_date)
  ON CONFLICT (user_id, month) DO NOTHING;

  SELECT q.discovery_calls_used
  INTO v_current_usage
  FROM public.user_monthly_quotas q
  WHERE q.user_id = p_user_id
    AND q.month = v_period_date
  FOR UPDATE;

  v_current_usage := COALESCE(v_current_usage, 0);

  IF COALESCE(v_limit, 0) = 0 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current_usage', v_current_usage,
      'limit', 0,
      'remaining', 0,
      'required_tier', v_upgrade_target,
      'error_code', 'PLAN_UPGRADE_REQUIRED',
      'message', 'Discovery calls are not available on your current plan.'
    );
  END IF;

  IF v_limit <> -1 AND (v_current_usage + p_increment_by) > v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current_usage', v_current_usage,
      'limit', v_limit,
      'remaining', GREATEST(0, v_limit - v_current_usage),
      'required_tier', v_upgrade_target,
      'error_code', 'QUOTA_LIMIT_REACHED',
      'message', format('You have used all %s discovery call%s for this billing cycle.', v_limit, CASE WHEN v_limit = 1 THEN '' ELSE 's' END)
    );
  END IF;

  UPDATE public.user_monthly_quotas
  SET discovery_calls_used = discovery_calls_used + p_increment_by,
      updated_at = now()
  WHERE user_id = p_user_id
    AND month = v_period_date
  RETURNING discovery_calls_used INTO v_new_usage;

  RETURN jsonb_build_object(
    'allowed', true,
    'current_usage', COALESCE(v_new_usage, v_current_usage + p_increment_by),
    'limit', v_limit,
    'remaining', CASE
      WHEN v_limit = -1 THEN -1
      ELSE GREATEST(0, v_limit - COALESCE(v_new_usage, v_current_usage + p_increment_by))
    END,
    'required_tier', v_upgrade_target,
    'period_start', v_period_date
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_feature_quota_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_feature_name TEXT := COALESCE(TG_ARGV[0], '');
  v_tier TEXT;
  v_limit INTEGER;
  v_usage INTEGER;
  v_upgrade_target TEXT;
BEGIN
  v_tier := public.get_user_normalized_subscription_tier(NEW.user_id);
  v_limit := public.get_feature_quota_limit(v_feature_name, v_tier);
  v_upgrade_target := public.get_quota_upgrade_target(v_feature_name, v_tier);

  IF v_limit IS NULL OR v_limit = -1 THEN
    RETURN NEW;
  END IF;

  IF v_limit = 0 THEN
    RAISE EXCEPTION 'PLAN_UPGRADE_REQUIRED:%', COALESCE(v_upgrade_target, '')
      USING ERRCODE = 'P0001';
  END IF;

  v_usage := public.get_feature_usage_count(NEW.user_id, v_feature_name);

  IF v_usage >= v_limit THEN
    RAISE EXCEPTION 'QUOTA_LIMIT_REACHED:%:%', v_limit, COALESCE(v_upgrade_target, '')
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_vc(p_user_id UUID, p_tier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_limit INTEGER;
  v_usage INTEGER;
BEGIN
  v_tier := public.get_user_normalized_subscription_tier(p_user_id);
  v_limit := public.get_feature_quota_limit('vc_search_profile', v_tier);
  v_usage := public.get_feature_usage_count(p_user_id, 'vc_search_profile');
  RETURN v_limit = -1 OR v_usage < COALESCE(v_limit, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_accelerator(p_user_id UUID, p_tier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_limit INTEGER;
  v_usage INTEGER;
BEGIN
  v_tier := public.get_user_normalized_subscription_tier(p_user_id);
  v_limit := public.get_feature_quota_limit('accelerator_profile', v_tier);
  v_usage := public.get_feature_usage_count(p_user_id, 'accelerator_profile');
  RETURN v_limit = -1 OR v_usage < COALESCE(v_limit, 0);
END;
$$;

DROP TRIGGER IF EXISTS trg_vc_views_quota_guard ON public.vc_views;
CREATE TRIGGER trg_vc_views_quota_guard
  BEFORE INSERT ON public.vc_views
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_feature_quota_on_insert('vc_search_profile');

DROP TRIGGER IF EXISTS trg_accelerator_views_quota_guard ON public.accelerator_views;
CREATE TRIGGER trg_accelerator_views_quota_guard
  BEFORE INSERT ON public.accelerator_views
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_feature_quota_on_insert('accelerator_profile');

DROP TRIGGER IF EXISTS trg_cofounder_posts_quota_guard ON public.cofounder_posts;
CREATE TRIGGER trg_cofounder_posts_quota_guard
  BEFORE INSERT ON public.cofounder_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_feature_quota_on_insert('cofounder_posts');

GRANT EXECUTE ON FUNCTION public.normalize_subscription_tier(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_normalized_subscription_tier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feature_quota_limit(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quota_upgrade_target(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feature_usage_count(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_monthly_feature_quota(UUID, TEXT, INTEGER) TO authenticated;