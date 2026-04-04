-- Align investor-view quota windows with the pricing access-control policy.
-- Quotas reset on the first day of each UTC calendar month.

CREATE OR REPLACE FUNCTION public.get_current_utc_month_start()
RETURNS date AS $$
  SELECT date_trunc('month', timezone('UTC', now()))::date;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_monthly_vc_view_count(p_user_id uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM public.vc_views
  WHERE user_id = p_user_id
    AND viewed_at::date >= public.get_current_utc_month_start();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_view_vc(p_user_id uuid, p_tier text)
RETURNS boolean AS $$
DECLARE
  view_count integer;
  normalized_tier text;
  tier_limit integer;
BEGIN
  view_count := public.get_monthly_vc_view_count(p_user_id);
  normalized_tier := lower(trim(COALESCE(p_tier, 'rookie')));

  tier_limit := CASE normalized_tier
    WHEN 'free' THEN 0
    WHEN 'rookie' THEN 0
    WHEN 'starter' THEN 2
    WHEN 'creator' THEN 5
    WHEN 'rising' THEN 5
    WHEN 'professional' THEN -1
    WHEN 'pro' THEN -1
    ELSE 0
  END;

  RETURN tier_limit = -1 OR view_count < tier_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_monthly_accelerator_view_count(p_user_id uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM public.accelerator_views
  WHERE user_id = p_user_id
    AND viewed_at::date >= public.get_current_utc_month_start();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_view_accelerator(p_user_id uuid, p_tier text)
RETURNS boolean AS $$
DECLARE
  view_count integer;
  normalized_tier text;
  tier_limit integer;
BEGIN
  view_count := public.get_monthly_accelerator_view_count(p_user_id);
  normalized_tier := lower(trim(COALESCE(p_tier, 'rookie')));

  tier_limit := CASE normalized_tier
    WHEN 'free' THEN 0
    WHEN 'rookie' THEN 0
    WHEN 'starter' THEN 2
    WHEN 'creator' THEN 5
    WHEN 'rising' THEN 5
    WHEN 'professional' THEN -1
    WHEN 'pro' THEN -1
    ELSE 0
  END;

  RETURN tier_limit = -1 OR view_count < tier_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_current_utc_month_start() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_vc_view_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_vc(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_accelerator_view_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_accelerator(uuid, text) TO authenticated;
