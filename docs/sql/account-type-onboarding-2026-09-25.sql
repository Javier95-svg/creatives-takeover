-- Account-type onboarding: all five migrations, in deployment order.
-- Run this entire file ONCE in the Supabase SQL Editor, using the postgres role.
-- Intended for the existing production schema before these five migrations.
-- On any error the transaction rolls back; do not run the individual files afterward.
-- This script does not update the Supabase CLI migration history.

BEGIN;

-- ======================================================================
-- 20260925155000_onboarding_invitations.sql
-- ======================================================================

-- Invitation eligibility is bound to a verified sign-in email. Issuing one
-- does not approve the account or send an email.
CREATE TABLE public.account_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (email = lower(btrim(email)) AND email LIKE '%_@_%._%'),
  user_type text NOT NULL CHECK (user_type IN ('mentor','marketplace')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  revoked_at timestamptz,
  claimed_by uuid REFERENCES auth.users(id),
  UNIQUE(email,user_type)
);
ALTER TABLE public.account_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_invitations FROM anon, authenticated;
ALTER TABLE public.account_applications ADD COLUMN invitation_id uuid REFERENCES public.account_invitations(id);

CREATE FUNCTION public.classify_onboarding_situation(p_situation text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  SELECT CASE p_situation
    WHEN 'existing_project' THEN 'founder' WHEN 'starting_project' THEN 'builder'
    WHEN 'share_expertise' THEN 'mentor' WHEN 'deliver_services' THEN 'marketplace'
    WHEN 'explore_investments' THEN 'investor' ELSE NULL END;
$$;

CREATE FUNCTION public.manage_account_invitation(p_email text, p_user_type text, p_revoke boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid; v_email text := lower(btrim(p_email));
BEGIN
  IF NOT COALESCE(public.is_admin_user(),false) THEN RAISE EXCEPTION 'Only an administrator can manage invitations'; END IF;
  IF p_user_type IS NULL OR p_user_type NOT IN ('mentor','marketplace') OR v_email IS NULL OR length(v_email)>254 OR v_email NOT LIKE '%_@_%._%' THEN
    RAISE EXCEPTION 'Enter a valid email and invitation category';
  END IF;
  IF p_revoke THEN
    UPDATE public.account_invitations SET revoked_at=now() WHERE email=v_email AND user_type=p_user_type RETURNING id INTO v_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found'; END IF;
  ELSE
    INSERT INTO public.account_invitations(email,user_type,created_by) VALUES(v_email,p_user_type,auth.uid())
    ON CONFLICT(email,user_type) DO UPDATE SET expires_at=now()+interval '30 days',revoked_at=NULL
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;

CREATE FUNCTION public.list_account_invitations()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT COALESCE(public.is_admin_user(),false) THEN RAISE EXCEPTION 'Only an administrator can list invitations'; END IF;
  RETURN (SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.created_at DESC),'[]') FROM public.account_invitations i);
END $$;

CREATE FUNCTION public.my_account_invitation_types()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE(jsonb_agg(i.user_type),'[]') FROM public.account_invitations i
  JOIN auth.users u ON u.id=auth.uid() AND lower(btrim(u.email))=i.email
  WHERE u.email_confirmed_at IS NOT NULL AND i.revoked_at IS NULL AND i.expires_at>now()
    AND (i.claimed_by IS NULL OR i.claimed_by=u.id);
$$;

CREATE FUNCTION public.guard_application_invitation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_inv public.account_invitations;
BEGIN
  IF NEW.user_type NOT IN ('mentor','marketplace') THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' THEN
    SELECT i.* INTO v_inv FROM public.account_invitations i JOIN auth.users u
      ON u.id=NEW.user_id AND lower(btrim(u.email))=i.email
      WHERE u.email_confirmed_at IS NOT NULL AND i.user_type=NEW.user_type
        AND i.revoked_at IS NULL AND i.expires_at>now()
        AND (i.claimed_by IS NULL OR i.claimed_by=NEW.user_id) FOR UPDATE OF i;
    IF NOT FOUND THEN RAISE EXCEPTION 'A valid invitation for your verified email is required. Contact an administrator.'; END IF;
    UPDATE public.account_invitations SET claimed_by=NEW.user_id WHERE id=v_inv.id;
    NEW.invitation_id := v_inv.id;
  ELSIF NEW.status='approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    SELECT * INTO v_inv FROM public.account_invitations WHERE id=NEW.invitation_id FOR UPDATE;
    IF NOT FOUND OR v_inv.revoked_at IS NOT NULL OR v_inv.user_type<>NEW.user_type OR v_inv.claimed_by IS DISTINCT FROM NEW.user_id THEN
      RAISE EXCEPTION 'An active invitation is required before approval';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_application_invitation BEFORE INSERT OR UPDATE ON public.account_applications
