-- Reduce dashboard unfinished-task bell reminders to one aggregate notification
-- per user every 5 days. The cron may still run daily; this function enforces a
-- rolling per-user cooldown before inserting another task_deadline_expired row.

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
  notifyable_users AS (
    SELECT d.user_id
    FROM due d
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.community_notifications n
      WHERE n.user_id = d.user_id
        AND n.notification_type = 'task_deadline_expired'
        AND n.created_at >= now() - interval '5 days'
    )
    GROUP BY d.user_id
  ),
  due_to_notify AS (
    SELECT d.*
    FROM due d
    JOIN notifyable_users nu ON nu.user_id = d.user_id
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
    FROM due_to_notify d
    WHERE t.id = d.id
    RETURNING
      t.id,
      t.user_id,
      t.task_text,
      t.task_date,
      t.deadline_time,
      d.next_level
  ),
  grouped AS (
    SELECT
      u.user_id,
      MIN(u.task_date) AS task_date,
      MIN(u.deadline_time) AS oldest_deadline_time,
      MAX(u.next_level) AS max_reminder_level,
      COUNT(*) AS task_count,
      ARRAY_AGG(u.id ORDER BY u.deadline_time, u.id) AS task_ids,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'task_id', u.id,
          'task_text', u.task_text,
          'deadline_time', u.deadline_time,
          'reminder_level', u.next_level
        )
        ORDER BY u.deadline_time, u.id
      ) AS tasks
    FROM updated u
    GROUP BY u.user_id
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
      g.user_id,
      g.user_id,
      'task_deadline_expired',
      FALSE,
      JSONB_BUILD_OBJECT(
        'task_ids', g.task_ids,
        'task_count', g.task_count,
        'task_text', CASE WHEN g.task_count = 1 THEN g.tasks->0->>'task_text' ELSE NULL END,
        'deadline_time', g.oldest_deadline_time,
        'overdue_days', GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - g.oldest_deadline_time)) / 86400)::INTEGER),
        'reminder_level', g.max_reminder_level,
        'tasks', g.tasks,
        'message', CASE
          WHEN g.task_count = 1 THEN 'You have 1 unfinished task remaining on Dashboard: ' || COALESCE(g.tasks->0->>'task_text', 'Open task')
          ELSE 'You have ' || g.task_count::TEXT || ' unfinished tasks remaining on Dashboard.'
        END,
        'route', '/dashboard/tasks?date=' || g.task_date::TEXT
      )
    FROM grouped g
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted_count FROM inserted;

  RETURN inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_task_overdue_reminders(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_task_overdue_reminders(UUID) TO service_role;
