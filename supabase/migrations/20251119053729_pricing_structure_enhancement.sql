-- Pricing Structure Enhancement Migration
-- Adds usage_limits column and creates usage tracking infrastructure

-- Add usage_limits column to subscription_tiers
ALTER TABLE public.subscription_tiers 
ADD COLUMN IF NOT EXISTS usage_limits JSONB DEFAULT '{}'::jsonb;

-- Create usage tracking table
CREATE TABLE IF NOT EXISTS public.feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()),
  period_end TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature_name, period_start)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_period ON public.feature_usage(user_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON public.feature_usage(feature_name);

-- Enable RLS
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own usage" ON public.feature_usage;
CREATE POLICY "Users can view their own usage" ON public.feature_usage
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage usage" ON public.feature_usage;
CREATE POLICY "Service role can manage usage" ON public.feature_usage
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_feature_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_feature_usage_updated_at ON public.feature_usage;
CREATE TRIGGER trg_feature_usage_updated_at
  BEFORE UPDATE ON public.feature_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_feature_usage_updated_at();

-- Function to check and increment usage
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
  v_result JSONB;
BEGIN
  -- Get user's tier
  SELECT subscription_tier INTO v_tier_name
  FROM public.user_credits
  WHERE user_id = p_user_id;

  IF v_tier_name IS NULL THEN
    v_tier_name := 'free';
  END IF;

  -- Get usage limits for tier
  SELECT usage_limits INTO v_usage_limits
  FROM public.subscription_tiers
  WHERE tier_name = v_tier_name;

  -- Get limit for this feature (-1 means unlimited)
  v_limit := COALESCE((v_usage_limits->>p_feature_name)::INTEGER, 0);

  -- If limit is -1, unlimited access
  IF v_limit = -1 THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'current_usage', 0,
      'limit', -1,
      'remaining', -1
    );
  END IF;

  -- Calculate current period
  v_period_start := date_trunc('month', now());
  v_period_end := v_period_start + interval '1 month';

  -- Get or create current usage record
  INSERT INTO public.feature_usage (user_id, feature_name, usage_count, period_start, period_end)
  VALUES (p_user_id, p_feature_name, 0, v_period_start, v_period_end)
  ON CONFLICT (user_id, feature_name, period_start)
  DO UPDATE SET updated_at = now()
  RETURNING usage_count INTO v_current_usage;

  -- If record didn't exist, get it now
  IF v_current_usage IS NULL THEN
    SELECT usage_count INTO v_current_usage
    FROM public.feature_usage
    WHERE user_id = p_user_id
      AND feature_name = p_feature_name
      AND period_start = v_period_start;
  END IF;

  -- Check if increment would exceed limit
  IF (v_current_usage + p_increment_by) > v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current_usage', v_current_usage,
      'limit', v_limit,
      'remaining', GREATEST(0, v_limit - v_current_usage),
      'message', format('Usage limit exceeded. You have used %s of %s %s this month.', 
        v_current_usage, v_limit, p_feature_name)
    );
  END IF;

  -- Increment usage
  UPDATE public.feature_usage
  SET usage_count = usage_count + p_increment_by,
      updated_at = now()
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

-- Function to get current usage
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
  -- Get user's tier
  SELECT subscription_tier INTO v_tier_name
  FROM public.user_credits
  WHERE user_id = p_user_id;

  IF v_tier_name IS NULL THEN
    v_tier_name := 'free';
  END IF;

  -- Get usage limits for tier
  SELECT usage_limits INTO v_usage_limits
  FROM public.subscription_tiers
  WHERE tier_name = v_tier_name;

  -- Get limit for this feature
  v_limit := COALESCE((v_usage_limits->>p_feature_name)::INTEGER, 0);

  -- If unlimited
  IF v_limit = -1 THEN
    RETURN jsonb_build_object(
      'current_usage', 0,
      'limit', -1,
      'remaining', -1,
      'unlimited', true
    );
  END IF;

  -- Calculate current period
  v_period_start := date_trunc('month', now());

  -- Get current usage
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

-- Update subscription tiers with new features and usage limits
UPDATE subscription_tiers SET
  features = '["5 BizMap AI conversations/month", "Community read-only access", "Prompt library (view only)", "1 active sprint", "Community forum support"]'::jsonb,
  usage_limits = '{"reports": 0, "market_intelligence": 0, "collaborators": 0}'::jsonb
WHERE tier_name = 'free';

UPDATE subscription_tiers SET
  features = '["50 BizMap AI conversations/month", "Full community access", "Prompt library with export", "Unlimited sprints", "Market intelligence (10 queries/month)", "Basic collaboration (3 max)", "Basic reports (5/month)", "Priority email support"]'::jsonb,
  usage_limits = '{"reports": 5, "market_intelligence": 10, "collaborators": 3}'::jsonb
WHERE tier_name = 'creator';

UPDATE subscription_tiers SET
  features = '["150 BizMap AI conversations/month", "AI-enhanced community", "Unlimited market intelligence", "Unlimited custom reports + PDF export", "Advanced collaboration (unlimited)", "Success score analytics", "API access", "24hr priority support"]'::jsonb,
  usage_limits = '{"reports": -1, "market_intelligence": -1, "collaborators": -1}'::jsonb
WHERE tier_name = 'professional';

