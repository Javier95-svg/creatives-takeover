CREATE TABLE IF NOT EXISTS icp_sprint_schedule (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email              text NOT NULL,
  full_name          text,
  niche              text,
  sequence           text NOT NULL,
  activation_intent  text,
  due_date           date NOT NULL,
  sent               boolean NOT NULL DEFAULT false,
  sent_at            timestamptz,
  icp_id             uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, sequence)
);

ALTER TABLE icp_sprint_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only" ON icp_sprint_schedule;
CREATE POLICY "Service role only" ON icp_sprint_schedule
  USING (auth.role() = 'service_role');
