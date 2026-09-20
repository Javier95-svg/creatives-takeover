-- Close the four gaps left by the per type personalization work.
--
-- 1. The role fields are collected before the application is submitted, so
--    submit_account_application has to store them in the same statement.
-- 2. The mentor bookings inbox needs the pending round and its slots to be able
--    to offer accept and decline rather than only display a status.
-- 3. The three new *_email_enabled toggles gated nothing: no sender consulted
--    them. The discovery call request email now does, and the two channels that
--    had no sender at all get one.
-- 4. A listing enquiry and an investor match now produce a real notification
--    instead of only appearing retroactively on a page nobody is told to visit.

-- ------------------------------------------------- 1. role profile at submit
-- Dropped rather than overloaded: a three argument call would otherwise be
-- ambiguous between the old signature and the new one with a default.
DROP FUNCTION IF EXISTS public.submit_account_application(text, text, text);

CREATE OR REPLACE FUNCTION public.submit_account_application(
  p_user_type text,
  p_full_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_role_profile jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_application_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in to send this request';
  END IF;

  IF p_user_type NOT IN ('mentor', 'marketplace', 'investor') THEN
    RAISE EXCEPTION 'Only mentor, marketplace and investor requests are reviewed';
  END IF;

  UPDATE public.profiles
  SET user_type = p_user_type,
      approval_status = 'pending',
      onboarding_completed = true,
      quiz_completed = true,
      -- An empty object never overwrites answers already saved, so resubmitting
      -- cannot blank a profile that was filled in from the account page.
      role_profile = CASE
        WHEN p_role_profile IS NULL OR p_role_profile = '{}'::jsonb
          THEN COALESCE(role_profile, '{}'::jsonb)
        ELSE p_role_profile
      END,
      user_preferences = COALESCE(user_preferences, '{}'::jsonb) - 'requires_guided_onboarding',
      updated_at = now()
  WHERE id = v_user;

  INSERT INTO public.account_applications (user_id, user_type, full_name, email)
  VALUES (
    v_user,
    p_user_type,
    NULLIF(btrim(COALESCE(p_full_name, '')), ''),
    NULLIF(btrim(COALESCE(p_email, '')), '')
  )
  ON CONFLICT (user_id) WHERE status = 'pending' DO NOTHING
  RETURNING id INTO v_application_id;

  RETURN jsonb_build_object('applicationId', v_application_id, 'userType', p_user_type);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.submit_account_application(text, text, text, jsonb) TO authenticated;

-- -------------------------------------------- 2. bookings inbox can respond
-- Adds the open round and its proposed slots. Without them the page can show a
-- status but cannot offer a decision, which is what "My bookings" implies.
CREATE OR REPLACE FUNCTION public.mentor_bookings(p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'createdAt' DESC), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', c.id,
      'status', c.status,
      'scheduledFor', c.scheduled_for,
      'createdAt', c.created_at,
      'founderName', COALESCE(p.full_name, p.username),
      'founderUsername', p.username,
      'founderAvatar', p.avatar_url,
      'serviceId', c.service_id,
      'roundId', r.id,
      'responseDueAt', r.response_due_at,
      'slots', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', s.id,
          'startsAt', s.starts_at,
          'durationMinutes', s.duration_minutes,
          'timezone', s.proposed_timezone
        ) ORDER BY s.ordinal)
        FROM public.discovery_call_scheduling_slots s
        WHERE s.round_id = r.id
      ), '[]'::jsonb)
    ) AS row
    FROM public.discovery_calls c
    JOIN public.mentors m ON m.id = c.mentor_id AND m.user_id = auth.uid()
    LEFT JOIN public.profiles p ON p.id = c.founder_id
    -- The round the mentor is being asked to answer, if there is one.
    LEFT JOIN LATERAL (
      SELECT r2.id, r2.response_due_at
      FROM public.discovery_call_scheduling_rounds r2
      WHERE r2.discovery_call_id = c.id
        AND r2.status = 'pending'
        AND r2.responder_role = 'mentor'
      ORDER BY r2.created_at DESC
      LIMIT 1
    ) r ON true
    WHERE auth.uid() IS NOT NULL
    ORDER BY c.created_at DESC
    LIMIT GREATEST(p_limit, 1)
  ) rows;
$function$;

