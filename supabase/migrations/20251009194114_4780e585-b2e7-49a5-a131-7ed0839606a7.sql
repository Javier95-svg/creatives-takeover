-- Daily challenges table
CREATE TABLE daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_date DATE NOT NULL UNIQUE,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('post', 'comment', 'feedback', 'connection', 'share', 'engagement')),
  challenge_title TEXT NOT NULL,
  challenge_description TEXT,
  reward_points INTEGER DEFAULT 25,
  reward_badge_id TEXT,
  participants_count INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User challenge completions table
CREATE TABLE user_challenge_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES daily_challenges(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  proof_reference_id UUID,
  proof_reference_type TEXT,
  points_awarded INTEGER DEFAULT 0,
  UNIQUE(user_id, challenge_id)
);

-- Enable RLS
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenge_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_challenges
CREATE POLICY "Anyone can view daily challenges"
  ON daily_challenges FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage challenges"
  ON daily_challenges FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies for user_challenge_completions
CREATE POLICY "Users can view their own completions"
  ON user_challenge_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own completions"
  ON user_challenge_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage completions"
  ON user_challenge_completions FOR ALL
  USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_daily_challenges_date ON daily_challenges(challenge_date DESC);
CREATE INDEX idx_challenge_completions_user ON user_challenge_completions(user_id);
CREATE INDEX idx_challenge_completions_challenge ON user_challenge_completions(challenge_id);

-- Function to get today's challenge
CREATE OR REPLACE FUNCTION get_todays_challenge()
RETURNS TABLE(
  id UUID,
  challenge_type TEXT,
  challenge_title TEXT,
  challenge_description TEXT,
  reward_points INTEGER,
  participants_count INTEGER,
  completion_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.challenge_type,
    dc.challenge_title,
    dc.challenge_description,
    dc.reward_points,
    dc.participants_count,
    dc.completion_count
  FROM daily_challenges dc
  WHERE dc.challenge_date = CURRENT_DATE
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Function to check if user completed today's challenge
CREATE OR REPLACE FUNCTION has_completed_todays_challenge(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_challenge_completions ucc
    JOIN daily_challenges dc ON dc.id = ucc.challenge_id
    WHERE ucc.user_id = p_user_id
    AND dc.challenge_date = CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Function to complete a challenge
CREATE OR REPLACE FUNCTION complete_daily_challenge(
  p_user_id UUID,
  p_challenge_id UUID,
  p_proof_reference_id UUID DEFAULT NULL,
  p_proof_reference_type TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_challenge RECORD;
  v_already_completed BOOLEAN;
  v_reputation_result JSONB;
BEGIN
  -- Check if already completed
  SELECT EXISTS (
    SELECT 1 FROM user_challenge_completions 
    WHERE user_id = p_user_id AND challenge_id = p_challenge_id
  ) INTO v_already_completed;
  
  IF v_already_completed THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Challenge already completed'
    );
  END IF;
  
  -- Get challenge details
  SELECT * INTO v_challenge FROM daily_challenges WHERE id = p_challenge_id;
  
  IF v_challenge IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Challenge not found'
    );
  END IF;
  
  -- Insert completion record
  INSERT INTO user_challenge_completions (
    user_id,
    challenge_id,
    proof_reference_id,
    proof_reference_type,
    points_awarded
  ) VALUES (
    p_user_id,
    p_challenge_id,
    p_proof_reference_id,
    p_proof_reference_type,
    v_challenge.reward_points
  );
  
  -- Update challenge counts
  UPDATE daily_challenges
  SET 
    completion_count = completion_count + 1,
    participants_count = (
      SELECT COUNT(DISTINCT user_id) 
      FROM user_challenge_completions 
      WHERE challenge_id = p_challenge_id
    )
  WHERE id = p_challenge_id;
  
  -- Award reputation points
  SELECT award_reputation_points(
    p_user_id,
    v_challenge.reward_points,
    'daily_challenge_completed',
    p_challenge_id,
    'challenge'
  ) INTO v_reputation_result;
  
  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_challenge.reward_points,
    'challenge_title', v_challenge.challenge_title,
    'reputation_result', v_reputation_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;