FOR EACH ROW EXECUTE FUNCTION public.guard_application_invitation();

REVOKE ALL ON FUNCTION public.manage_account_invitation(text,text,boolean), public.list_account_invitations(), public.my_account_invitation_types() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_account_invitation(text,text,boolean), public.list_account_invitations(), public.my_account_invitation_types() TO authenticated;

-- ======================================================================
-- 20260925160000_account_onboarding_integrity.sql
-- ======================================================================

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

-- ======================================================================
-- 20260925161000_onboarding_classification_and_project.sql
-- ======================================================================

-- Atomic self-serve completion, retaining stage and routine behavior.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS investor_match_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS investment_stage text CHECK (investment_stage IN ('Pre-Seed','Seed','Series A','Series B','Series C+'));

CREATE OR REPLACE FUNCTION public.complete_onboarding_v1(
  p_session_id uuid,
  p_answers jsonb,
  p_context jsonb,
  p_profile_updates jsonb DEFAULT '{}'::jsonb,
  p_preference_patch jsonb DEFAULT '{}'::jsonb,
  p_routine_goal text DEFAULT NULL,
  p_routine_config jsonb DEFAULT NULL
)
RETURNS public.onboarding_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_session public.onboarding_sessions;
  v_brief text;
  v_sectors text[];
  v_customer_count integer;
  v_type text;
  v_name text;
  v_project uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(COALESCE(p_answers, 'null'::jsonb)) <> 'object'
    OR jsonb_typeof(COALESCE(p_context, 'null'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'Answers and context must be objects' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_session
  FROM public.onboarding_sessions
  WHERE id = p_session_id AND user_id = v_user
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Onboarding session not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_session.status = 'completed' THEN
    RETURN v_session;
  END IF;

  SELECT user_type INTO v_type FROM public.profiles WHERE id=v_user FOR UPDATE;
  IF v_type IN ('mentor','marketplace','investor') THEN RAISE EXCEPTION 'Use the reviewed account onboarding flow'; END IF;
  v_type := public.classify_onboarding_situation(p_answers->>'situation');
  IF v_type IS NULL THEN RAISE EXCEPTION 'Answer the first onboarding question'; END IF;
  p_answers := p_answers || jsonb_build_object('founderSegment',v_type);
  IF v_type NOT IN ('founder','builder') THEN RAISE EXCEPTION 'Invalid self-serve account type'; END IF;
  v_name := NULLIF(btrim(p_answers->>'projectName'),'');
  IF length(v_name)>120 THEN RAISE EXCEPTION 'Project name is too long'; END IF;
  IF v_type='founder' AND v_name IS NULL THEN RAISE EXCEPTION 'Project name is required'; END IF;
  v_name := COALESCE(v_name,'Untitled idea');
  IF COALESCE((p_answers->>'investorVisible')::boolean,false) AND NULLIF(p_answers->>'investmentStage','') IS NULL THEN
    RAISE EXCEPTION 'Choose a funding stage for investor matching';
  END IF;
  IF v_session.flow_version = 'adaptive_v1' THEN
    v_brief := trim(COALESCE(p_answers->>'startupBrief', ''));
    IF length(v_brief) < 20 OR length(v_brief) > 280 THEN
      RAISE EXCEPTION 'Startup brief must contain 20 to 280 characters' USING ERRCODE = '22023';
    END IF;
    IF COALESCE(p_answers->>'businessModel', '') = ''
      OR COALESCE(p_answers->>'evidenceState', '') = ''
      OR COALESCE(p_answers->>'primaryGoal', '') = ''
      OR COALESCE(p_answers->>'blocker', '') = ''
      OR COALESCE(p_answers->>'weeklyCapacityHours', '') = ''
      OR COALESCE(p_answers->>'selectedIntent', '') = '' THEN
      RAISE EXCEPTION 'Required adaptive onboarding answers are missing' USING ERRCODE = '22023';
    END IF;
  END IF;
  IF length(trim(COALESCE(p_answers->>'country', ''))) > 100 THEN
    RAISE EXCEPTION 'Country is too long' USING ERRCODE = '22023';
  END IF;

  v_sectors := CASE
    WHEN jsonb_typeof(p_answers->'sectors') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(p_answers->'sectors'))
    WHEN jsonb_typeof(p_profile_updates->'startup_industry') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(p_profile_updates->'startup_industry'))
    ELSE NULL
  END;

  UPDATE public.onboarding_sessions
  SET
    answers = p_answers,
    derived_context = p_context,
    status = 'completed',
    current_step = GREATEST(current_step, 6),
    completed_at = COALESCE(completed_at, now()),
    abandoned_at = NULL
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  UPDATE public.profiles p
  SET
    user_type = v_type,
    founder_segment = v_type,
    approval_status = 'approved',
    startup_name = v_name,
    investor_match_visible = COALESCE((p_answers->>'investorVisible')::boolean,false),
    investment_stage = NULLIF(p_answers->>'investmentStage',''),
    business_stage = COALESCE(NULLIF(p_context->>'businessStage', ''), NULLIF(p_profile_updates->>'business_stage', ''), p.business_stage),
    quiz_current_stage = COALESCE(NULLIF(p_context->>'businessStage', ''), NULLIF(p_profile_updates->>'quiz_current_stage', ''), p.quiz_current_stage),
    quiz_biggest_challenge = COALESCE(NULLIF(p_answers->>'blocker', ''), NULLIF(p_profile_updates->>'quiz_biggest_challenge', ''), p.quiz_biggest_challenge),
    current_focus = COALESCE(NULLIF(p_answers->>'primaryGoal', ''), p.current_focus),
    startup_description = COALESCE(NULLIF(p_answers->>'startupBrief', ''), p.startup_description),
    onboarding_completed = true,
    startup_industry = COALESCE(v_sectors, p.startup_industry),
    country = COALESCE(NULLIF(trim(p_answers->>'country'), ''), NULLIF(p_profile_updates->>'country', ''), p.country),
    assigned_stage = COALESCE((p_context->>'assignedStage')::integer, (p_profile_updates->>'assigned_stage')::integer, p.assigned_stage),
    quiz_completed = true,
    quiz_completed_at = COALESCE(p.quiz_completed_at, now()),
    quiz_answers_v2 = jsonb_build_object(
      'version', 4,
      'onboardingSessionId', p_session_id,
      'flowVersion', v_session.flow_version,
      'answers', p_answers - 'startupBrief' - 'country',
      'context', p_context
    ),
    user_preferences = COALESCE(p.user_preferences, '{}'::jsonb)
      || COALESCE(p_preference_patch, '{}'::jsonb)
      || jsonb_build_object(
        'activationIntent', p_context->>'selectedIntent',
        'founderStage', (p_context->>'assignedStage')::integer,
        'founderStageLabel', p_context->>'assignedStageLabel',
        'bizMapStage', p_context->>'bizMapStage',
        'founderLoop', p_context->>'founderLoop',
        'primaryPain', p_answers->>'blocker',
        'startupSectors', COALESCE(p_answers->'sectors', '[]'::jsonb),
        'supportAreasNeeded', COALESCE(p_preference_patch->'supportAreasNeeded', '[]'::jsonb),
        'cofounderSituation', NULLIF(p_answers->>'cofounderSituation', ''),
        'onboardingSessionId', p_session_id,
        'onboardingFlowVersion', v_session.flow_version,
        'onboardingRolloutVariant', v_session.rollout_variant,
        'onboardingContextVersion', 1
      ),
    routine_primary_goal = CASE
      WHEN p.routine_config IS NULL THEN COALESCE(NULLIF(p_routine_goal, ''), p.routine_primary_goal)
      ELSE p.routine_primary_goal
    END,
    routine_config = CASE
      WHEN p.routine_config IS NULL THEN COALESCE(p_routine_config, p.routine_config)
      ELSE p.routine_config
    END,
    updated_at = now()
  WHERE p.id = v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;

  -- Reuse the active project; no duplicate plan slot on retry or re-entry.
  v_project := public.ensure_active_project(v_user);
  UPDATE public.onboarding_sessions SET derived_context=derived_context ||
    jsonb_build_object('userType',v_type,'projectId',v_project,'quizVersion',2)
    WHERE id=p_session_id RETURNING * INTO v_session;

  IF to_regclass('public.founder_cycle_state') IS NOT NULL
    AND COALESCE(p_answers->>'businessModel', '') <> '' THEN
    v_customer_count := CASE p_answers->>'customerCountBand'
      WHEN '1' THEN 1 WHEN '2' THEN 2 WHEN '3' THEN 3 WHEN '4_plus' THEN 4 ELSE 0
    END;
    INSERT INTO public.founder_cycle_state (
      user_id, business_model, customer_count, recommended_loop, selected_loop,
      primary_goal, raise_active, weekly_capacity_hours, assignment_reason
    ) VALUES (
      v_user,
      p_answers->>'businessModel',
      v_customer_count,
      p_context->>'founderLoop',
      p_context->>'founderLoop',
      NULLIF(p_answers->>'primaryGoal', ''),
      COALESCE(p_context->>'founderLoop' = 'RAISE', false)
        OR COALESCE(p_answers->>'primaryGoal' = 'raise', false),
      NULLIF(p_answers->>'weeklyCapacityHours', '')::numeric,
      'Assigned from canonical onboarding session ' || p_session_id::text
    )
    ON CONFLICT (user_id) DO UPDATE SET
      business_model = EXCLUDED.business_model,
      customer_count = EXCLUDED.customer_count,
      recommended_loop = EXCLUDED.recommended_loop,
      selected_loop = EXCLUDED.selected_loop,
      primary_goal = EXCLUDED.primary_goal,
      raise_active = EXCLUDED.raise_active,
      weekly_capacity_hours = EXCLUDED.weekly_capacity_hours,
      assignment_reason = EXCLUDED.assignment_reason;
  END IF;

  INSERT INTO public.user_activity_log (
    user_id, activity_type, activity_data, page_path,
    source_tool, source_entity_type, source_entity_id, event_key
  ) VALUES (
    v_user,
    'onboarding_completed',
    jsonb_build_object(
      'onboarding_session_id', v_session.id,
      'flow_version', v_session.flow_version,
      'rollout_variant', v_session.rollout_variant,
      'plan', v_session.plan_snapshot,
      'device', v_session.device_snapshot,
      'assigned_stage', p_context->>'assignedStage',
      'founder_loop', p_context->>'founderLoop',
      'primary_goal', p_answers->>'primaryGoal',
      'blocker', p_answers->>'blocker',
      'activation_intent', p_context->>'selectedIntent',
      'recommendation_accepted', COALESCE((p_context->>'recommendationAccepted')::boolean, false),
      'data_completeness', p_context->>'dataCompleteness'
    ),
    '/onboarding',
    'onboarding',
    'onboarding_session',
    v_session.id::text,
    'onboarding:' || v_session.id::text || ':completed'
  )
  ON CONFLICT (user_id, event_key) DO NOTHING;

  RETURN v_session;
