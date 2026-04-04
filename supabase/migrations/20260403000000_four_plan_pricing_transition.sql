-- Align billing config, stored tiers, and quota RPCs to the four-plan pricing model.
-- Canonical plans: rookie, starter, rising, pro.

ALTER TABLE public.subscription_tiers
ADD COLUMN IF NOT EXISTS stripe_payment_link TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_link_monthly TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_link_yearly TEXT;

INSERT INTO public.subscription_tiers (tier_name, monthly_credits, price_cents, features)
VALUES
  (
    'rookie',
    25,
    0,
    '[
      "25 credits per month",
      "ICP Builder included for free",
      "Insighta Test and Newspaper included",
      "1 free discovery call per billing cycle",
      "1 co-founder post per billing cycle",
      "Prompt Library: Business Case only"
    ]'::jsonb
  ),
  (
    'starter',
    50,
    900,
    '[
      "50 credits per month",
      "Waitlist Maker and PMF Lab use credits",
      "2 free discovery calls per billing cycle",
      "2 co-founder posts per billing cycle",
      "2 VC profiles and 2 accelerator profiles per billing cycle",
      "Basic email templates and 5 prompt templates"
    ]'::jsonb
  ),
  (
    'rising',
    100,
    2900,
    '[
      "100 credits per month",
      "All 7 tools accessible in any order",
      "Most BizMap tools included without per-use charges",
      "MVP Builder and GTM Strategist always consume credits",
      "3 free discovery calls per billing cycle, then 10 credits each",
      "10 VC profiles and 10 accelerator profiles per billing cycle"
    ]'::jsonb
  ),
  (
    'pro',
    300,
    6500,
    '[
      "300 credits per month",
      "Everything in Rising",
      "MVP Builder and GTM Strategist always consume credits",
      "Unlimited discovery calls",
      "Unlimited VC and accelerator profile views",
      "Angels community, group office hours, and priority support"
    ]'::jsonb
  )
ON CONFLICT (tier_name) DO UPDATE
SET
  monthly_credits = EXCLUDED.monthly_credits,
  price_cents = EXCLUDED.price_cents,
  features = EXCLUDED.features;

UPDATE public.subscription_tiers
SET
  stripe_payment_link = NULL,
  stripe_payment_link_monthly = NULL,
  stripe_payment_link_yearly = NULL
WHERE tier_name IN ('rookie', 'starter', 'rising', 'pro');

DELETE FROM public.subscription_tiers
WHERE tier_name IN ('free', 'creator', 'professional', 'basic', 'premium', 'enterprise');

CREATE OR REPLACE FUNCTION public.get_billing_cycle_start(p_user_id uuid)
RETURNS date AS $$
DECLARE
  v_cycle_start date;
BEGIN
  SELECT COALESCE(last_reset_at::date, CURRENT_DATE)
  INTO v_cycle_start
  FROM public.user_credits
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_cycle_start, CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_monthly_vc_view_count(p_user_id uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM public.vc_views
  WHERE user_id = p_user_id
    AND viewed_at::date >= public.get_billing_cycle_start(p_user_id);
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
    WHEN 'creator' THEN 10
    WHEN 'rising' THEN 10
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
    AND viewed_at::date >= public.get_billing_cycle_start(p_user_id);
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
    WHEN 'creator' THEN 10
    WHEN 'rising' THEN 10
    WHEN 'professional' THEN -1
    WHEN 'pro' THEN -1
    ELSE 0
  END;

  RETURN tier_limit = -1 OR view_count < tier_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_billing_cycle_start(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_vc_view_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_vc(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_accelerator_view_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_accelerator(uuid, text) TO authenticated;
