-- Dashboard Smart Founder Command Center upgrade.
--
-- Adds recommendation intent/feedback metadata so platform tasks can behave
-- differently from quiet setup milestones, and expands recommendation events
-- for explicit user feedback.

ALTER TABLE public.daily_tasks
  ADD COLUMN IF NOT EXISTS intent_type text,
  ADD COLUMN IF NOT EXISTS source_tool text,
  ADD COLUMN IF NOT EXISTS is_foundational boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cooldown_until timestamptz,
  ADD COLUMN IF NOT EXISTS max_suggestions integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS seen_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS feedback_status text;

ALTER TABLE public.daily_tasks
  DROP CONSTRAINT IF EXISTS daily_tasks_intent_type_check;

ALTER TABLE public.daily_tasks
  ADD CONSTRAINT daily_tasks_intent_type_check
  CHECK (
    intent_type IS NULL OR intent_type IN (
      'daily_momentum',
      'weekly_mission',
      'stage_action',
      'accountability',
      'foundational'
    )
  );

ALTER TABLE public.daily_tasks
  DROP CONSTRAINT IF EXISTS daily_tasks_feedback_status_check;

ALTER TABLE public.daily_tasks
  ADD CONSTRAINT daily_tasks_feedback_status_check
  CHECK (
    feedback_status IS NULL OR feedback_status IN (
      'remind_later',
      'not_relevant',
      'already_done',
      'stop_showing'
    )
  );

ALTER TABLE public.daily_tasks
  DROP CONSTRAINT IF EXISTS daily_tasks_max_suggestions_check;

ALTER TABLE public.daily_tasks
  ADD CONSTRAINT daily_tasks_max_suggestions_check
  CHECK (max_suggestions >= 0);

ALTER TABLE public.daily_tasks
  DROP CONSTRAINT IF EXISTS daily_tasks_seen_count_check;

ALTER TABLE public.daily_tasks
  ADD CONSTRAINT daily_tasks_seen_count_check
  CHECK (seen_count >= 0);

ALTER TABLE public.task_recommendation_events
  DROP CONSTRAINT IF EXISTS task_recommendation_events_event_type_check;

ALTER TABLE public.task_recommendation_events
  ADD CONSTRAINT task_recommendation_events_event_type_check
  CHECK (
    event_type IN (
      'suggested',
      'accepted',
      'dismissed',
      'rescheduled',
      'completed',
      'seen',
      'remind_later',
      'not_relevant',
      'already_done',
      'stop_showing'
    )
  );

UPDATE public.daily_tasks
SET
  intent_type = CASE
    WHEN recommendation_key LIKE 'tool:%' THEN 'foundational'
    WHEN recommendation_key LIKE 'weekly:%' OR COALESCE(contributes_to_weekly_mission, false) THEN 'weekly_mission'
    WHEN recommendation_key LIKE 'stage:%' THEN 'stage_action'
    WHEN recommendation_key LIKE 'overdue:%' THEN 'accountability'
    ELSE COALESCE(intent_type, 'daily_momentum')
  END,
  source_tool = CASE recommendation_key
    WHEN 'tool:icp-builder' THEN 'icp-builder'
    WHEN 'tool:waitlist-maker' THEN 'waitlist-maker'
    WHEN 'tool:pmf-lab' THEN 'pmf-lab'
    WHEN 'tool:tech-stack' THEN 'tech-stack'
    WHEN 'tool:mvp-builder' THEN 'mvp-builder'
    WHEN 'tool:gtm-plan' THEN 'gtm-plan'
    ELSE source_tool
  END,
  is_foundational = recommendation_key LIKE 'tool:%',
  max_suggestions = CASE
    WHEN recommendation_key LIKE 'tool:%' THEN 1
    ELSE COALESCE(max_suggestions, 5)
  END,
  seen_count = COALESCE(seen_count, 0),
  updated_at = now()
WHERE task_source = 'platform'
  OR ai_generated IS TRUE
  OR recommendation_key IS NOT NULL;

WITH ranked_foundational AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, recommendation_key
      ORDER BY task_date DESC, created_at DESC
    ) AS rn
  FROM public.daily_tasks
  WHERE recommendation_key LIKE 'tool:%'
    AND task_source = 'platform'
    AND COALESCE(is_completed, false) = false
    AND COALESCE(recommendation_status, '') <> 'dismissed'
)
UPDATE public.daily_tasks AS task
SET
  recommendation_status = 'dismissed',
  dismissed_at = COALESCE(task.dismissed_at, now()),
  feedback_status = COALESCE(task.feedback_status, 'remind_later'),
  cooldown_until = COALESCE(task.cooldown_until, now() + interval '14 days'),
  updated_at = now()
FROM ranked_foundational AS ranked
WHERE task.id = ranked.id
  AND ranked.rn > 1;

CREATE INDEX IF NOT EXISTS daily_tasks_user_intent_idx
  ON public.daily_tasks (user_id, intent_type, task_date);

CREATE INDEX IF NOT EXISTS daily_tasks_user_feedback_idx
  ON public.daily_tasks (user_id, feedback_status, cooldown_until);