-- --------------------------------------- 3. the discovery call email toggle
-- Gated at the enqueue rather than inside the transition function, which is
-- long, load bearing and shared by every template. Only the request itself is
-- suppressible: a confirmation, a reschedule or a cancellation is transactional
-- and must reach the mentor whatever their preferences say.
CREATE OR REPLACE FUNCTION public.enqueue_discovery_call_notification_v2(
  p_event_id bigint,
  p_discovery_call_id uuid,
  p_template_key text,
  p_recipient_role text,
  p_recipient_email text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_secure_token_ciphertext text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_id uuid;
  v_mentor_user uuid;
BEGIN
  IF p_recipient_role NOT IN ('founder', 'mentor', 'admin')
     OR NULLIF(lower(btrim(COALESCE(p_recipient_email, ''))), '') IS NULL THEN
    RAISE EXCEPTION 'A valid notification role and email are required';
  END IF;

  IF p_recipient_role = 'mentor' AND p_template_key = 'request_created' THEN
    SELECT m.user_id INTO v_mentor_user
    FROM public.discovery_calls c
    JOIN public.mentors m ON m.id = c.mentor_id
    WHERE c.id = p_discovery_call_id;

    -- A mentor with no account has no preferences to honour, so they still get
    -- the email; it is the only way they hear about the request at all.
    IF v_mentor_user IS NOT NULL
       AND NOT public.notif_pref_enabled(v_mentor_user, 'discovery_call_request_email_enabled') THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO public.discovery_call_notification_outbox (
    event_id, discovery_call_id, template_key, recipient_role,
    recipient_email, payload, secure_token_ciphertext
  ) VALUES (
    p_event_id, p_discovery_call_id, p_template_key, p_recipient_role,
    lower(btrim(p_recipient_email)), COALESCE(p_payload, '{}'::jsonb),
    p_secure_token_ciphertext
  )
  ON CONFLICT (event_id, template_key, recipient_role, recipient_email)
  DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id
    FROM public.discovery_call_notification_outbox
    WHERE event_id = p_event_id
      AND template_key = p_template_key
      AND recipient_role = p_recipient_role
      AND recipient_email = lower(btrim(p_recipient_email));
  END IF;

  RETURN v_id;
END;
$function$;

-- ------------------------------------- 4. one outbox for the two new emails
-- Modelled on connection_request_email_notifications. One table and one edge
-- function serve both channels rather than a parallel pipeline per channel.
CREATE TABLE IF NOT EXISTS public.account_activity_email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('listing_enquiry', 'investor_match')),
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped')),
  net_request_id bigint,
  resend_email_id text,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_activity_email_unique UNIQUE (kind, recipient_id, subject_id)
);

CREATE INDEX IF NOT EXISTS account_activity_email_status_created_idx
  ON public.account_activity_email_notifications(status, created_at DESC);

