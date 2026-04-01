-- Track win-back email outreach to churned users
-- Used to prevent re-emailing within a 30-day window

CREATE TABLE IF NOT EXISTS reactivation_outreach (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  previous_tier TEXT,
  campaign_type TEXT DEFAULT 'win_back',
  sent_at       TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Index for fast dedup lookups by email + recency
CREATE INDEX idx_reactivation_email_sent
  ON reactivation_outreach (email, sent_at DESC);

-- RLS: only the service role can read/write this table
ALTER TABLE reactivation_outreach ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON reactivation_outreach
  FOR ALL
  USING (auth.role() = 'service_role');