END;
$$;

-- ======================================================================
-- 20260925162000_investor_matching_preferences.sql
-- ======================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS investor_match_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS investment_stage text CHECK (investment_stage IN ('Pre-Seed','Seed','Series A','Series B','Series C+'));

-- Declared funding stage, not an inference from product maturity. Only opted-in
-- project summaries appear. All ranking happens before applying the limit.
CREATE OR REPLACE FUNCTION public.investor_matches(p_limit integer DEFAULT 30)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH me AS (
    SELECT role_profile FROM public.profiles
    WHERE id=auth.uid() AND user_type='investor' AND approval_status='approved'
  ), candidates AS (
    SELECT f.id, f.full_name, f.username, f.avatar_url, f.startup_industry, f.assigned_stage,
      f.investment_stage, pr.title, pr.idea_summary,
      (SELECT count(*)::int FROM unnest(f.startup_industry) s
        WHERE lower(btrim(s)) IN (SELECT lower(btrim(value)) FROM jsonb_array_elements_text(me.role_profile->'sectors'))) score
    FROM public.profiles f CROSS JOIN me
    JOIN LATERAL (SELECT title,idea_summary FROM public.projects
      WHERE user_id=f.id AND archived_at IS NULL ORDER BY created_at DESC,id LIMIT 1) pr ON true
    WHERE f.id<>auth.uid() AND f.user_type IN ('founder','builder') AND f.approval_status='approved'
      AND f.investor_match_visible
      AND f.investment_stage IN (SELECT jsonb_array_elements_text(me.role_profile->'stages'))
  ), ranked AS (
    SELECT * FROM candidates WHERE score>0 ORDER BY score DESC,COALESCE(full_name,username),id
    LIMIT least(greatest(COALESCE(p_limit,30),1),100)
  ) SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'userId',id,'name',COALESCE(full_name,username),'username',username,'avatar',avatar_url,
      'sectors',startup_industry,'stage',assigned_stage,'investmentStage',investment_stage,
      'projectTitle',title,'projectSummary',idea_summary,'score',score
    ) ORDER BY score DESC,COALESCE(full_name,username),id),'[]'::jsonb) FROM ranked;