ALTER TABLE public.account_activity_email_notifications ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS account_activity_email_set_updated_at ON public.account_activity_email_notifications;
CREATE TRIGGER account_activity_email_set_updated_at
BEFORE UPDATE ON public.account_activity_email_notifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Shared dispatch. Queues a row, honours the preference, and posts to the edge
-- function. Never raises: a notification must not be able to fail the action
-- that caused it.
CREATE OR REPLACE FUNCTION public.queue_account_activity_email(
  p_kind text,
  p_recipient uuid,
  p_actor uuid,
  p_subject_id text,
  p_channel text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_delivery_id uuid;
  v_request_id bigint;
  v_url text := (SELECT value FROM private.service_config WHERE key = 'supabase_url');
  v_service_key text := (SELECT value FROM private.service_config WHERE key = 'supabase_service_key');
  v_enabled boolean := public.notif_pref_enabled(p_recipient, p_channel);
BEGIN
  IF p_recipient IS NULL OR p_recipient = p_actor THEN
    RETURN;
  END IF;

  INSERT INTO public.account_activity_email_notifications (
    kind, recipient_id, actor_id, subject_id, status, metadata
  ) VALUES (
    p_kind, p_recipient, p_actor, p_subject_id,
    CASE WHEN v_enabled THEN 'pending' ELSE 'skipped' END,
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('queued_at_iso', now()::text)
  )
  ON CONFLICT (kind, recipient_id, subject_id) DO NOTHING
  RETURNING id INTO v_delivery_id;

  IF v_delivery_id IS NULL OR NOT v_enabled THEN
    RETURN;
  END IF;

  IF v_url IS NULL OR v_service_key IS NULL THEN
    UPDATE public.account_activity_email_notifications
    SET status = 'failed', last_error = 'private.service_config missing supabase_url or supabase_service_key'
    WHERE id = v_delivery_id;
    RETURN;
  END IF;

  -- In flight before dispatch: pg_net can reach the function before this
  -- transaction receives its request id, and the function's terminal state wins.
  UPDATE public.account_activity_email_notifications
  SET status = 'sending'
  WHERE id = v_delivery_id;

  SELECT net.http_post(
    url := v_url || '/functions/v1/send-account-activity-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object('deliveryId', v_delivery_id)
  ) INTO v_request_id;

  UPDATE public.account_activity_email_notifications
  SET net_request_id = v_request_id
  WHERE id = v_delivery_id;
EXCEPTION WHEN OTHERS THEN
  UPDATE public.account_activity_email_notifications
  SET status = 'failed', last_error = SQLERRM
  WHERE kind = p_kind AND recipient_id = p_recipient AND subject_id = p_subject_id;
  RAISE LOG '[ACCOUNT_ACTIVITY_EMAIL] non-fatal queue failure kind=% recipient=% error=%', p_kind, p_recipient, SQLERRM;
END;
$function$;

-- ------------------------------------------------------ listing enquiries
CREATE OR REPLACE FUNCTION public.queue_listing_enquiry_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_type text;
  v_actor_name text;
BEGIN
  IF NEW.counterparty_user_id IS NULL OR NEW.counterparty_user_id = NEW.actor_user_id THEN
    RETURN NEW;
  END IF;

  SELECT p.user_type INTO v_type FROM public.profiles p WHERE p.id = NEW.counterparty_user_id;
  -- Only a marketplace member has listing enquiries. Everyone else already gets
  -- the message or connection notification for the same event.
  IF v_type IS DISTINCT FROM 'marketplace' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.full_name, p.username, 'Someone') INTO v_actor_name
  FROM public.profiles p WHERE p.id = NEW.actor_user_id;

  IF public.notif_pref_enabled(NEW.counterparty_user_id, 'listing_enquiry_in_app_enabled') THEN
    PERFORM public.create_community_notification(
      NEW.counterparty_user_id,
      NEW.actor_user_id,
      'listing_enquiry',
      NULL,
      NULL,
      jsonb_build_object(
        'route', '/marketplace/enquiries',
        'interaction', NEW.interaction_type,
        'message', v_actor_name || ' asked about your services.'
      )
    );
  END IF;

  PERFORM public.queue_account_activity_email(
    'listing_enquiry',
    NEW.counterparty_user_id,
    NEW.actor_user_id,
    NEW.id::text,
    'listing_enquiry_email_enabled',
    jsonb_build_object('actorName', v_actor_name, 'interaction', NEW.interaction_type)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[LISTING_ENQUIRY] non-fatal notify failure event=% error=%', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS social_interaction_events_listing_enquiry ON public.social_interaction_events;
CREATE TRIGGER social_interaction_events_listing_enquiry
AFTER INSERT ON public.social_interaction_events
FOR EACH ROW EXECUTE FUNCTION public.queue_listing_enquiry_notification();

-- -------------------------------------------------------- investor matches
-- A new project by a founder whose sectors an investor backs is the moment a
-- match comes into existence, so that is what notifies. Capped, because an
-- investor with broad sectors must not be buried.
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
  SELECT p.id, p.user_type, p.approval_status, COALESCE(p.startup_industry, '{}'::text[]) AS sectors,
         COALESCE(p.full_name, p.username, 'A founder') AS name
  INTO v_founder
  FROM public.profiles p WHERE p.id = NEW.user_id;

  IF v_founder.id IS NULL
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
      AND EXISTS (
        SELECT 1
        FROM unnest(v_founder.sectors) s
        WHERE s = ANY (ARRAY(SELECT jsonb_array_elements_text(p.role_profile->'sectors')))
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

DROP TRIGGER IF EXISTS projects_queue_investor_match ON public.projects;
CREATE TRIGGER projects_queue_investor_match
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.queue_investor_match_notifications();
