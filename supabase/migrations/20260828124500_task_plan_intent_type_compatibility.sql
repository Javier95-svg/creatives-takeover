-- Allow the externally focused intent families selected by daily task plans.

ALTER TABLE public.daily_tasks
  DROP CONSTRAINT IF EXISTS daily_tasks_intent_type_check;

ALTER TABLE public.daily_tasks
  ADD CONSTRAINT daily_tasks_intent_type_check CHECK (
    intent_type IS NULL OR intent_type IN (
      'daily_momentum',
      'weekly_mission',
      'stage_action',
      'accountability',
      'foundational',
      'customer_evidence',
      'follow_up'
    )
  );

-- Retry founders who could not receive a plan under the legacy constraint.
SELECT public.process_due_daily_task_plans_v1(500);
