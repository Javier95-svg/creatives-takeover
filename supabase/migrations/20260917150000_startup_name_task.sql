-- Only 4 of 216 real accounts have set a startup name, which is why the project
-- chip on the workspace home almost never renders and why Pulse has no project
-- to reason about. This puts naming it on the founder's task list.
--
-- Written as a worker rather than a one-off insert so it keeps itself correct:
-- new accounts get the task, and it closes itself the moment a name is set,
-- rather than leaving 212 stale rows behind.
--
-- priority 'high' because that is the top level daily_tasks supports; there is
-- no 'urgent'. Shaped like the other platform recommendations: task_source
-- 'platform', a namespaced recommendation_key, and a source_route to act on.

CREATE OR REPLACE FUNCTION public.ensure_startup_name_tasks(p_limit integer DEFAULT 500)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_limit integer := GREATEST(1, LEAST(COALESCE(p_limit, 500), 2000));
  v_created integer := 0;
  v_closed integer := 0;
BEGIN
  -- Close the task for anyone who has since named their startup, so it leaves
  -- the list without the founder having to tick it off.
  UPDATE public.daily_tasks t
  SET is_completed = true,
      completed_at = COALESCE(t.completed_at, now()),
      recommendation_status = 'accepted',
      updated_at = now()
  FROM public.profiles p
  WHERE p.id = t.user_id
    AND t.recommendation_key = 'profile:startup-name'
    AND COALESCE(t.is_completed, false) = false
    AND COALESCE(btrim(p.startup_name), '') <> '';
  GET DIAGNOSTICS v_closed = ROW_COUNT;

  -- Create it for real accounts still missing a name. Generated and test
  -- accounts are excluded using the same rules people search applies.
  INSERT INTO public.daily_tasks (
    user_id, task_date, task_text, task_description, priority, task_source,
    recommendation_key, recommendation_status, recommendation_reason,
    source_route, is_foundational, estimated_minutes, deadline_time,
    business_impact_score, stage_alignment_score
  )
  SELECT
    p.id,
    current_date,
    'Name your startup',
    'Add the name you are building under so your workspace, tasks and Pulse can refer to it directly.',
    'high',
    'platform',
    'profile:startup-name',
    'suggested',
    'Your workspace cannot show or reason about your project until it has a name.',
    '/dashboard',
    true,
    5,
    (current_date + interval '1 day' - interval '1 second'),
    8,
    8
  FROM public.profiles p
  WHERE COALESCE(btrim(p.startup_name), '') = ''
    AND EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = p.id
        AND NOT public.is_reserved_or_disposable_email(au.email)
    )
    AND NOT public.looks_like_generated_account(p.full_name, p.username)
    -- One open task per account, ever: a dismissed or completed one is not
    -- recreated, so this never nags someone who has already dealt with it.
    AND NOT EXISTS (
      SELECT 1 FROM public.daily_tasks t
      WHERE t.user_id = p.id
        AND t.recommendation_key = 'profile:startup-name'
    )
  LIMIT v_limit;
  GET DIAGNOSTICS v_created = ROW_COUNT;

  RETURN jsonb_build_object('created', v_created, 'closed', v_closed);
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_startup_name_tasks(integer) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.ensure_startup_name_tasks(integer) IS
  'Creates a high priority task for accounts with no startup_name and closes it once one is set.';

SELECT cron.unschedule('ensure-startup-name-tasks')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ensure-startup-name-tasks');

SELECT cron.schedule(
  'ensure-startup-name-tasks',
  '0 * * * *',
  $$SELECT public.ensure_startup_name_tasks();$$
);
