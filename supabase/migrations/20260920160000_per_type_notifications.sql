-- Per type notifications.
--
-- Two pieces. First, notif_pref_enabled learns the three new channel pairs the
-- previous migration added columns for, so a toggle in settings actually
-- suppresses anything. Second, a mentor finally gets an in app notification
-- when a founder requests a discovery call: today they get an email and
-- nothing in the product, which is why the bell has never rung for them.

CREATE OR REPLACE FUNCTION public.notif_pref_enabled(p_user_id uuid, p_channel text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    CASE p_channel
      WHEN 'push_enabled' THEN (SELECT push_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'routine_reminders' THEN (SELECT routine_reminders FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'routine_in_app_enabled' THEN (SELECT routine_in_app_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'routine_email_enabled' THEN (SELECT routine_email_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'task_reminders' THEN (SELECT task_reminders FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'retention_emails' THEN (SELECT retention_emails FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'product_updates' THEN (SELECT product_updates FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'investor_updates' THEN (SELECT investor_updates FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'dm_email_enabled' THEN (SELECT dm_email_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'connection_request_email_enabled' THEN (SELECT connection_request_email_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'dm_push_enabled' THEN (SELECT dm_push_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'discovery_call_request_in_app_enabled' THEN (SELECT discovery_call_request_in_app_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'discovery_call_request_email_enabled' THEN (SELECT discovery_call_request_email_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'listing_enquiry_in_app_enabled' THEN (SELECT listing_enquiry_in_app_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'listing_enquiry_email_enabled' THEN (SELECT listing_enquiry_email_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'investor_match_in_app_enabled' THEN (SELECT investor_match_in_app_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'investor_match_email_enabled' THEN (SELECT investor_match_email_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      -- An unknown channel stays on. Silence is the worse failure: a missing
      -- row must never be read as "this person opted out".
      ELSE true
    END,
    true
  );
$$;

-- --------------------------------------------- mentor discovery call in app
CREATE OR REPLACE FUNCTION public.notify_mentor_of_discovery_call()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mentor_user uuid;
  v_mentor_name text;
BEGIN
  SELECT m.user_id, m.name INTO v_mentor_user, v_mentor_name
  FROM public.mentors m
  WHERE m.id = NEW.mentor_id;

  -- A mentor row with no account attached has nowhere to deliver to. The email
  -- outbox still covers that case.
  IF v_mentor_user IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.notif_pref_enabled(v_mentor_user, 'discovery_call_request_in_app_enabled') THEN
    RETURN NEW;
  END IF;

  PERFORM public.create_community_notification(
    v_mentor_user,
    NEW.founder_id,
    'discovery_call_request',
    NULL,
    NULL,
    jsonb_build_object(
      'route', '/mentor/bookings',
      'discovery_call_id', NEW.id,
      'mentor_name', v_mentor_name,
      'message', 'A founder requested a discovery call with you.'
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discovery_call_mentor_notification ON public.discovery_calls;
CREATE TRIGGER discovery_call_mentor_notification
  AFTER INSERT ON public.discovery_calls
  FOR EACH ROW
  WHEN (NEW.status = 'pending_mentor_response')
  EXECUTE FUNCTION public.notify_mentor_of_discovery_call();
