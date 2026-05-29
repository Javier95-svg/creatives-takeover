-- Align monthly plan credit replenishment with MVP Builder Phase 1.

UPDATE public.subscription_tiers
SET monthly_credits = CASE tier_name
  WHEN 'rookie' THEN 10
  WHEN 'starter' THEN 30
  WHEN 'rising' THEN 75
  WHEN 'pro' THEN 150
  ELSE monthly_credits
END
WHERE tier_name IN ('rookie', 'starter', 'rising', 'pro');

UPDATE public.user_credits
SET monthly_quota = CASE subscription_tier
  WHEN 'rookie' THEN LEAST(monthly_quota, 10)
  WHEN 'starter' THEN LEAST(monthly_quota, 30)
  WHEN 'rising' THEN LEAST(monthly_quota, 75)
  WHEN 'pro' THEN LEAST(monthly_quota, 150)
  ELSE monthly_quota
END
WHERE subscription_tier IN ('rookie', 'starter', 'rising', 'pro');
