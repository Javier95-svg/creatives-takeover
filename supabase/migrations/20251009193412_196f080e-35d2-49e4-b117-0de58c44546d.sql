-- User reputation and level tracking
CREATE TABLE user_reputation (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0 CHECK (total_points >= 0),
  level INTEGER DEFAULT 1 CHECK (level >= 1),
  level_name TEXT DEFAULT 'Newcomer',
  next_level_threshold INTEGER DEFAULT 100,
  badges JSONB DEFAULT '[]'::jsonb,
  achievements JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reputation transactions log
CREATE TABLE reputation_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_reputation
CREATE POLICY "Anyone can view reputation"
  ON user_reputation FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own reputation"
  ON user_reputation FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage reputation"
  ON user_reputation FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies for reputation_transactions
CREATE POLICY "Users can view their own transactions"
  ON reputation_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage transactions"
  ON reputation_transactions FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger to update updated_at
CREATE TRIGGER update_user_reputation_updated_at
  BEFORE UPDATE ON user_reputation
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate level from points
CREATE OR REPLACE FUNCTION calculate_user_level(points INTEGER)
RETURNS TABLE(level INTEGER, level_name TEXT, next_threshold INTEGER) AS $$
BEGIN
  IF points < 100 THEN
    RETURN QUERY SELECT 1, 'Newcomer'::TEXT, 100;
  ELSIF points < 500 THEN
    RETURN QUERY SELECT 2, 'Explorer'::TEXT, 500;
  ELSIF points < 1500 THEN
    RETURN QUERY SELECT 3, 'Contributor'::TEXT, 1500;
  ELSIF points < 5000 THEN
    RETURN QUERY SELECT 4, 'Community Builder'::TEXT, 5000;
  ELSIF points < 15000 THEN
    RETURN QUERY SELECT 5, 'Mentor'::TEXT, 15000;
  ELSE
    RETURN QUERY SELECT 6, 'Legend'::TEXT, 999999;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to award reputation points
CREATE OR REPLACE FUNCTION award_reputation_points(
  p_user_id UUID,
  p_points INTEGER,
  p_action_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_points INTEGER;
  v_new_points INTEGER;
  v_level_info RECORD;
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_level_up BOOLEAN := false;
BEGIN
  -- Insert or get current reputation
  INSERT INTO user_reputation (user_id, total_points)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current points and level
  SELECT total_points, level INTO v_current_points, v_old_level
  FROM user_reputation
  WHERE user_id = p_user_id;

  -- Calculate new points
  v_new_points := v_current_points + p_points;
  
  -- Get new level info
  SELECT * INTO v_level_info FROM calculate_user_level(v_new_points);
  v_new_level := v_level_info.level;
  
  -- Check if leveled up
  IF v_new_level > v_old_level THEN
    v_level_up := true;
  END IF;

  -- Update reputation
  UPDATE user_reputation
  SET 
    total_points = v_new_points,
    level = v_level_info.level,
    level_name = v_level_info.level_name,
    next_level_threshold = v_level_info.next_threshold,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Log transaction
  INSERT INTO reputation_transactions (user_id, points, action_type, reference_id, reference_type)
  VALUES (p_user_id, p_points, p_action_type, p_reference_id, p_reference_type);

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'new_points', v_new_points,
    'points_awarded', p_points,
    'level', v_level_info.level,
    'level_name', v_level_info.level_name,
    'level_up', v_level_up,
    'next_threshold', v_level_info.next_threshold
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create index for faster queries
CREATE INDEX idx_reputation_transactions_user_id ON reputation_transactions(user_id);
CREATE INDEX idx_reputation_transactions_created_at ON reputation_transactions(created_at DESC);