$$;

-- Do not carry the old sector-only notification disclosure forward. The
-- existing delivery functions remain unchanged; its predicate is replaced
-- below with the same consent + sector + funding-stage requirements.

CREATE OR REPLACE FUNCTION public.account_onboarding_funnel(p_since timestamptz DEFAULT now()-interval '30 days')
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH cohort AS (
    SELECT s.*,COALESCE(NULLIF(s.answers->>'founderSegment',''),'unselected') account_type
    FROM public.onboarding_sessions s WHERE public.is_admin_user() AND s.started_at>=p_since
  ) SELECT COALESCE(jsonb_agg(row),'[]'::jsonb) FROM (
    SELECT jsonb_build_object('userType',account_type,'flowVersion',flow_version,
      'sessions',count(*),'completed',count(*) FILTER(WHERE status='completed'),
      'abandoned',count(*) FILTER(WHERE status='abandoned'),
      'workspaceEntered',count(*) FILTER(WHERE EXISTS(SELECT 1 FROM public.user_activity_log e
        WHERE e.user_id=c.user_id AND e.created_at>=c.started_at AND e.activity_type='workspace_entered')),
      'firstUsefulAction',count(*) FILTER(WHERE EXISTS(SELECT 1 FROM public.user_activity_log e
        WHERE e.user_id=c.user_id AND e.created_at>=c.started_at AND e.activity_type IN ('activation_completed','role_profile_saved','investor_match_opened'))),
      'classificationMismatch',count(*) FILTER(WHERE status='completed' AND EXISTS(SELECT 1 FROM public.profiles p
        WHERE p.id=c.user_id AND p.user_type<>c.account_type)),
      'approvedApplications',(SELECT count(*) FROM public.account_applications a WHERE a.user_type=c.account_type AND a.submitted_at>=p_since AND a.status='approved'),
      'pendingApplications',(SELECT count(*) FROM public.account_applications a WHERE a.user_type=c.account_type AND a.submitted_at>=p_since AND a.status='pending'),
      'averageReviewHours',(SELECT round(avg(extract(epoch FROM(a.reviewed_at-a.submitted_at))/3600),1) FROM public.account_applications a WHERE a.user_type=c.account_type AND a.submitted_at>=p_since AND a.reviewed_at IS NOT NULL)
    ) row FROM cohort c GROUP BY account_type,flow_version
  ) counts;
