-- Starter now includes five monthly VC Search views and five monthly
-- Accelerator Hunt views. Keep the server-side quota gate aligned with the
-- client entitlement catalog and pricing copy.

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
      WHEN 'starter' THEN 5
      WHEN 'rising' THEN 10
      WHEN 'pro' THEN -1
      ELSE 0
    END
    WHEN 'accelerator_profile' THEN CASE public.normalize_subscription_tier(p_tier)
      WHEN 'rookie' THEN 0
      WHEN 'starter' THEN 5
      WHEN 'rising' THEN 10
      WHEN 'pro' THEN -1
      ELSE 0
    END
    ELSE NULL
  END;
$$;

-- Keep the stored Starter plan metadata truthful for subscription surfaces
-- that read it instead of the TypeScript entitlement catalog.
UPDATE public.subscription_tiers
SET features = (
  SELECT jsonb_agg(to_jsonb(
    CASE value
      WHEN '2 VC profile views per billing cycle' THEN '5 VC Search profile views per billing cycle'
      WHEN '2 Accelerator profile views per billing cycle' THEN '5 Accelerator Hunt profile views per billing cycle'
      ELSE value
    END
  )) FILTER (WHERE value <> 'Email Templates full access')
  FROM jsonb_array_elements_text(features) AS feature(value)
)
WHERE tier_name = 'starter';
