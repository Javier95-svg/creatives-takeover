-- ========================================
-- CREATE VC VIEWS TRACKING TABLE
-- ========================================
-- Track VC profile views for monthly limits by subscription tier
-- ========================================

-- Create vc_views table
CREATE TABLE IF NOT EXISTS vc_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vc_id uuid REFERENCES investors(id) ON DELETE CASCADE NOT NULL,
  viewed_at timestamptz DEFAULT now() NOT NULL,
  subscription_tier text NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_vc_views_user_month ON vc_views(user_id, viewed_at);
CREATE INDEX IF NOT EXISTS idx_vc_views_vc ON vc_views(vc_id);
CREATE INDEX IF NOT EXISTS idx_vc_views_user_tier ON vc_views(user_id, subscription_tier);

-- Enable Row Level Security
ALTER TABLE vc_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own VC views"
  ON vc_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own VC views"
  ON vc_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to get monthly view count for a user
CREATE OR REPLACE FUNCTION get_monthly_vc_view_count(p_user_id uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM vc_views
  WHERE user_id = p_user_id
    AND viewed_at >= date_trunc('month', now());
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user can view more VCs based on their tier
CREATE OR REPLACE FUNCTION can_view_vc(p_user_id uuid, p_tier text)
RETURNS boolean AS $$
DECLARE
  view_count integer;
  tier_limit integer;
BEGIN
  -- Get current month's view count
  view_count := get_monthly_vc_view_count(p_user_id);

  -- Set limit based on tier
  tier_limit := CASE p_tier
    WHEN 'free' THEN 5
    WHEN 'creator' THEN 25
    WHEN 'professional' THEN -1  -- unlimited
    ELSE 0
  END;

  -- Return true if unlimited or under limit
  RETURN tier_limit = -1 OR view_count < tier_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_monthly_vc_view_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_vc(uuid, text) TO authenticated;
