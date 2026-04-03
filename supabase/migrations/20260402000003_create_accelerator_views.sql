-- ========================================
-- CREATE ACCELERATOR VIEWS TRACKING TABLE
-- ========================================
-- Track accelerator profile views for monthly limits by subscription tier
-- ========================================

CREATE TABLE IF NOT EXISTS accelerator_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  accelerator_id uuid REFERENCES funding_opportunities(id) ON DELETE CASCADE NOT NULL,
  viewed_at timestamptz DEFAULT now() NOT NULL,
  subscription_tier text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_accelerator_views_user_month
  ON accelerator_views(user_id, viewed_at);

CREATE INDEX IF NOT EXISTS idx_accelerator_views_accelerator
  ON accelerator_views(accelerator_id);

CREATE INDEX IF NOT EXISTS idx_accelerator_views_user_tier
  ON accelerator_views(user_id, subscription_tier);

ALTER TABLE accelerator_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own accelerator views" ON accelerator_views;
CREATE POLICY "Users can view their own accelerator views"
  ON accelerator_views FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own accelerator views" ON accelerator_views;
CREATE POLICY "Users can insert their own accelerator views"
  ON accelerator_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION get_monthly_accelerator_view_count(p_user_id uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM accelerator_views
  WHERE user_id = p_user_id
    AND viewed_at >= date_trunc('month', now());
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_view_accelerator(p_user_id uuid, p_tier text)
RETURNS boolean AS $$
DECLARE
  view_count integer;
  tier_limit integer;
BEGIN
  view_count := get_monthly_accelerator_view_count(p_user_id);

  tier_limit := CASE p_tier
    WHEN 'rookie' THEN 0
    WHEN 'rising' THEN 3
    WHEN 'pro' THEN -1
    ELSE 0
  END;

  RETURN tier_limit = -1 OR view_count < tier_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_monthly_accelerator_view_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_accelerator(uuid, text) TO authenticated;
