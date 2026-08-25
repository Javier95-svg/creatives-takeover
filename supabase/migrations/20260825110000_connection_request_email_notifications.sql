-- Deliver a durable email notification whenever a founder receives a connection request.
-- The request itself is never blocked by a delivery failure.

CREATE EXTENSION IF NOT EXISTS pg_net;

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS connection_request_email_enabled boolean NOT NULL DEFAULT true;

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
      ELSE true
    END,
    true
  );
$$;

CREATE TABLE IF NOT EXISTS public.connection_request_email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  friend_request_id uuid NOT NULL REFERENCES public.friend_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped')),
  net_request_id bigint,
  resend_email_id text,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT connection_request_email_notifications_unique_request_recipient UNIQUE (friend_request_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS connection_request_email_notifications_status_created_idx
  ON public.connection_request_email_notifications(status, created_at DESC);

ALTER TABLE public.connection_request_email_notifications ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS connection_request_email_notifications_set_updated_at ON public.connection_request_email_notifications;
CREATE TRIGGER connection_request_email_notifications_set_updated_at
BEFORE UPDATE ON public.connection_request_email_notifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.queue_connection_request_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery_id uuid;
  v_request_id bigint;
  v_url text := (SELECT value FROM private.service_config WHERE key = 'supabase_url');
  v_service_key text := (SELECT value FROM private.service_config WHERE key = 'supabase_service_key');
BEGIN
  IF NEW.status <> 'pending' OR NEW.sender_id = NEW.receiver_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.connection_request_email_notifications (
    friend_request_id, sender_id, recipient_id, status, metadata
  ) VALUES (
    NEW.id,
    NEW.sender_id,
    NEW.receiver_id,
    CASE WHEN public.notif_pref_enabled(NEW.receiver_id, 'connection_request_email_enabled') THEN 'pending' ELSE 'skipped' END,
    jsonb_build_object('source', 'friend_requests_trigger', 'queued_at_iso', now()::text)
  )
  ON CONFLICT (friend_request_id, recipient_id) DO NOTHING
  RETURNING id INTO v_delivery_id;

  IF v_delivery_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.notif_pref_enabled(NEW.receiver_id, 'connection_request_email_enabled') THEN
    RETURN NEW;
  END IF;

  IF v_url IS NULL OR v_service_key IS NULL THEN
    UPDATE public.connection_request_email_notifications
    SET status = 'failed', last_error = 'private.service_config missing supabase_url or supabase_service_key'
    WHERE id = v_delivery_id;
    RETURN NEW;
  END IF;

  -- Mark as in-flight before dispatch: pg_net can reach the function before this
  -- transaction receives its request id, and the function's terminal state must win.
  UPDATE public.connection_request_email_notifications
  SET status = 'sending', metadata = metadata || jsonb_build_object('dispatching_at_iso', now()::text)
  WHERE id = v_delivery_id;

  SELECT net.http_post(
    url := v_url || '/functions/v1/send-connection-request-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'friendRequestId', NEW.id,
      'senderId', NEW.sender_id,
      'recipientId', NEW.receiver_id
    )
  ) INTO v_request_id;

  UPDATE public.connection_request_email_notifications
  SET net_request_id = v_request_id,
      metadata = metadata || jsonb_build_object('dispatched_at_iso', now()::text)
  WHERE id = v_delivery_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  UPDATE public.connection_request_email_notifications
  SET status = 'failed', last_error = SQLERRM,
      metadata = metadata || jsonb_build_object('queue_failed_at_iso', now()::text)
  WHERE friend_request_id = NEW.id AND recipient_id = NEW.receiver_id;
  RAISE LOG '[CONNECTION_REQUEST_EMAIL] non-fatal queue failure request=% error=%', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS friend_requests_queue_connection_request_email ON public.friend_requests;
CREATE TRIGGER friend_requests_queue_connection_request_email
AFTER INSERT ON public.friend_requests
FOR EACH ROW EXECUTE FUNCTION public.queue_connection_request_email_notification();

CREATE OR REPLACE FUNCTION public.requeue_connection_request_email_notifications(p_limit integer DEFAULT 100)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text := (SELECT value FROM private.service_config WHERE key = 'supabase_url');
  v_service_key text := (SELECT value FROM private.service_config WHERE key = 'supabase_service_key');
  v_request_id bigint;
  v_count integer := 0;
  rec record;
BEGIN
  IF v_url IS NULL OR v_service_key IS NULL THEN
    RETURN 0;
  END IF;

  FOR rec IN
    SELECT q.id, q.friend_request_id, q.sender_id, q.recipient_id
    FROM public.connection_request_email_notifications q
    WHERE q.status IN ('failed', 'pending')
       OR (q.status = 'sending' AND q.updated_at < now() - interval '15 minutes')
    ORDER BY q.updated_at ASC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500))
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      IF NOT public.notif_pref_enabled(rec.recipient_id, 'connection_request_email_enabled') THEN
        UPDATE public.connection_request_email_notifications SET status = 'skipped', last_error = NULL WHERE id = rec.id;
        CONTINUE;
      END IF;

      UPDATE public.connection_request_email_notifications
      SET status = 'sending', last_error = NULL,
          metadata = metadata || jsonb_build_object('requeue_dispatching_at_iso', now()::text)
      WHERE id = rec.id;

      SELECT net.http_post(
        url := v_url || '/functions/v1/send-connection-request-email',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_service_key),
        body := jsonb_build_object('friendRequestId', rec.friend_request_id, 'senderId', rec.sender_id, 'recipientId', rec.recipient_id)
      ) INTO v_request_id;

      UPDATE public.connection_request_email_notifications
      SET net_request_id = v_request_id,
          metadata = metadata || jsonb_build_object('requeued_at_iso', now()::text)
      WHERE id = rec.id;
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.connection_request_email_notifications
      SET status = 'failed', last_error = SQLERRM WHERE id = rec.id;
    END;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.requeue_connection_request_email_notifications(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.requeue_connection_request_email_notifications(integer) TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'requeue-connection-request-emails') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'requeue-connection-request-emails';
  END IF;
END;
$$;

SELECT cron.schedule(
  'requeue-connection-request-emails',
  '*/10 * * * *',
  $$SELECT public.requeue_connection_request_email_notifications();$$
);

COMMENT ON TABLE public.connection_request_email_notifications IS 'Durable delivery log for connection-request notification emails.';
