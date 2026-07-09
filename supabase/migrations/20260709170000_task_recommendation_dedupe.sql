-- Task recommendation anti-repetition upgrade.
--
-- 1) Allow 'suggested' recommendation events so the client engine can track
--    suggestion history (powers rotation + repeat cooldowns).
-- 2) One-time cleanup: the old engine inserted a fresh copy of the same
--    recommendation every day (e.g. "Complete and save your ICP Builder draft"
--    existed ~12x per user). Keep the newest open copy per (user, key) and
--    dismiss the older duplicates so calendars are clean immediately.

ALTER TABLE public.task_recommendation_events
  DROP CONSTRAINT IF EXISTS task_recommendation_events_event_type_check;

ALTER TABLE public.task_recommendation_events
  ADD CONSTRAINT task_recommendation_events_event_type_check
  CHECK (event_type IN ('suggested', 'accepted', 'dismissed', 'rescheduled', 'completed'));

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, recommendation_key
      ORDER BY task_date DESC, created_at DESC
    ) AS rn
  FROM public.daily_tasks
  WHERE recommendation_key IS NOT NULL
    AND task_source = 'platform'
    AND COALESCE(is_completed, false) = false
    AND COALESCE(recommendation_status, '') <> 'dismissed'
)
UPDATE public.daily_tasks AS t
SET
  recommendation_status = 'dismissed',
  dismissed_at = now(),
  updated_at = now()
FROM ranked AS r
WHERE t.id = r.id
  AND r.rn > 1;
