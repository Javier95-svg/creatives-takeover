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
