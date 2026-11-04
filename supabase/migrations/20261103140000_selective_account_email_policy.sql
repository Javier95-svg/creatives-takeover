-- Default nonessential account email to off. A row created under the old
-- default-on model is not evidence of an affirmative choice.
BEGIN;

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS stage_guidance_emails boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stage_guidance_opted_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS task_email_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rooms_reply_email_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.notification_preferences
  ALTER COLUMN retention_emails SET DEFAULT false,
  ALTER COLUMN product_updates SET DEFAULT false,
  ALTER COLUMN dm_email_enabled SET DEFAULT false,
  ALTER COLUMN connection_request_email_enabled SET DEFAULT false,
  ALTER COLUMN routine_email_enabled SET DEFAULT false,
  ALTER COLUMN investor_match_email_enabled SET DEFAULT false,
  ALTER COLUMN listing_enquiry_email_enabled SET DEFAULT false;

UPDATE public.notification_preferences SET
  retention_emails=false, product_updates=false,
  dm_email_enabled=false, connection_request_email_enabled=false,
  routine_email_enabled=false, investor_match_email_enabled=false,
  listing_enquiry_email_enabled=false,
  stage_guidance_emails=false, stage_guidance_opted_in_at=NULL,
  task_email_enabled=false, rooms_reply_email_enabled=false;

CREATE OR REPLACE FUNCTION public.stamp_stage_guidance_email_choice()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.stage_guidance_emails THEN
    IF TG_OP='INSERT' OR OLD.stage_guidance_emails IS DISTINCT FROM true THEN
      NEW.stage_guidance_opted_in_at := now();
    ELSE
      NEW.stage_guidance_opted_in_at := OLD.stage_guidance_opted_in_at;
    END IF;
  ELSE
    NEW.stage_guidance_opted_in_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS stamp_stage_guidance_email_choice ON public.notification_preferences;
CREATE TRIGGER stamp_stage_guidance_email_choice
  BEFORE INSERT OR UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.stamp_stage_guidance_email_choice();

-- An unchecked signup choice sends no metadata. Only a checked choice creates
-- a preference row. Confirmed identity and role/stage are checked again at send.
CREATE OR REPLACE FUNCTION public.record_signup_stage_email_choice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'stage_guidance_email_opt_in'='true' THEN
    INSERT INTO public.notification_preferences(user_id,stage_guidance_emails)
    VALUES(NEW.id,true)
    ON CONFLICT(user_id) DO UPDATE SET stage_guidance_emails=true;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS record_signup_stage_email_choice ON auth.users;
CREATE TRIGGER record_signup_stage_email_choice
  AFTER INSERT ON auth.users FOR EACH ROW
  EXECUTE FUNCTION public.record_signup_stage_email_choice();

-- Existing per-channel gates must fail closed for missing preference rows.
-- The other channels keep their existing defaults and in-app behavior.
CREATE OR REPLACE FUNCTION public.notif_pref_enabled(p_user_id uuid, p_channel text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE(
    CASE p_channel
      WHEN 'push_enabled' THEN (SELECT push_enabled FROM public.notification_preferences WHERE user_id=p_user_id)
      WHEN 'routine_reminders' THEN (SELECT routine_reminders FROM public.notification_preferences WHERE user_id=p_user_id)
      WHEN 'routine_in_app_enabled' THEN (SELECT routine_in_app_enabled FROM public.notification_preferences WHERE user_id=p_user_id)
      WHEN 'routine_email_enabled' THEN (SELECT routine_email_enabled FROM public.notification_preferences WHERE user_id=p_user_id)
      WHEN 'task_reminders' THEN (SELECT task_reminders FROM public.notification_preferences WHERE user_id=p_user_id)
      WHEN 'task_email_enabled' THEN (SELECT task_email_enabled FROM public.notification_preferences WHERE user_id=p_user_id)
      WHEN 'daily_task_plan_email_enabled' THEN (SELECT daily_task_plan_email_enabled FROM public.notification_preferences WHERE user_id=p_user_id)
      WHEN 'stage_guidance_emails' THEN (SELECT stage_guidance_emails FROM public.notification_preferences WHERE user_id=p_user_id)
      WHEN 'retention_emails' THEN (SELECT retention_emails FROM public.notification_preferences WHERE user_id=p_user_id)
      WHEN 'rooms_reply_email_enabled' THEN (SELECT rooms_reply_email_enabled FROM public.notification_preferences WHERE user_id=p_user_id)
      WHEN 'product_updates' THEN (SELECT product_updates FROM public.notification_preferences WHERE user_id=p_user_id)
      WHEN 'investor_updates' THEN (SELECT investor_updates FROM public.notification_preferences WHERE user_id=p_user_id)
      WHEN 'dm_email_enabled' THEN (SELECT dm_email_enabled FROM public.notification_preferences WHERE user_id=p_user_id)
      WHEN 'connection_request_email_enabled' THEN (SELECT connection_request_email_enabled FROM public.notification_preferences WHERE user_id=p_user_id)
      WHEN 'dm_push_enabled' THEN (SELECT dm_push_enabled FROM public.notification_preferences WHERE user_id=p_user_id)
      WHEN 'discovery_call_request_in_app_enabled' THEN (SELECT discovery_call_request_in_app_enabled FROM public.notification_preferences WHERE user_id=p_user_id)
      WHEN 'discovery_call_request_email_enabled' THEN (SELECT discovery_call_request_email_enabled FROM public.notification_preferences WHERE user_id=p_user_id)
      WHEN 'listing_enquiry_in_app_enabled' THEN (SELECT listing_enquiry_in_app_enabled FROM public.notification_preferences WHERE user_id=p_user_id)
      WHEN 'listing_enquiry_email_enabled' THEN (SELECT listing_enquiry_email_enabled FROM public.notification_preferences WHERE user_id=p_user_id)
      WHEN 'investor_match_in_app_enabled' THEN (SELECT investor_match_in_app_enabled FROM public.notification_preferences WHERE user_id=p_user_id)
      WHEN 'investor_match_email_enabled' THEN (SELECT investor_match_email_enabled FROM public.notification_preferences WHERE user_id=p_user_id)
      ELSE true
    END,
    CASE WHEN p_channel=ANY(ARRAY[
      'routine_email_enabled','task_email_enabled','daily_task_plan_email_enabled',
      'stage_guidance_emails','retention_emails','rooms_reply_email_enabled',
      'product_updates','dm_email_enabled','connection_request_email_enabled',
      'listing_enquiry_email_enabled','investor_match_email_enabled'
    ]) THEN false ELSE true END
  );
$$;

CREATE TABLE IF NOT EXISTS public.account_engagement_email_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign text NOT NULL CHECK (campaign IN ('stage_guidance','product_update')),
  action_key text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  resend_id text
);
CREATE INDEX IF NOT EXISTS account_engagement_email_claims_user_time_idx
  ON public.account_engagement_email_claims(user_id,claimed_at DESC);
