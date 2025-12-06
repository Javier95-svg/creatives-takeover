-- Conversion Tracking Schema
-- Tracks conversion events, triggers, and funnel metrics

CREATE TABLE IF NOT EXISTS conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  
  -- Event details
  trigger_type TEXT NOT NULL, -- e.g., 'bizmap-step-5', 'community-like', 'exit-intent'
  trigger_context JSONB, -- Additional context about the trigger
  event_type TEXT NOT NULL, -- 'viewed', 'dismissed', 'clicked', 'signup_started', 'signup_completed', 'abandoned'
  
  -- User context
  page_path TEXT,
  page_title TEXT,
  referrer TEXT,
  user_agent TEXT,
  
  -- Timing
  time_to_trigger INTEGER, -- Seconds from page load to trigger
  time_to_action INTEGER, -- Seconds from trigger to action
  engagement_score INTEGER, -- Calculated engagement score (0-100)
  
  -- Conversion outcome
  converted BOOLEAN DEFAULT FALSE,
  conversion_time TIMESTAMPTZ, -- When conversion happened
  conversion_source TEXT, -- Final source that led to conversion
  
  -- A/B test data
  ab_test_variant TEXT, -- Variant identifier if part of A/B test
  ab_test_name TEXT, -- Name of the A/B test
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversion_events_session_id ON conversion_events(session_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_user_id ON conversion_events(user_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_trigger_type ON conversion_events(trigger_type);
CREATE INDEX IF NOT EXISTS idx_conversion_events_event_type ON conversion_events(event_type);
CREATE INDEX IF NOT EXISTS idx_conversion_events_created_at ON conversion_events(created_at);
CREATE INDEX IF NOT EXISTS idx_conversion_events_converted ON conversion_events(converted);
CREATE INDEX IF NOT EXISTS idx_conversion_events_ab_test ON conversion_events(ab_test_name, ab_test_variant);

-- Conversion funnel tracking
CREATE TABLE IF NOT EXISTS conversion_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Funnel stages
  stage_1_viewed_at TIMESTAMPTZ, -- First trigger viewed
  stage_2_engaged_at TIMESTAMPTZ, -- User engaged with trigger
  stage_3_signup_started_at TIMESTAMPTZ, -- Sign-up form opened
  stage_4_signup_completed_at TIMESTAMPTZ, -- Account created
  
  -- Drop-off tracking
  dropped_off_at_stage INTEGER, -- 1, 2, 3, or 4
  drop_off_reason TEXT,
  
  -- Final outcome
  completed BOOLEAN DEFAULT FALSE,
  completion_time INTEGER, -- Total seconds from first view to completion
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversion_funnels_session_id ON conversion_funnels(session_id);
CREATE INDEX IF NOT EXISTS idx_conversion_funnels_user_id ON conversion_funnels(user_id);
CREATE INDEX IF NOT EXISTS idx_conversion_funnels_completed ON conversion_funnels(completed);

-- A/B Test tracking
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name TEXT NOT NULL UNIQUE,
  description TEXT,
  variants JSONB NOT NULL, -- Array of variant objects
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed'
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  traffic_split JSONB, -- e.g., {"variant_a": 50, "variant_b": 50}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_name ON ab_tests(test_name);

-- User variant assignments (for consistent A/B test bucketing)
CREATE TABLE IF NOT EXISTS ab_test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  test_name TEXT NOT NULL REFERENCES ab_tests(test_name) ON DELETE CASCADE,
  variant TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, test_name)
);

CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_user ON ab_test_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_session ON ab_test_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_test ON ab_test_assignments(test_name);

-- RLS Policies
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_assignments ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert conversion events (for tracking before sign-up)
CREATE POLICY "Allow anonymous conversion event tracking"
  ON conversion_events FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated users to view their own conversion events
CREATE POLICY "Users can view own conversion events"
  ON conversion_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Allow anonymous users to insert funnel data
CREATE POLICY "Allow anonymous funnel tracking"
  ON conversion_funnels FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated users to view their own funnel data
CREATE POLICY "Users can view own funnel data"
  ON conversion_funnels FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Allow authenticated users to view A/B tests
CREATE POLICY "Authenticated users can view active A/B tests"
  ON ab_tests FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Allow authenticated users to view their A/B test assignments
CREATE POLICY "Users can view own A/B test assignments"
  ON ab_test_assignments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow anonymous users to insert A/B test assignments
CREATE POLICY "Allow anonymous A/B test assignment"
  ON ab_test_assignments FOR INSERT
  TO anon
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_conversion_events_updated_at
  BEFORE UPDATE ON conversion_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversion_funnels_updated_at
  BEFORE UPDATE ON conversion_funnels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_tests_updated_at
  BEFORE UPDATE ON ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate conversion rate by trigger type
CREATE OR REPLACE FUNCTION get_conversion_rate_by_trigger(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  trigger_type TEXT,
  total_views BIGINT,
  total_clicks BIGINT,
  total_signups BIGINT,
  conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.trigger_type,
    COUNT(*) FILTER (WHERE ce.event_type = 'viewed') as total_views,
    COUNT(*) FILTER (WHERE ce.event_type = 'clicked') as total_clicks,
    COUNT(*) FILTER (WHERE ce.converted = true) as total_signups,
    CASE 
      WHEN COUNT(*) FILTER (WHERE ce.event_type = 'viewed') > 0 THEN
        ROUND(
          (COUNT(*) FILTER (WHERE ce.converted = true)::NUMERIC / 
           COUNT(*) FILTER (WHERE ce.event_type = 'viewed')::NUMERIC) * 100,
          2
        )
      ELSE 0
    END as conversion_rate
  FROM conversion_events ce
  WHERE ce.created_at BETWEEN start_date AND end_date
  GROUP BY ce.trigger_type
  ORDER BY conversion_rate DESC;
END;
$$ LANGUAGE plpgsql;