$$;
REVOKE ALL ON FUNCTION public.account_onboarding_funnel(timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.account_onboarding_funnel(timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.queue_investor_match_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_founder RECORD;
  v_investor RECORD;
BEGIN
  SELECT p.id, p.user_type, p.approval_status, p.investor_match_visible, p.investment_stage, COALESCE(p.startup_industry, '{}'::text[]) AS sectors,
         COALESCE(p.full_name, p.username, 'A founder') AS name
  INTO v_founder
  FROM public.profiles p WHERE p.id = NEW.user_id;

  IF NEW.archived_at IS NOT NULL OR NOT v_founder.investor_match_visible OR v_founder.investment_stage IS NULL OR v_founder.id IS NULL
     OR v_founder.user_type NOT IN ('founder', 'builder')
     OR v_founder.approval_status <> 'approved'
     OR cardinality(v_founder.sectors) = 0 THEN
    RETURN NEW;
  END IF;

  FOR v_investor IN
    SELECT p.id
    FROM public.profiles p
    WHERE p.user_type = 'investor'
      AND p.approval_status = 'approved'
      AND p.id <> v_founder.id
      AND v_founder.investment_stage IN (SELECT jsonb_array_elements_text(p.role_profile->'stages'))
      AND EXISTS (
        SELECT 1
        FROM unnest(v_founder.sectors) s
        WHERE lower(btrim(s)) IN (SELECT lower(btrim(value)) FROM jsonb_array_elements_text(p.role_profile->'sectors'))
      )
    LIMIT 50
  LOOP
    IF public.notif_pref_enabled(v_investor.id, 'investor_match_in_app_enabled') THEN
      PERFORM public.create_community_notification(
        v_investor.id,
        v_founder.id,
        'investor_match',
        NULL,
        NULL,
        jsonb_build_object(
          'route', '/investors/matches',
          'projectTitle', NEW.title,
          'message', v_founder.name || ' started a project in a sector you back.'
        )
      );
    END IF;

    PERFORM public.queue_account_activity_email(
      'investor_match',
      v_investor.id,
      v_founder.id,
      NEW.id::text,
      'investor_match_email_enabled',
      jsonb_build_object('founderName', v_founder.name, 'projectTitle', NEW.title)
    );
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[INVESTOR_MATCH] non-fatal notify failure project=% error=%', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.account_context()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT jsonb_build_object(
    'userType', COALESCE(p.user_type, 'founder'),
    'approvalStatus', COALESCE(p.approval_status, 'approved'),
    -- Founders and builders are always in. The other three need a decision.
    'hasCategoryAccess',
      COALESCE(p.user_type, 'founder') IN ('founder', 'builder')
      OR COALESCE(p.approval_status, 'approved') = 'approved',
    'investorMatchVisible', p.investor_match_visible,
    'investmentStage', p.investment_stage,
    'roleProfile', COALESCE(p.role_profile, '{}'::jsonb),
    'requiresProject', NOT public.is_service_provider(auth.uid()),
    'hasProject', EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.user_id = auth.uid() AND pr.archived_at IS NULL
    ),
    'startupName', NULLIF(btrim(p.startup_name), '')
  )
  FROM public.profiles p
  WHERE p.id = auth.uid();
