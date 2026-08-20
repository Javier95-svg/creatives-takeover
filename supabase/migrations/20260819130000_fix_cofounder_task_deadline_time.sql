-- Make co-founder dashboard tasks correct, and make them unable to block the
-- user action they hang off.
--
-- Two separate defects, fixed together because the first is only the current
-- symptom of the second.
--
-- 1. public.daily_tasks.deadline_time was made NOT NULL (with no DEFAULT) by
--    20260308110000_task_deadline_expiry_notifications.sql. Four functions
--    written afterwards insert into daily_tasks without it, so each raises
--    23502 and aborts the statement that reached it:
--
--      sync_onboarding_cofounder_task            -> aborts complete_onboarding_v1,
--        hard-blocking onboarding for any founder whose blocker is 'team' or
--        'accountability' and who answers 'actively_looking'. The founder is
--        stuck on the last step with no way forward; retrying always re-fails.
--      sync_cofounder_marketplace_dashboard_task_v1 -> aborts publishing a listing.
--      sync_cofounder_interest_dashboard_task_v1    -> aborts sending interest.
--      nudge_cofounder_listing_expiry_v1            -> aborts the scheduled expiry
--        sweep, so listing-expiry reminders never go out at all.
--
--    Each insert now derives its deadline from its own task_date using the
--    end-of-day UTC convention the 20260308110000 backfill established.
--
-- 2. A dashboard task is a convenience. It must never be able to abort the
--    thing that triggered it -- least of all account setup. Every daily_tasks
--    insert below now runs in its own subtransaction and degrades to a WARNING,
--    so the next schema change of this kind costs us a missing task instead of
--    a founder who cannot create an account. The warnings keep it visible in
--    the Postgres logs rather than silently swallowed.

CREATE OR REPLACE FUNCTION public.sync_onboarding_cofounder_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_situation text := NEW.user_preferences->>'cofounderSituation';
  v_task_date date := current_date;
BEGIN
  -- Character classes instead of the original shorthand digit escapes: this
  -- file is expected to be pasted into the Supabase SQL editor, which eats
  -- literal backslashes. Same ISO yyyy-mm-dd match, no escapes to lose.
  IF COALESCE(NEW.user_preferences->>'onboardingLocalDate', '')
      ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    v_task_date := (NEW.user_preferences->>'onboardingLocalDate')::date;
  END IF;

  IF v_situation = 'actively_looking' THEN
    BEGIN
      INSERT INTO public.daily_tasks (
        user_id,
        task_text,
        task_description,
        task_date,
        deadline_time,
        task_source,
        priority,
        source_tool,
        source_route,
        intent_type,
        recommendation_key,
        recommendation_reason,
        recommendation_status,
        effort_estimate,
        business_impact_score,
        stage_alignment_score,
        ai_generated,
        is_foundational,
        is_completed
      )
      SELECT
        NEW.id,
        'Find a co-founder',
        'Create a co-founder post and start meeting potential partners. Publishing costs 5 credits.',
        v_task_date,
        ((v_task_date::text || ' 23:59:00+00')::timestamptz),
        'platform',
        'high',
        'find_cofounder',
        '/co-founder',
        'accountability',
        'onboarding:find_cofounder',
        'You told us you are actively looking for a co-founder.',
        'accepted',
        10,
        8,
        8,
        false,
        false,
        false
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.daily_tasks existing
        WHERE existing.user_id = NEW.id
          AND existing.recommendation_key = 'onboarding:find_cofounder'
      );
    EXCEPTION WHEN OTHERS THEN
      -- Never block onboarding for a convenience task.
      RAISE WARNING
        'sync_onboarding_cofounder_task: skipped co-founder task for user % (%): %',
        NEW.id, SQLSTATE, SQLERRM;
    END;
  ELSIF v_situation = 'solo_ok' THEN
    UPDATE public.daily_tasks
    SET
      recommendation_status = 'dismissed',
      dismissed_at = COALESCE(dismissed_at, now()),
      updated_at = now()
    WHERE user_id = NEW.id
      AND recommendation_key = 'onboarding:find_cofounder'
      AND COALESCE(is_completed, false) = false;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_cofounder_marketplace_dashboard_task_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;
  BEGIN
    INSERT INTO public.daily_tasks(user_id,task_text,task_description,task_date,deadline_time,task_source,priority,source_tool,source_route,intent_type,recommendation_key,recommendation_reason,recommendation_status,effort_estimate,business_impact_score,stage_alignment_score,ai_generated,is_foundational,is_completed)
    SELECT NEW.user_id,'Review your co-founder matches','Your listing is live. Review compatible founders and send one thoughtful interest request.',current_date,((current_date::text || ' 23:59:00+00')::timestamptz),'platform','high','find_cofounder','/co-founder?tab=recommended','accountability','cofounder:review_matches:'||NEW.id,'A live listing becomes useful when you start a qualified conversation.','accepted',10,8,8,false,false,false
    WHERE NOT EXISTS(SELECT 1 FROM public.daily_tasks WHERE user_id=NEW.user_id AND recommendation_key='cofounder:review_matches:'||NEW.id AND COALESCE(is_completed,false)=false);
  EXCEPTION WHEN OTHERS THEN
    -- A missing dashboard task must not roll back the founder's listing.
    RAISE WARNING 'sync_cofounder_marketplace_dashboard_task_v1: skipped task for listing % (%): %', NEW.id, SQLSTATE, SQLERRM;
  END;
  INSERT INTO public.community_notifications(user_id,actor_id,notification_type,metadata)
  SELECT candidate.user_id,NEW.user_id,'cofounder_match_available',jsonb_build_object('listingId',NEW.id,'route','/co-founder?tab=recommended','message','A new compatible co-founder listing is available')
  FROM (
    SELECT DISTINCT profile.id user_id
    FROM public.profiles profile
    LEFT JOIN public.cofounder_posts own ON own.user_id=profile.id AND own.status='active' AND own.expires_at>now()
    WHERE profile.id<>NEW.user_id AND COALESCE(profile.profile_completion_percentage,0)>=60
      AND (profile.user_preferences->>'cofounderSituation'='actively_looking' OR own.id IS NOT NULL)
      AND (own.id IS NULL OR own.skills_sought&&NEW.skills_offered OR own.skills_offered&&NEW.skills_sought OR own.industries&&NEW.industries)
      AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE (b.blocker_id=profile.id AND b.blocked_id=NEW.user_id) OR (b.blocker_id=NEW.user_id AND b.blocked_id=profile.id))
      AND NOT EXISTS(SELECT 1 FROM public.community_notifications n WHERE n.user_id=profile.id AND n.notification_type='cofounder_match_available' AND n.metadata->>'listingId'=NEW.id::text)
    ORDER BY profile.id LIMIT 50
  ) candidate;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_cofounder_interest_dashboard_task_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  BEGIN
    INSERT INTO public.daily_tasks(user_id,task_text,task_description,task_date,deadline_time,task_source,priority,source_tool,source_route,intent_type,recommendation_key,recommendation_reason,recommendation_status,effort_estimate,business_impact_score,stage_alignment_score,ai_generated,is_foundational,is_completed)
    VALUES(NEW.recipient_id,'Respond to co-founder interest','A founder sent a qualified request about your listing.',current_date,((current_date::text || ' 23:59:00+00')::timestamptz),'platform','high','find_cofounder','/co-founder?tab=requests','follow_up','cofounder:respond_interest:'||NEW.id,'A human response is waiting.','accepted',5,9,8,false,false,false);
  EXCEPTION WHEN OTHERS THEN
    -- The interest request itself matters more than the recipient's reminder.
    RAISE WARNING 'sync_cofounder_interest_dashboard_task_v1: skipped task for interest % (%): %', NEW.id, SQLSTATE, SQLERRM;
  END;
  UPDATE public.daily_tasks SET is_completed=true,completed_at=COALESCE(completed_at,now()),updated_at=now()
  WHERE user_id=NEW.sender_id AND recommendation_key LIKE 'cofounder:review_matches:%' AND COALESCE(is_completed,false)=false;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.nudge_cofounder_listing_expiry_v1()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_count integer:=0;
