-- Add deadline time and reminder tracking to daily_tasks
ALTER TABLE daily_tasks 
ADD COLUMN IF NOT EXISTS deadline_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deadline_reached_popup_shown BOOLEAN DEFAULT FALSE;

-- Create index for efficient reminder queries
CREATE INDEX IF NOT EXISTS idx_daily_tasks_deadline ON daily_tasks(deadline_time) WHERE is_completed = FALSE AND deadline_time IS NOT NULL;