-- ========================================
-- UPDATE SUBSCRIPTION TIERS PRICING
-- ========================================
-- Update pricing to new model:
-- - Creator: $32.99/month (from $19.99)
-- - Professional: $74.99/month (from $39.99)
-- - Add VC view limits to features
-- ========================================

-- Update Creator tier pricing
UPDATE subscription_tiers
SET price_cents = 3299  -- $32.99
WHERE tier_name = 'creator';

-- Update Professional tier pricing
UPDATE subscription_tiers
SET price_cents = 7499  -- $74.99
WHERE tier_name = 'professional';

-- Update features to include VC search limits
-- Free tier: 5 VC views/month
UPDATE subscription_tiers
SET features = COALESCE(features, '{}'::jsonb) || jsonb_build_object('vc_search_limit', 5)
WHERE tier_name = 'free';

-- Creator tier: 25 VC views/month
UPDATE subscription_tiers
SET features = COALESCE(features, '{}'::jsonb) || jsonb_build_object('vc_search_limit', 25)
WHERE tier_name = 'creator';

-- Professional tier: Unlimited VC views (-1)
UPDATE subscription_tiers
SET features = COALESCE(features, '{}'::jsonb) || jsonb_build_object('vc_search_limit', -1)
WHERE tier_name = 'professional';

-- Verify the changes
SELECT
  tier_name,
  price_cents,
  monthly_credits,
  features->>'vc_search_limit' as vc_limit
FROM subscription_tiers
ORDER BY price_cents;