BEGIN
  INSERT INTO public.community_notifications(user_id,actor_id,notification_type,metadata)
  SELECT p.user_id,p.user_id,'cofounder_listing_expiring',jsonb_build_object('listingId',p.id,'daysRemaining',(p.expires_at::date-current_date),'route','/co-founder?tab=mine','message','Your co-founder listing expires soon')
  FROM public.cofounder_posts p
  WHERE p.status='active' AND p.expires_at::date-current_date IN (7,1)
    AND NOT EXISTS(SELECT 1 FROM public.community_notifications n WHERE n.user_id=p.user_id AND n.notification_type='cofounder_listing_expiring' AND n.metadata->>'listingId'=p.id::text AND n.metadata->>'daysRemaining'=(p.expires_at::date-current_date)::text);
  GET DIAGNOSTICS v_count=ROW_COUNT;
  BEGIN
    INSERT INTO public.daily_tasks(user_id,task_text,task_description,task_date,deadline_time,task_source,priority,source_tool,source_route,intent_type,recommendation_key,recommendation_reason,recommendation_status,effort_estimate,business_impact_score,stage_alignment_score,ai_generated,is_foundational,is_completed)
    SELECT p.user_id,'Renew or pause your co-founder listing','Your listing expires soon. Renew for 5 credits or pause it if you are no longer looking.',current_date,((current_date::text || ' 23:59:00+00')::timestamptz),'platform','medium','find_cofounder','/co-founder?tab=mine','follow_up','cofounder:listing_expiry:'||p.id,'Keep marketplace availability accurate.','accepted',5,6,6,false,false,false
    FROM public.cofounder_posts p WHERE p.status='active' AND p.expires_at::date-current_date=1
      AND NOT EXISTS(SELECT 1 FROM public.daily_tasks t WHERE t.user_id=p.user_id AND t.recommendation_key='cofounder:listing_expiry:'||p.id AND COALESCE(t.is_completed,false)=false);
  EXCEPTION WHEN OTHERS THEN
    -- One bad task must not abort the whole scheduled sweep.
    RAISE WARNING 'nudge_cofounder_listing_expiry_v1: skipped expiry tasks (%): %', SQLSTATE, SQLERRM;
  END;
  RETURN v_count;
END; $$;

REVOKE ALL ON FUNCTION public.sync_onboarding_cofounder_task() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_cofounder_marketplace_dashboard_task_v1() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_cofounder_interest_dashboard_task_v1() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.nudge_cofounder_listing_expiry_v1() FROM PUBLIC, anon, authenticated;

-- Fail loudly at apply time if any of these inserts loses the column again.
DO $$
DECLARE
  v_missing text[];
BEGIN
  SELECT array_agg(p.proname ORDER BY p.proname)
  INTO v_missing
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'sync_onboarding_cofounder_task',
      'sync_cofounder_marketplace_dashboard_task_v1',
      'sync_cofounder_interest_dashboard_task_v1',
      'nudge_cofounder_listing_expiry_v1'
    )
    AND p.prosrc LIKE '%daily_tasks%'
    AND p.prosrc NOT LIKE '%deadline_time%';

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION
      'These daily_tasks inserts still omit the NOT NULL deadline_time column: %',
      array_to_string(v_missing, ', ');
  END IF;
END
$$;
