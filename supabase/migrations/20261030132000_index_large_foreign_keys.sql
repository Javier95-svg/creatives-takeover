-- Index the foreign keys on the largest tables.
--
-- Without an index on the referencing column, deleting (or re-keying) a
-- parent row makes Postgres scan the whole child table to enforce the key:
-- deleting a community post scans all ~79k community_notifications, deleting
-- a task scans ~52k plan items and ~36k recommendation events, and deleting a
-- user account scans the plan runs and message events. Row counts are from
-- production on 2026-10-30; these are the only unindexed foreign keys on
-- tables above 2,000 rows.
--
-- Plain CREATE INDEX (not CONCURRENTLY) so it can run inside a transaction;
-- at these sizes each build takes well under a second.

CREATE INDEX IF NOT EXISTS community_notifications_post_id_idx
  ON public.community_notifications (post_id);

CREATE INDEX IF NOT EXISTS daily_task_plan_items_task_id_idx
  ON public.daily_task_plan_items (task_id);

CREATE INDEX IF NOT EXISTS task_recommendation_events_task_id_idx
  ON public.task_recommendation_events (task_id);

CREATE INDEX IF NOT EXISTS daily_task_plan_runs_plan_id_idx
  ON public.daily_task_plan_runs (plan_id);

CREATE INDEX IF NOT EXISTS daily_task_plan_runs_user_id_idx
  ON public.daily_task_plan_runs (user_id);

CREATE INDEX IF NOT EXISTS message_performance_events_user_id_idx
  ON public.message_performance_events (user_id);
