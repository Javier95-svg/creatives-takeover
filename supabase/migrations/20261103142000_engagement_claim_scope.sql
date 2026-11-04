-- Every optional engagement campaign is limited to confirmed founders and
-- builders with a quiz-assigned stage. Product updates share the same claim.
BEGIN;
CREATE OR REPLACE FUNCTION public.claim_account_engagement_email(
  p_user_id uuid, p_campaign text, p_action_key text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_profile record; v_preferences record; v_stage text; v_claim uuid;
BEGIN
  IF p_user_id IS NULL OR p_campaign NOT IN ('stage_guidance','product_update') THEN RETURN NULL; END IF;
  SELECT p.user_type,p.assigned_stage,u.email_confirmed_at
    INTO v_profile FROM public.profiles p JOIN auth.users u ON u.id=p.id
    WHERE p.id=p_user_id FOR UPDATE OF p;
  IF NOT FOUND OR v_profile.email_confirmed_at IS NULL
    OR v_profile.user_type NOT IN ('founder','builder')
    OR v_profile.assigned_stage NOT BETWEEN 1 AND 7 THEN RETURN NULL; END IF;
  SELECT * INTO v_preferences FROM public.notification_preferences WHERE user_id=p_user_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM public.retention_email_log WHERE user_id=p_user_id AND unsubscribed=true) THEN RETURN NULL; END IF;

  IF p_campaign='stage_guidance' THEN
    IF v_preferences.stage_guidance_emails IS DISTINCT FROM true
      OR v_preferences.stage_guidance_opted_in_at IS NULL THEN RETURN NULL; END IF;
    v_stage := (ARRAY['IDENTITY','PROTOTYPE','VALIDATING','BUILDING','LAUNCH','TRACTION','FUNDRAISING'])[v_profile.assigned_stage];
    IF p_action_key IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.daily_tasks t WHERE t.user_id=p_user_id
        AND t.recommendation_key=p_action_key
        AND t.recommendation_key LIKE 'stage:'||v_stage||':%'
        AND t.is_completed=false
    ) THEN RETURN NULL; END IF;
  ELSIF v_preferences.product_updates IS DISTINCT FROM true THEN
    RETURN NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.account_engagement_email_claims c
             WHERE c.user_id=p_user_id AND c.status IN ('pending','sent')
               AND c.claimed_at > now()-interval '14 days') THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM public.retention_email_log l
             WHERE l.user_id=p_user_id AND l.resend_id IS NOT NULL
               AND l.sequence NOT IN ('task_plan_digest','rooms_reply')
               AND l.sent_at > now()-interval '14 days') THEN RETURN NULL; END IF;

  INSERT INTO public.account_engagement_email_claims(user_id,campaign,action_key)
  VALUES(p_user_id,p_campaign,p_action_key) RETURNING id INTO v_claim;
  RETURN v_claim;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_account_engagement_email(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_account_engagement_email(uuid,text,text) TO service_role;
COMMIT;
