-- Enforce deadlines on dashboard tasks and support one-time expiry notifications.

ALTER TABLE public.daily_tasks
ADD COLUMN IF NOT EXISTS deadline_expired_notification_sent_at TIMESTAMPTZ;

-- Backfill legacy tasks without deadline using end-of-day UTC for their task date.
UPDATE public.daily_tasks
SET deadline_time = ((task_date::text || ' 23:59:00+00')::timestamptz)
WHERE deadline_time IS NULL;

ALTER TABLE public.daily_tasks
ALTER COLUMN deadline_time SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_daily_tasks_deadline_expired_notification
ON public.daily_tasks(user_id, deadline_time)
WHERE is_completed = FALSE AND deadline_expired_notification_sent_at IS NULL;

CREATE OR REPLACE FUNCTION public.notify_task_deadline_expired(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  WITH overdue AS (
    UPDATE public.daily_tasks t
    SET deadline_expired_notification_sent_at = now()
    WHERE t.user_id = p_user_id
      AND t.is_completed = FALSE
      AND t.deadline_time <= now()
      AND t.deadline_expired_notification_sent_at IS NULL
    RETURNING t.id, t.user_id, t.task_text, t.deadline_time
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
      o.user_id,
      o.user_id,
      'task_deadline_expired',
      FALSE,
      jsonb_build_object(
        'task_id', o.id,
        'task_text', o.task_text,
        'deadline_time', o.deadline_time,
        'route', '/tasks'
      )
    FROM overdue o
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted_count FROM inserted;

  RETURN inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_task_deadline_expired(UUID) TO authenticated;
