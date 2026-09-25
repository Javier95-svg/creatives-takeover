-- Role transitions are server-owned. This invoker trigger deliberately sees
-- authenticated for direct API writes and the owner for guarded definer RPCs.
CREATE OR REPLACE FUNCTION public.guard_account_classification()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    IF TG_OP = 'INSERT' THEN
      IF COALESCE(NEW.user_type, 'founder') NOT IN ('founder', 'builder')
        OR COALESCE(NEW.approval_status, 'approved') <> 'approved' THEN
        RAISE EXCEPTION 'Use the account application flow' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.user_type IS DISTINCT FROM OLD.user_type
       OR NEW.approval_status IS DISTINCT FROM OLD.approval_status
       OR NEW.founder_segment IS DISTINCT FROM OLD.founder_segment THEN
      RAISE EXCEPTION 'Account classification is managed by onboarding and review' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_account_classification BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_account_classification();

-- Applications can only be submitted/decided through the guarded RPCs.
REVOKE INSERT, UPDATE, DELETE ON public.account_applications FROM anon, authenticated;
ALTER TABLE public.account_applications
  ADD COLUMN IF NOT EXISTS role_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 2;

CREATE OR REPLACE FUNCTION public.validate_account_role_profile(p_type text, p_value jsonb, p_required boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  v_key text; v_value jsonb; v_allowed text[]; v_required text[];
  v_arrays text[]; v_options text[]; v_item jsonb;
BEGIN
  IF p_type NOT IN ('mentor','marketplace','investor') THEN
    IF p_value <> '{}'::jsonb THEN RAISE EXCEPTION 'Role details do not apply to this account'; END IF;
    RETURN '{}'::jsonb;
  END IF;
  IF p_value IS NULL OR jsonb_typeof(p_value) <> 'object' OR octet_length(p_value::text) > 12000 THEN
    RAISE EXCEPTION 'Invalid role details';
  END IF;
  CASE p_type
    WHEN 'mentor' THEN
      v_allowed := ARRAY['expertise','yearsActive','stages','experience','engagement'];
      v_required := ARRAY['expertise','stages','experience','engagement'];
      v_arrays := ARRAY['expertise','stages'];
    WHEN 'marketplace' THEN
      v_allowed := ARRAY['services','category','idealCustomer','portfolio','capacity'];
      v_required := ARRAY['services','category','idealCustomer','portfolio','capacity'];
      v_arrays := ARRAY['services'];
    WHEN 'investor' THEN
      v_allowed := ARRAY['sectors','stages','geography','checkRange','activity'];
      v_required := ARRAY['sectors','stages','geography','activity'];
      v_arrays := ARRAY['sectors','stages'];
  END CASE;
  FOR v_key, v_value IN SELECT * FROM jsonb_each(p_value) LOOP
    IF NOT v_key = ANY(v_allowed) THEN RAISE EXCEPTION 'Unknown role field: %', v_key; END IF;
    IF v_key = ANY(v_arrays) THEN
      IF jsonb_typeof(v_value) <> 'array' THEN RAISE EXCEPTION 'Invalid %', v_key; END IF;
      IF jsonb_array_length(v_value) > 40 THEN RAISE EXCEPTION 'Too many values for %', v_key; END IF;
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_value) LOOP
        IF jsonb_typeof(v_item) <> 'string' OR length(btrim(v_item #>> '{}')) NOT BETWEEN 1 AND 60 THEN
          RAISE EXCEPTION 'Invalid value in %', v_key;
        END IF;
      END LOOP;
    ELSIF v_key = 'yearsActive' THEN
      IF jsonb_typeof(v_value) <> 'number' OR (v_value::text)::numeric NOT BETWEEN 0 AND 100 THEN
        RAISE EXCEPTION 'Invalid years operating';
      END IF;
    ELSIF jsonb_typeof(v_value) <> 'string' OR length(btrim(v_value #>> '{}')) NOT BETWEEN 1 AND 500 THEN
      RAISE EXCEPTION 'Invalid %', v_key;
    END IF;
    v_options := CASE
      WHEN v_key='sectors' AND p_type='investor' THEN ARRAY['AI & Machine Learning','BioTech & Life Sciences','CleanTech & Climate','Consumer & D2C','Cybersecurity','DeepTech & Hardware','Developer Tools','E-Commerce & Marketplace','EdTech','Energy','Enterprise Software','FinTech','FoodTech & AgTech','Gaming & Entertainment','GovTech','HealthTech','HR Tech & Future of Work','InsurTech','LegalTech','Logistics & Supply Chain','Manufacturing & Industry 4.0','Media & Creator Economy','Mobility & Logistics','Mobility & Transportation','PropTech & Real Estate','RetailTech','Robotics & Automation','SaaS','Social Impact','SpaceTech','Sports & Wellness','Travel & Hospitality','Web3 & Blockchain']
      WHEN v_key='category' THEN ARRAY['sales','marketing','ops','tech_support']
      WHEN v_key='stages' AND p_type='investor' THEN ARRAY['Pre-Seed','Seed','Series A','Series B','Series C+']
      WHEN v_key='stages' AND p_type='mentor' THEN ARRAY['Exploring','Validation','Building','Launch','Growth']
      WHEN v_key='engagement' THEN ARRAY['one_off','ongoing','both']
      WHEN v_key='capacity' THEN ARRAY['available','limited','waitlist']
      WHEN v_key='activity' THEN ARRAY['actively_investing','exploring']
      ELSE NULL END;
    IF v_options IS NOT NULL THEN
      IF v_key = ANY(v_arrays) THEN
        IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_value) x WHERE NOT x = ANY(v_options)) THEN
          RAISE EXCEPTION 'Invalid option for %', v_key;
        END IF;
      ELSIF NOT (v_value #>> '{}') = ANY(v_options) THEN RAISE EXCEPTION 'Invalid option for %', v_key;
      END IF;
    END IF;
  END LOOP;
  IF p_required THEN
    FOREACH v_key IN ARRAY v_required LOOP
      IF NOT p_value ? v_key OR p_value->v_key = '[]'::jsonb THEN RAISE EXCEPTION 'Missing %', v_key; END IF;
    END LOOP;
  END IF;
  RETURN p_value;
END $$;

CREATE OR REPLACE FUNCTION public.guard_account_role_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' OR NEW.role_profile IS DISTINCT FROM OLD.role_profile THEN
    PERFORM public.validate_account_role_profile(NEW.user_type, NEW.role_profile, false);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_account_role_profile BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_account_role_profile();

DROP FUNCTION public.submit_account_application(text,text,text,jsonb);
CREATE FUNCTION public.submit_account_application(
  p_situation text, p_full_name text DEFAULT NULL, p_email text DEFAULT NULL,
  p_role_profile jsonb DEFAULT '{}'::jsonb, p_session_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid(); v_app public.account_applications; v_profile public.profiles;
  v_details jsonb; v_email text; v_type text;
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
  IF v_profile.user_type IN ('mentor','marketplace','investor') AND v_profile.approval_status='approved' THEN
    RAISE EXCEPTION 'An approved category change requires administrator support';
  END IF;
  IF p_session_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.onboarding_sessions WHERE id=p_session_id AND user_id=v_user
  ) THEN RAISE EXCEPTION 'Onboarding session not found'; END IF;
  SELECT * INTO v_app FROM public.account_applications WHERE user_id=v_user AND status='pending' FOR UPDATE;
  IF FOUND THEN
    IF v_app.user_type <> v_type OR v_app.role_profile <> v_details THEN
      RAISE EXCEPTION 'A request is already pending. Wait for its review before changing the application';
    END IF;
  ELSE
    SELECT email INTO v_email FROM auth.users WHERE id=v_user;
    INSERT INTO public.account_applications(user_id,user_type,full_name,email,role_profile,schema_version)
    VALUES(v_user,v_type,left(nullif(btrim(p_full_name),''),200),v_email,v_details,2) RETURNING * INTO v_app;
  END IF;
  UPDATE public.profiles SET user_type=v_type, founder_segment=NULL, approval_status='pending',
    role_profile=v_details,onboarding_completed=true,quiz_completed=true,
    user_preferences=COALESCE(user_preferences,'{}'::jsonb)-'requires_guided_onboarding'
    WHERE id=v_user;
  UPDATE public.onboarding_sessions SET status='completed',completed_at=COALESCE(completed_at,now()),
    abandoned_at=NULL,current_step=1,
    answers=answers || jsonb_build_object('founderSegment',v_type,'roleProfile',v_details) || CASE WHEN p_situation IS NOT NULL THEN jsonb_build_object('situation',p_situation) ELSE '{}'::jsonb END,
    derived_context=jsonb_build_object('userType',v_type,'applicationId',v_app.id,'schemaVersion',2)
    WHERE user_id=v_user AND ((p_session_id IS NOT NULL AND id=p_session_id) OR (p_session_id IS NULL AND status='in_progress'));
  DELETE FROM public.daily_tasks WHERE user_id=v_user AND task_text='Complete your startup profile'
    AND task_source='platform' AND NOT COALESCE(is_completed,false);
  INSERT INTO public.user_activity_log(user_id,activity_type,activity_data,page_path,event_key)
    VALUES(v_user,'account_application_submitted',jsonb_build_object('user_type',v_type,'application_id',v_app.id,'quiz_version',2),'/onboarding','account-application:'||v_app.id::text)
    ON CONFLICT(user_id,event_key) DO NOTHING;
  RETURN jsonb_build_object('applicationId',v_app.id,'userType',v_type);
END $$;
REVOKE ALL ON FUNCTION public.submit_account_application(text,text,text,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_account_application(text,text,text,jsonb,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_account_application(p_application_id uuid,p_decision text,p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_app public.account_applications; v_profile public.profiles; v_user uuid;
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'Only an administrator can review account applications'; END IF;
  IF p_decision IS NULL OR p_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  SELECT user_id INTO v_user FROM public.account_applications WHERE id=p_application_id;
  -- Same lock order as submission.
  SELECT * INTO v_profile FROM public.profiles WHERE id=v_user FOR UPDATE;
  SELECT * INTO v_app FROM public.account_applications WHERE id=p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF v_app.status <> 'pending' THEN RETURN jsonb_build_object('status',v_app.status,'alreadyReviewed',true); END IF;
  IF v_profile.user_type <> v_app.user_type OR v_profile.approval_status <> 'pending' THEN
    RAISE EXCEPTION 'Application no longer matches the account';
  END IF;
  IF p_decision='approved' THEN PERFORM public.validate_account_role_profile(v_app.user_type,v_app.role_profile,true); END IF;
  UPDATE public.account_applications SET status=p_decision,reviewed_at=now(),reviewed_by=auth.uid(),
    decision_note=left(p_note,300),updated_at=now() WHERE id=p_application_id;
  -- The reviewer sees the immutable application; do not erase profile edits
  -- made after submission when recording the decision.
  UPDATE public.profiles SET approval_status=p_decision WHERE id=v_app.user_id;
  PERFORM public.queue_account_application_email(p_application_id,p_decision);
  RETURN jsonb_build_object('status',p_decision,'alreadyReviewed',false);
END $$;

CREATE OR REPLACE FUNCTION public.list_account_applications(p_status text DEFAULT 'pending')
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'submittedAt' DESC),'[]'::jsonb) FROM (
    SELECT jsonb_build_object('id',a.id,'userId',a.user_id,'userType',a.user_type,'status',a.status,
      'fullName',COALESCE(a.full_name,p.full_name),'email',a.email,'username',p.username,
      'submittedAt',a.submitted_at,'reviewedAt',a.reviewed_at,'decisionNote',a.decision_note,
      'roleProfile',a.role_profile,'schemaVersion',a.schema_version) AS row
    FROM public.account_applications a LEFT JOIN public.profiles p ON p.id=a.user_id
    WHERE public.is_admin_user() AND (p_status IS NULL OR a.status=p_status)
    ORDER BY a.submitted_at DESC LIMIT 500
  ) rows;
$$;
