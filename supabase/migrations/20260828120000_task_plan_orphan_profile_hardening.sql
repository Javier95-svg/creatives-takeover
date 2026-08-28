-- Ignore legacy/orphan profile rows during scheduled task-plan generation.
-- Also guard diagnostics against a user being deleted after cursor selection.

CREATE OR REPLACE FUNCTION public.process_due_daily_task_plans_v1(p_limit integer DEFAULT 100)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; v_zone text; v_date date; v_count integer:=0;
BEGIN
  FOR r IN
    SELECT p.id,zone.name timezone,(now() AT TIME ZONE zone.name)::date local_date
    FROM public.profiles p
    JOIN auth.users auth_user ON auth_user.id=p.id
    CROSS JOIN LATERAL (SELECT public.resolve_task_plan_timezone_v1(p.id,'UTC') name) zone
    WHERE NOT EXISTS (
      SELECT 1 FROM public.daily_task_plans d
      WHERE d.user_id=p.id
        AND d.plan_date=(now() AT TIME ZONE zone.name)::date
        AND d.status='ready'
    )
    ORDER BY p.id
    LIMIT LEAST(GREATEST(p_limit,1),500)
  LOOP
    v_zone:=r.timezone;
    v_date:=r.local_date;
    BEGIN
      PERFORM public.ensure_task_plan_for_user_v1(r.id,v_date,v_zone,3);
      v_count:=v_count+1;
    EXCEPTION WHEN OTHERS THEN
      IF EXISTS (SELECT 1 FROM auth.users existing_user WHERE existing_user.id=r.id) THEN
        INSERT INTO public.daily_task_plan_runs(user_id,plan_date,source,status,error_code,error_message)
        VALUES(r.id,v_date,'scheduler','failed',SQLSTATE,left(SQLERRM,1000));
      END IF;
      RAISE WARNING 'Task plan generation failed user=% date=%: %',r.id,v_date,SQLERRM;
    END;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.process_due_daily_task_plans_v1(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_due_daily_task_plans_v1(integer) TO service_role;

-- Resume the rollout for valid founders after installing the hardened worker.
SELECT public.process_due_daily_task_plans_v1(500);