$function$;

-- ======================================================================
-- 20260925163000_onboarding_drafts_and_reconciliation.sql
-- ======================================================================

-- Server drafts are monotonic even when a slow request arrives after a newer
-- answer. Completed sessions cannot be reopened by a late autosave.
CREATE OR REPLACE FUNCTION public.save_onboarding_progress_v1(p_session_id uuid,p_current_step integer,p_answer_patch jsonb)
RETURNS public.onboarding_sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_session public.onboarding_sessions; v_revision numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_current_step IS NULL OR p_current_step NOT BETWEEN 0 AND 20 OR p_answer_patch IS NULL
    OR jsonb_typeof(p_answer_patch)<>'object' OR octet_length(p_answer_patch::text)>20000 THEN
    RAISE EXCEPTION 'Invalid onboarding draft';
  END IF;
  IF length(COALESCE(p_answer_patch->>'startupBrief',''))>280 OR length(COALESCE(p_answer_patch->>'country',''))>100 THEN
    RAISE EXCEPTION 'Draft answer too long';
  END IF;
  SELECT * INTO v_session FROM public.onboarding_sessions WHERE id=p_session_id AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Onboarding session not found'; END IF;
  IF v_session.status='completed' THEN RETURN v_session; END IF;
  v_revision := COALESCE((p_answer_patch->>'_draftVersion')::numeric,extract(epoch FROM clock_timestamp())*1000);
  IF v_revision <= COALESCE((v_session.answers->>'_draftVersion')::numeric,0) THEN RETURN v_session; END IF;
  UPDATE public.onboarding_sessions SET current_step=p_current_step,
    answers=answers || p_answer_patch || jsonb_build_object('_draftVersion',v_revision),
    status='in_progress',abandoned_at=NULL
    WHERE id=p_session_id RETURNING * INTO v_session;
  RETURN v_session;
