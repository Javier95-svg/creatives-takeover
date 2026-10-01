-- Read-only diagnosis for a blocked CT migration. Run as postgres in a fresh
-- Supabase SQL Editor query. This does not cancel or terminate any session.
-- Locks change over time; an empty result after a failure does not prove there
-- was no blocker at the time. SQL text is omitted to avoid exposing parameters.

WITH targets AS (
  SELECT c.oid
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE (n.nspname || '.' || c.relname) IN (
    'auth.users', 'public.ct_products', 'public.ct_traction_revisions',
    'public.traction_engine_weekly_logs', 'public.traction_engine_sprints',
    'public.traction_engine_experiments', 'private.ct_core_tools_sql_runs'
  )
), relevant_sessions AS (
  SELECT DISTINCT pid FROM pg_locks
  WHERE database=(SELECT oid FROM pg_database WHERE datname=current_database())
    AND relation IN (SELECT oid FROM targets)
    AND pid IS DISTINCT FROM pg_backend_pid()
)
SELECT a.pid,
       a.application_name,
       a.usename AS database_role,
       a.state,
       now()-a.xact_start AS transaction_age,
       a.wait_event_type,
       a.wait_event,
       pg_blocking_pids(a.pid) AS blocking_pids,
       coalesce(n.nspname || '.' || c.relname, l.locktype) AS locked_object,
       l.mode,
       l.granted,
       CASE WHEN l.relation IN (SELECT oid FROM targets) THEN true ELSE false END AS migration_target
FROM pg_locks l
JOIN relevant_sessions r ON r.pid=l.pid
LEFT JOIN pg_stat_activity a ON a.pid=l.pid
LEFT JOIN pg_class c ON c.oid=l.relation
LEFT JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE l.database IS NULL OR l.database=(SELECT oid FROM pg_database WHERE datname=current_database())
ORDER BY a.xact_start NULLS LAST, a.pid, migration_target DESC, locked_object;
