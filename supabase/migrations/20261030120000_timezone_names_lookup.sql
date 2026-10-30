-- Timezone validation without pg_timezone_names.
--
-- pg_timezone_names is a view that reads the whole time zone database from
-- disk every time it is queried. Measured on production (2026-10-30):
--   EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = 'Europe/Madrid')
-- took 435 ms. Thirteen functions used it to check that a timezone name is
-- valid, among them:
--   get_dashboard_snapshot_v4   up to two lookups per dashboard load
--                               (2.2 s mean, 7.8 s max in pg_stat_statements)
--   resolve_task_plan_timezone_v1 / ensure_task_plan_for_user_v1 (today plan)
--   process_routine_reminders, process_routine_reminder_emails (hourly, one
--                               lookup per profile row)
--   get_mentor_discovery_slots_v4 (one lookup per mentor row)
--
-- This copies the names into an indexed table and points every function at
-- it. The functions only ever ask "does this name exist", so the result is
-- the same; the lookup becomes a primary key probe.
--
-- If a Postgres upgrade ever adds new zones, re-run the INSERT below; until
-- then a brand new zone falls back the way an unknown one always has (UTC or
-- the caller's validation error).

CREATE TABLE IF NOT EXISTS public.timezone_names (
  name text PRIMARY KEY
);

COMMENT ON TABLE public.timezone_names IS
  'Copy of pg_timezone_names(name) for fast validation. Refresh with INSERT ... SELECT name FROM pg_timezone_names ON CONFLICT DO NOTHING.';

INSERT INTO public.timezone_names (name)
SELECT DISTINCT name FROM pg_timezone_names
ON CONFLICT (name) DO NOTHING;

-- Time zone names are public reference data. Two of the functions below run
-- as the caller (cofounder_marketplace_validate_listing, get_dashboard_snapshot_v1),
-- so signed-in and anonymous roles need to read it. Nobody writes to it
-- through the API.
ALTER TABLE public.timezone_names ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read timezone names" ON public.timezone_names;
CREATE POLICY "Anyone can read timezone names"
  ON public.timezone_names
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON public.timezone_names FROM anon, authenticated;
GRANT SELECT ON public.timezone_names TO anon, authenticated;

-- Rewrite every public function that reads pg_timezone_names. Rewriting the
-- live definitions (rather than restating them here) keeps any change made
-- since they were created; CREATE OR REPLACE keeps owners and grants.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosrc ILIKE '%pg_timezone_names%'
  LOOP
    EXECUTE replace(pg_get_functiondef(r.oid), 'pg_timezone_names', 'public.timezone_names');
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosrc ILIKE '%pg_timezone_names%'
  ) THEN
    RAISE EXCEPTION 'A public function still reads pg_timezone_names';
  END IF;
END
$$;