END $$;

-- Existing listing information is a suggestion, not a newly approved claim.
-- Leave missing fields visible for progressive completion; never overwrite
-- existing role answers or fabricate experience/capacity.
UPDATE public.profiles p SET role_profile=jsonb_build_object('expertise',(
  SELECT to_jsonb(ARRAY(SELECT DISTINCT left(btrim(x),60)
    FROM public.mentors m CROSS JOIN LATERAL unnest(m.expertise) x
    WHERE m.user_id=p.id AND btrim(x)<>'' ORDER BY 1 LIMIT 20))
)) WHERE p.user_type='mentor' AND p.role_profile='{}'::jsonb
  AND EXISTS(SELECT 1 FROM public.mentors m WHERE m.user_id=p.id AND cardinality(m.expertise)>0);

UPDATE public.profiles p SET role_profile=jsonb_build_object('services',(
  SELECT to_jsonb(ARRAY(SELECT DISTINCT left(btrim(s.name),60) FROM public.services s
    WHERE s.delivered_by_user_id=p.id AND s.is_active ORDER BY 1 LIMIT 20))
)) || CASE WHEN (SELECT count(DISTINCT category) FROM public.services WHERE delivered_by_user_id=p.id AND is_active)=1
  THEN jsonb_build_object('category',(SELECT min(category) FROM public.services WHERE delivered_by_user_id=p.id AND is_active)) ELSE '{}'::jsonb END
WHERE p.user_type='marketplace' AND p.role_profile='{}'::jsonb
  AND EXISTS(SELECT 1 FROM public.services WHERE delivered_by_user_id=p.id AND is_active);

-- Repair only the recent affected completion cohort, when the profile has not
-- been edited since completion and no existing active project could be
-- overwritten. Everything else remains available for deliberate review.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (p.id) p.id,s.id session_id,s.answers,s.completed_at
    FROM public.profiles p JOIN public.onboarding_sessions s ON s.user_id=p.id
    WHERE s.status='completed' AND s.flow_version='adaptive_v1' AND s.started_at>='2026-09-19'::timestamptz
      AND s.answers->>'founderSegment' IN ('founder','builder')
      AND p.user_type IN ('founder','builder') AND p.founder_segment IS NULL
      AND p.updated_at<=s.completed_at AND NULLIF(btrim(p.startup_name),'') IS NULL
      AND NOT EXISTS(SELECT 1 FROM public.projects WHERE user_id=p.id AND archived_at IS NULL)
    ORDER BY p.id,s.completed_at DESC
  LOOP
    UPDATE public.profiles SET user_type=r.answers->>'founderSegment',founder_segment=r.answers->>'founderSegment',
      startup_name=COALESCE(NULLIF(btrim(r.answers->>'projectName'),''),'Untitled idea') WHERE id=r.id;
    PERFORM public.ensure_active_project(r.id);
    INSERT INTO public.user_activity_log(user_id,activity_type,activity_data,event_key)
      VALUES(r.id,'onboarding_data_reconciled',jsonb_build_object('session_id',r.session_id,'repair_version',2),'onboarding-repair:'||r.session_id)
      ON CONFLICT(user_id,event_key) DO NOTHING;
  END LOOP;
END $$;

DELETE FROM public.daily_tasks t USING public.profiles p WHERE t.user_id=p.id
  AND p.user_type IN ('mentor','marketplace','investor') AND t.task_text='Complete your startup profile'
  AND t.task_source='platform' AND NOT COALESCE(t.is_completed,false);

COMMIT;
