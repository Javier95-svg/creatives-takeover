-- Monthly quota tracking per user
-- Tracks discovery calls, VC profile views, and accelerator profile views
-- Rows are created on first use per month; reset happens naturally via new rows each month

CREATE TABLE IF NOT EXISTS user_monthly_quotas (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month                       DATE NOT NULL, -- always the first day of the month e.g. '2026-04-01'
  discovery_calls_used        INTEGER NOT NULL DEFAULT 0,
  vc_profiles_viewed          INTEGER NOT NULL DEFAULT 0,
  accelerator_profiles_viewed INTEGER NOT NULL DEFAULT 0,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);

CREATE INDEX idx_monthly_quotas_user_month ON user_monthly_quotas (user_id, month);

-- Auto-update updated_at
CREATE TRIGGER update_user_monthly_quotas_updated_at
  BEFORE UPDATE ON user_monthly_quotas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE user_monthly_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own monthly quotas"
  ON user_monthly_quotas
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to monthly quotas"
  ON user_monthly_quotas
  FOR ALL
  USING (auth.role() = 'service_role');