ALTER TABLE public.account_engagement_email_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_engagement_email_claims FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE ON public.account_engagement_email_claims TO service_role;

-- A per-user profile row lock serializes claims from concurrent jobs. A
-- pending claim blocks retries until manually reconciled, avoiding duplicates
-- when Resend accepted an email but the worker died before finalization.
CREATE OR REPLACE FUNCTION public.claim_account_engagement_email(
  p_user_id uuid, p_campaign text, p_action_key text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_profile record; v_preferences record; v_stage text; v_claim uuid;
BEGIN
  IF p_user_id IS NULL OR p_campaign NOT IN ('stage_guidance','product_update') THEN RETURN NULL; END IF;
  SELECT p.user_type,p.assigned_stage,u.email_confirmed_at
    INTO v_profile FROM public.profiles p JOIN auth.users u ON u.id=p.id
    WHERE p.id=p_user_id FOR UPDATE OF p;
  IF NOT FOUND OR v_profile.email_confirmed_at IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v_preferences FROM public.notification_preferences WHERE user_id=p_user_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM public.retention_email_log WHERE user_id=p_user_id AND unsubscribed=true) THEN RETURN NULL; END IF;

  IF p_campaign='stage_guidance' THEN
    IF v_profile.user_type NOT IN ('founder','builder')
      OR v_profile.assigned_stage NOT BETWEEN 1 AND 7
      OR v_preferences.stage_guidance_emails IS DISTINCT FROM true
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

CREATE OR REPLACE FUNCTION public.finish_account_engagement_email(
  p_claim_id uuid, p_resend_id text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.account_engagement_email_claims
  SET status=CASE WHEN p_resend_id IS NULL THEN 'failed' ELSE 'sent' END,
      resend_id=p_resend_id, finished_at=now()
  WHERE id=p_claim_id AND status='pending';
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_account_engagement_email(uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finish_account_engagement_email(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_account_engagement_email(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_account_engagement_email(uuid,text) TO service_role;

-- The daily plan is a separate affirmative choice, so the retired generic
-- retention flag must not silently enable or disable it. Other account types
-- continue to get their in-app plan, but never this founder-focused email.
CREATE OR REPLACE FUNCTION public.dispatch_daily_task_plan_digests_v1(p_limit integer DEFAULT 500)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  r record; v_url text:=(SELECT value FROM private.service_config WHERE key='supabase_url');
  v_key text:=(SELECT value FROM private.service_config WHERE key='supabase_service_key');
  v_count integer:=0;
BEGIN
  FOR r IN
    SELECT plan.id plan_id,plan.user_id,plan.plan_date,au.email,p.full_name,p.user_type,
      (SELECT t.task_text FROM public.daily_task_plan_items i JOIN public.daily_tasks t ON t.id=i.task_id
       WHERE i.plan_id=plan.id ORDER BY i.rank LIMIT 1) first_task
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

    IF r.user_type IN ('founder','builder') AND r.email IS NOT NULL
      AND v_url IS NOT NULL AND v_key IS NOT NULL
      AND public.notif_pref_enabled(r.user_id,'daily_task_plan_email_enabled') THEN
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
REVOKE ALL ON FUNCTION public.dispatch_daily_task_plan_digests_v1(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_daily_task_plan_digests_v1(integer) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
