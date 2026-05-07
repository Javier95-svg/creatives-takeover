-- Tasks calendar v1: source metadata, recommendation events, and escalating bell reminders.

ALTER TABLE public.daily_tasks
ADD COLUMN IF NOT EXISTS task_description TEXT,
ADD COLUMN IF NOT EXISTS task_source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS recommendation_status TEXT,
ADD COLUMN IF NOT EXISTS recommendation_key TEXT,
ADD COLUMN IF NOT EXISTS recommendation_reason TEXT,
ADD COLUMN IF NOT EXISTS startup_stage_tag TEXT,
ADD COLUMN IF NOT EXISTS source_route TEXT,
ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rescheduled_from_date DATE,
ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS overdue_reminder_level INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS overdue_reminder_sent_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'daily_tasks_task_source_check'
      AND conrelid = 'public.daily_tasks'::regclass
  ) THEN
    ALTER TABLE public.daily_tasks
    ADD CONSTRAINT daily_tasks_task_source_check
    CHECK (task_source IN ('manual', 'platform'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'daily_tasks_recommendation_status_check'
      AND conrelid = 'public.daily_tasks'::regclass
  ) THEN
    ALTER TABLE public.daily_tasks
    ADD CONSTRAINT daily_tasks_recommendation_status_check
    CHECK (
      recommendation_status IS NULL
      OR recommendation_status IN ('suggested', 'accepted', 'dismissed')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'daily_tasks_overdue_reminder_level_check'
      AND conrelid = 'public.daily_tasks'::regclass
  ) THEN
    ALTER TABLE public.daily_tasks
    ADD CONSTRAINT daily_tasks_overdue_reminder_level_check
    CHECK (overdue_reminder_level BETWEEN 0 AND 3);
  END IF;
END $$;

UPDATE public.daily_tasks
SET task_source = CASE WHEN ai_generated = TRUE THEN 'platform' ELSE 'manual' END
WHERE task_source IS NULL;

CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_calendar
ON public.daily_tasks(user_id, task_date, deadline_time);

CREATE INDEX IF NOT EXISTS idx_daily_tasks_platform_recommendation
ON public.daily_tasks(user_id, task_date, recommendation_key)
WHERE task_source = 'platform';

CREATE INDEX IF NOT EXISTS idx_daily_tasks_overdue_reminder_levels
ON public.daily_tasks(user_id, deadline_time, overdue_reminder_level)
WHERE is_completed = FALSE AND deadline_time IS NOT NULL AND overdue_reminder_level < 3;

CREATE TABLE IF NOT EXISTS public.task_recommendation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.daily_tasks(id) ON DELETE SET NULL,
  recommendation_key TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('accepted', 'dismissed', 'rescheduled', 'completed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_recommendation_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_task_recommendation_events_user_created
ON public.task_recommendation_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_recommendation_events_user_key
ON public.task_recommendation_events(user_id, recommendation_key, created_at DESC);

DROP POLICY IF EXISTS "Users can read their own recommendation events" ON public.task_recommendation_events;
CREATE POLICY "Users can read their own recommendation events"
ON public.task_recommendation_events
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own recommendation events" ON public.task_recommendation_events;
CREATE POLICY "Users can insert their own recommendation events"
ON public.task_recommendation_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own recommendation events" ON public.task_recommendation_events;
CREATE POLICY "Users can update their own recommendation events"
ON public.task_recommendation_events
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.daily_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.task_recommendation_events REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'daily_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_tasks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'task_recommendation_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_recommendation_events;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.process_task_overdue_reminders(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  WITH eligible AS (
    SELECT
      t.id,
      t.user_id,
      t.task_text,
      t.task_date,
      t.deadline_time,
      t.overdue_reminder_level,
      CASE
        WHEN t.overdue_reminder_level = 0 AND t.deadline_time <= now() THEN 1
        WHEN t.overdue_reminder_level = 1 AND t.deadline_time <= now() - interval '48 hours' THEN 2
        WHEN t.overdue_reminder_level = 2 AND t.deadline_time <= now() - interval '96 hours' THEN 3
        ELSE NULL
      END AS next_level
    FROM public.daily_tasks t
    WHERE (p_user_id IS NULL OR t.user_id = p_user_id)
      AND COALESCE(t.is_completed, FALSE) = FALSE
      AND t.deadline_time IS NOT NULL
      AND t.deadline_time <= now()
      AND COALESCE(t.recommendation_status, '') <> 'dismissed'
      AND t.overdue_reminder_level < 3
  ),
  due AS (
    SELECT *
    FROM eligible
    WHERE next_level IS NOT NULL
  ),
  updated AS (
    UPDATE public.daily_tasks t
    SET
      overdue_reminder_level = d.next_level,
      overdue_reminder_sent_at = now(),
      last_reminder_sent = now(),
      deadline_expired_notification_sent_at = CASE
        WHEN d.next_level = 1 THEN now()
        ELSE t.deadline_expired_notification_sent_at
      END
    FROM due d
    WHERE t.id = d.id
    RETURNING
      t.id,
      t.user_id,
      t.task_text,
      t.task_date,
      t.deadline_time,
      d.next_level
  ),
  inserted AS (
    INSERT INTO public.community_notifications (
      user_id,
      actor_id,
      notification_type,
      read,
      metadata
    )
    SELECT
      u.user_id,
      u.user_id,
      'task_deadline_expired',
      FALSE,
      jsonb_build_object(
        'task_id', u.id,
        'task_text', u.task_text,
        'deadline_time', u.deadline_time,
        'overdue_days', GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - u.deadline_time)) / 86400)::INTEGER),
        'reminder_level', u.next_level,
        'message', CASE
          WHEN u.next_level = 1 THEN 'Deadline reached: ' || u.task_text
          WHEN u.next_level = 2 THEN 'Still overdue: ' || u.task_text
          ELSE 'Final reminder: complete or reschedule ' || u.task_text
        END,
        'route', '/dashboard/tasks?date=' || u.task_date::text || '&task=' || u.id::text
      )
    FROM updated u
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted_count FROM inserted;

  RETURN inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_task_overdue_reminders(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_task_overdue_reminders(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.notify_task_deadline_expired(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.process_task_overdue_reminders(p_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_task_deadline_expired(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_weekly_mission_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.weekly_missions wm
  SET
    completion_percentage = (
      SELECT COALESCE(
        (COUNT(CASE WHEN dt.is_completed = true THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
        0
      )
      FROM public.weekly_mission_tasks wmt
      JOIN public.daily_tasks dt ON dt.id = wmt.task_id
      WHERE wmt.weekly_mission_id = wm.id
    ),
    updated_at = now()
  WHERE wm.id IN (
    SELECT wmt.weekly_mission_id
    FROM public.weekly_mission_tasks wmt
    WHERE wmt.task_id = NEW.id
  );

  RETURN NEW;
END;
$$;
