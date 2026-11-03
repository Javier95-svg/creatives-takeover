-- Daily task-plan emails went to users with no notification-preferences row
-- because the generic flags default to true. Keep in-app/push delivery, but
-- require a separate explicit opt-in for this daily email. Fix its CTA host.
BEGIN;

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS daily_task_plan_email_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.dispatch_daily_task_plan_digests_v1(p_limit integer DEFAULT 500)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  r record; v_url text:=(SELECT value FROM private.service_config WHERE key='supabase_url');
  v_key text:=(SELECT value FROM private.service_config WHERE key='supabase_service_key');
  v_count integer:=0;
BEGIN
  FOR r IN
    SELECT plan.id plan_id,plan.user_id,plan.plan_date,au.email,p.full_name,
      (SELECT t.task_text FROM public.daily_task_plan_items i JOIN public.daily_tasks t ON t.id=i.task_id
       WHERE i.plan_id=plan.id ORDER BY i.rank LIMIT 1) first_task,
      public.resolve_task_plan_timezone_v1(plan.user_id,'UTC') timezone
    FROM public.daily_task_plans plan
    JOIN public.profiles p ON p.id=plan.user_id JOIN auth.users au ON au.id=plan.user_id
    WHERE plan.status='ready' AND plan.plan_date=(now() AT TIME ZONE public.resolve_task_plan_timezone_v1(plan.user_id,'UTC'))::date
      AND EXTRACT(hour FROM now() AT TIME ZONE public.resolve_task_plan_timezone_v1(plan.user_id,'UTC'))=7
      AND EXTRACT(minute FROM now() AT TIME ZONE public.resolve_task_plan_timezone_v1(plan.user_id,'UTC'))<15
      AND public.notif_pref_enabled(plan.user_id,'task_reminders')
      AND NOT EXISTS (SELECT 1 FROM public.daily_task_plan_deliveries d WHERE d.plan_id=plan.id AND d.channel='in_app')
    ORDER BY plan.generated_at LIMIT LEAST(GREATEST(p_limit,1),1000)
  LOOP
    INSERT INTO public.community_notifications(user_id,actor_id,notification_type,read,metadata)
    VALUES(r.user_id,r.user_id,'daily_task_plan_ready',false,jsonb_build_object(
      'message','Your three founder priorities are ready. Start with: '||COALESCE(r.first_task,'your next action'),
      'route','/dashboard/tasks','planId',r.plan_id,'planDate',r.plan_date
    ));
    INSERT INTO public.daily_task_plan_deliveries(plan_id,user_id,channel,status,sent_at)
    VALUES(r.plan_id,r.user_id,'in_app','sent',now()) ON CONFLICT(plan_id,channel) DO NOTHING;
    INSERT INTO public.daily_task_plan_deliveries(plan_id,user_id,channel,status,sent_at)
    VALUES(r.plan_id,r.user_id,'push',CASE WHEN public.notif_pref_enabled(r.user_id,'push_enabled') THEN 'sent' ELSE 'skipped' END,now())
    ON CONFLICT(plan_id,channel) DO NOTHING;

    IF r.email IS NOT NULL AND v_url IS NOT NULL AND v_key IS NOT NULL
      AND public.notif_pref_enabled(r.user_id,'retention_emails')
      AND EXISTS (
        SELECT 1 FROM public.notification_preferences n
        WHERE n.user_id=r.user_id AND n.daily_task_plan_email_enabled=true
      ) THEN
      PERFORM net.http_post(url:=v_url||'/functions/v1/send-retention-email',
        headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_key),
        body:=jsonb_build_object('userId',r.user_id,'email',r.email,'fullName',r.full_name,
          'sequence','task_plan_digest','contextHeadline','Start here: '||COALESCE(r.first_task,'Open today''s founder plan.'),
          'ctaUrl','https://creatives-takeover.com/dashboard/tasks','ctaLabel','Open today''s plan'));
      INSERT INTO public.daily_task_plan_deliveries(plan_id,user_id,channel,status,sent_at)
      VALUES(r.plan_id,r.user_id,'email','sent',now()) ON CONFLICT(plan_id,channel) DO NOTHING;
    ELSE
      INSERT INTO public.daily_task_plan_deliveries(plan_id,user_id,channel,status,last_error)
      VALUES(r.plan_id,r.user_id,'email','skipped','Daily plan email not explicitly enabled or delivery unavailable')
      ON CONFLICT(plan_id,channel) DO NOTHING;
    END IF;
    v_count:=v_count+1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_daily_task_plan_digests_v1(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_daily_task_plan_digests_v1(integer) TO service_role;

COMMIT;
