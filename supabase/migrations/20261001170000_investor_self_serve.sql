-- Investors are self-serve.
--
-- Only mentors and marketplace providers offer something to the network that
-- needs an admin decision. An investor completes the same details step, but
-- the account is approved on submission: no application row is filed, so no
-- admin alert is sent and nothing waits in the review queue.
--
-- Existing pending investor requests are approved here and the applicant gets
-- the approval email they were told to expect.

CREATE OR REPLACE FUNCTION public.submit_account_application(
  p_situation text, p_full_name text DEFAULT NULL, p_email text DEFAULT NULL,
  p_role_profile jsonb DEFAULT '{}'::jsonb, p_session_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid(); v_app public.account_applications; v_profile public.profiles;
  v_details jsonb; v_email text; v_type text; v_status text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in to send this request'; END IF;
  v_type := public.classify_onboarding_situation(p_situation);
  -- Resubmission uses the previously reviewed request; callers cannot choose a new category.
  IF p_situation IS NULL AND p_session_id IS NULL THEN
    SELECT a.user_type INTO v_type FROM public.account_applications a
      JOIN public.profiles p ON p.id=a.user_id AND p.user_type=a.user_type AND p.approval_status=a.status
      WHERE a.user_id=v_user AND a.status IN ('rejected','pending') ORDER BY a.submitted_at DESC LIMIT 1;
  END IF;
  IF v_type IS NULL OR v_type NOT IN ('mentor','marketplace','investor') THEN
    RAISE EXCEPTION 'Only reviewed account types can apply';
  END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id=v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  v_details := public.validate_account_role_profile(v_type,p_role_profile,true);
  -- An approved investor sending the details again is a retry or an update,
  -- not a category change.
  IF v_profile.user_type IN ('mentor','marketplace','investor') AND v_profile.approval_status='approved'
     AND NOT (v_type='investor' AND v_profile.user_type='investor') THEN
    RAISE EXCEPTION 'An approved category change requires administrator support';
  END IF;
  IF p_session_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.onboarding_sessions WHERE id=p_session_id AND user_id=v_user
  ) THEN RAISE EXCEPTION 'Onboarding session not found'; END IF;
  SELECT * INTO v_app FROM public.account_applications WHERE user_id=v_user AND status='pending' FOR UPDATE;
  IF v_type='investor' THEN
    IF FOUND AND v_app.user_type <> 'investor' THEN
      RAISE EXCEPTION 'A request is already pending. Wait for its review before changing the application';
    END IF;
    -- A request left from the reviewed era is closed rather than left in the queue.
    IF FOUND THEN
      UPDATE public.account_applications SET status='approved', reviewed_at=now(),
        decision_note='Approved automatically: investor accounts are self-serve.', updated_at=now()
        WHERE id=v_app.id;
    END IF;
    v_status := 'approved';
    v_app := NULL;
  ELSIF FOUND THEN
    IF v_app.user_type <> v_type OR v_app.role_profile <> v_details THEN
      RAISE EXCEPTION 'A request is already pending. Wait for its review before changing the application';
    END IF;
    v_status := 'pending';
  ELSE
    SELECT email INTO v_email FROM auth.users WHERE id=v_user;
    INSERT INTO public.account_applications(user_id,user_type,full_name,email,role_profile,schema_version)
    VALUES(v_user,v_type,left(nullif(btrim(p_full_name),''),200),v_email,v_details,2) RETURNING * INTO v_app;
    v_status := 'pending';
  END IF;
  UPDATE public.profiles SET user_type=v_type, founder_segment=NULL, approval_status=v_status,
    role_profile=v_details,onboarding_completed=true,quiz_completed=true,
    user_preferences=COALESCE(user_preferences,'{}'::jsonb)-'requires_guided_onboarding'
    WHERE id=v_user;
  UPDATE public.onboarding_sessions SET status='completed',completed_at=COALESCE(completed_at,now()),
    abandoned_at=NULL,current_step=1,
    answers=answers || jsonb_build_object('founderSegment',v_type,'roleProfile',v_details) || CASE WHEN p_situation IS NOT NULL THEN jsonb_build_object('situation',p_situation) ELSE '{}'::jsonb END,
    derived_context=jsonb_build_object('userType',v_type,'applicationId',v_app.id,'approvalStatus',v_status,'schemaVersion',2)
    WHERE user_id=v_user AND ((p_session_id IS NOT NULL AND id=p_session_id) OR (p_session_id IS NULL AND status='in_progress'));
  DELETE FROM public.daily_tasks WHERE user_id=v_user AND task_text='Complete your startup profile'
    AND task_source='platform' AND NOT COALESCE(is_completed,false);
  INSERT INTO public.user_activity_log(user_id,activity_type,activity_data,page_path,event_key)
    VALUES(v_user,
      CASE WHEN v_status='approved' THEN 'account_self_serve_completed' ELSE 'account_application_submitted' END,
      jsonb_build_object('user_type',v_type,'application_id',v_app.id,'quiz_version',2),'/onboarding',
      CASE WHEN v_status='approved' THEN 'account-self-serve:'||v_type ELSE 'account-application:'||v_app.id::text END)
    ON CONFLICT(user_id,event_key) DO NOTHING;
  RETURN jsonb_build_object('applicationId',v_app.id,'userType',v_type,'approvalStatus',v_status);
END $$;
REVOKE ALL ON FUNCTION public.submit_account_application(text,text,text,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_account_application(text,text,text,jsonb,uuid) TO authenticated;

-- Approve investor requests filed while investors were still reviewed.
DO $$
DECLARE v_app record;
BEGIN
  FOR v_app IN
    UPDATE public.account_applications a
    SET status='approved', reviewed_at=now(), reviewed_by=NULL,
        decision_note='Approved automatically: investor accounts are self-serve.', updated_at=now()
    WHERE a.user_type='investor' AND a.status='pending'
    RETURNING a.id, a.user_id
  LOOP
    UPDATE public.profiles SET approval_status='approved'
      WHERE id=v_app.user_id AND user_type='investor' AND approval_status='pending';
    PERFORM public.queue_account_application_email(v_app.id,'approved');
  END LOOP;
END $$;
