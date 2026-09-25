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
