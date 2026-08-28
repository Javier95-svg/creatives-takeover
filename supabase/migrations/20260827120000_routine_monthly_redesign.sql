-- Simplify Routine to two clear periods: daily actions and monthly priorities.
-- Keep legacy weekly completion rows readable, while all new writes use daily
-- or monthly and reset on the founder's local day/month boundary.

ALTER TABLE public.routine_task_completions
  DROP CONSTRAINT IF EXISTS routine_task_completions_period_type_check;

ALTER TABLE public.routine_task_completions
  ADD CONSTRAINT routine_task_completions_period_type_check
  CHECK (period_type IN ('daily', 'monthly', 'weekly'));

-- Convert saved weekly config items in place. Completion history is deliberately
-- left unchanged because a historic week cannot be mapped honestly to a month.
UPDATE public.profiles p
SET routine_config = jsonb_set(
  p.routine_config,
  '{tasks}',
  COALESCE((
    SELECT jsonb_agg(
      CASE
        WHEN item.value->>'cadence' = 'weekly'
          THEN item.value || '{"cadence":"monthly"}'::jsonb
        ELSE item.value
      END
      ORDER BY item.ordinality
    )
    FROM jsonb_array_elements(COALESCE(p.routine_config->'tasks', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality)
  ), '[]'::jsonb),
  true
)
WHERE jsonb_typeof(p.routine_config->'tasks') = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p.routine_config->'tasks') task
    WHERE task->>'cadence' = 'weekly'
  );

CREATE OR REPLACE FUNCTION public.get_dashboard_snapshot_v4(p_timezone text DEFAULT 'UTC')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_timezone text := 'UTC';
  v_today date;
  v_month_start date;
  v_pending integer := 0;
  v_snapshot jsonb;
  v_routine jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NULLIF(p.user_preferences->>'timezone', ''))
      THEN p.user_preferences->>'timezone'
    WHEN EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_timezone) THEN p_timezone
    ELSE 'UTC'
  END
  INTO v_timezone
  FROM public.profiles p
  WHERE p.id = v_user;

  v_timezone := COALESCE(v_timezone, 'UTC');
  v_today := (now() AT TIME ZONE v_timezone)::date;
  v_month_start := date_trunc('month', v_today::timestamp)::date;
  v_snapshot := public.get_dashboard_snapshot_v3(v_timezone);

  -- The dashboard's "Today's habits" area stays focused on daily actions.
  -- Daily now means every day; the old hidden weekday scheduling no longer
  -- makes routines appear and disappear unexpectedly.
  WITH daily_items AS (
    SELECT item
    FROM public.profiles p
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.routine_config->'tasks', '[]'::jsonb)) item
    WHERE p.id = v_user
      AND COALESCE(item->>'active', 'true') <> 'false'
      AND COALESCE(item->>'cadence', 'daily') = 'daily'
  ), item_rows AS (
    SELECT
      item->>'id' AS id,
      item->>'title' AS title,
      EXISTS (
        SELECT 1
        FROM public.routine_task_completions rtc
        WHERE rtc.user_id = v_user
          AND rtc.routine_task_id = item->>'id'
          AND rtc.period_type = 'daily'
          AND rtc.period_date = v_today
          AND rtc.status = 'completed'
      ) AS completed
    FROM daily_items
  )
  SELECT jsonb_build_object(
    'configured', EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = v_user
        AND jsonb_array_length(COALESCE(p.routine_config->'tasks', '[]'::jsonb)) > 0
    ),
    'completed', count(*) FILTER (WHERE completed),
    'total', count(*),
    'items', COALESCE(
      jsonb_agg(jsonb_build_object('id', id, 'title', title, 'completed', completed)),
      '[]'::jsonb
    )
  )
  INTO v_routine
  FROM item_rows;

  -- The sidebar count covers unfinished daily actions plus unfinished monthly
  -- priorities, using the correct local reset key for each cadence.
  WITH active_items AS (
    SELECT
      item->>'id' AS id,
      CASE
        WHEN COALESCE(item->>'cadence', 'daily') IN ('monthly', 'weekly') THEN 'monthly'
        ELSE 'daily'
      END AS period_type,
      CASE
        WHEN COALESCE(item->>'cadence', 'daily') IN ('monthly', 'weekly') THEN v_month_start
        ELSE v_today
      END AS period_date
    FROM public.profiles p
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.routine_config->'tasks', '[]'::jsonb)) item
    WHERE p.id = v_user
      AND COALESCE(item->>'active', 'true') <> 'false'
  )
  SELECT count(*)::integer
  INTO v_pending
  FROM active_items i
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.routine_task_completions c
    WHERE c.user_id = v_user
      AND c.routine_task_id = i.id
      AND c.period_type = i.period_type
      AND c.period_date = i.period_date
      AND c.status = 'completed'
  );

  v_routine := jsonb_set(v_routine, '{pendingCount}', to_jsonb(v_pending), true);
  RETURN jsonb_set(v_snapshot, '{focus,routine}', v_routine, true);
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_snapshot_v4(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_snapshot_v4(text) TO authenticated;

COMMENT ON FUNCTION public.get_dashboard_snapshot_v4(text) IS
  'Dashboard snapshot with daily routine items and local-month pending priority counts.';
