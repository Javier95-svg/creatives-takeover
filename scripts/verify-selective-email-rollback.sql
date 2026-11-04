-- Run with supabase db query --linked. All test writes roll back.
BEGIN;
DO $test$
DECLARE v_user uuid; v_action text; v_first uuid; v_second uuid;
BEGIN
  IF public.notif_pref_enabled('00000000-0000-0000-0000-000000000000','dm_email_enabled')
    OR public.notif_pref_enabled('00000000-0000-0000-0000-000000000000','stage_guidance_emails')
  THEN RAISE EXCEPTION 'Missing preferences did not fail closed'; END IF;
  IF NOT public.notif_pref_enabled('00000000-0000-0000-0000-000000000000','discovery_call_request_email_enabled')
  THEN RAISE EXCEPTION 'Booking email default changed'; END IF;
  IF has_function_privilege('authenticated','public.claim_account_engagement_email(uuid,text,text)','EXECUTE')
  THEN RAISE EXCEPTION 'Member can claim an engagement send'; END IF;

  SELECT p.id,t.recommendation_key INTO v_user,v_action
  FROM public.profiles p JOIN auth.users u ON u.id=p.id
  JOIN public.daily_tasks t ON t.user_id=p.id AND t.is_completed=false
  WHERE p.user_type IN ('founder','builder') AND p.assigned_stage BETWEEN 1 AND 7
    AND u.email_confirmed_at IS NOT NULL
    AND t.recommendation_key LIKE 'stage:'||
      (ARRAY['IDENTITY','PROTOTYPE','VALIDATING','BUILDING','LAUNCH','TRACTION','FUNDRAISING'])[p.assigned_stage]||':%'
    AND NOT EXISTS (SELECT 1 FROM public.retention_email_log l
      WHERE l.user_id=p.id AND l.unsubscribed=true)
    AND NOT EXISTS (SELECT 1 FROM public.retention_email_log l
      WHERE l.user_id=p.id AND l.resend_id IS NOT NULL
        AND l.sequence NOT IN ('task_plan_digest','rooms_reply')
        AND l.sent_at>now()-interval '14 days')
  ORDER BY p.id LIMIT 1;
  IF v_user IS NULL THEN RAISE EXCEPTION 'No suitable test candidate'; END IF;
  IF public.claim_account_engagement_email(v_user,'stage_guidance',v_action) IS NOT NULL
  THEN RAISE EXCEPTION 'Unopted account received a claim'; END IF;

  INSERT INTO public.notification_preferences(user_id,stage_guidance_emails)
    VALUES(v_user,true)
    ON CONFLICT(user_id) DO UPDATE SET stage_guidance_emails=true;
  v_first := public.claim_account_engagement_email(v_user,'stage_guidance',v_action);
  IF v_first IS NULL THEN RAISE EXCEPTION 'Opted-in stage account could not claim'; END IF;
  v_second := public.claim_account_engagement_email(v_user,'stage_guidance',v_action);
  IF v_second IS NOT NULL THEN RAISE EXCEPTION 'Second job obtained a duplicate claim'; END IF;

  UPDATE public.notification_preferences SET stage_guidance_emails=false WHERE user_id=v_user;
  DELETE FROM public.account_engagement_email_claims WHERE id=v_first;
  v_second := public.claim_account_engagement_email(v_user,'stage_guidance',v_action);
  IF v_second IS NOT NULL THEN RAISE EXCEPTION 'Opt-out did not block claim'; END IF;
END;
$test$;
ROLLBACK;
