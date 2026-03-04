-- Relax DM queue secret dependency so each new direct message still dispatches
-- to the email edge function even when app.settings.dm_email_webhook_secret
-- is not configured in Postgres.

CREATE OR REPLACE FUNCTION public.queue_dm_email_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participants UUID[];
  v_recipient_id UUID;
  v_request_id BIGINT;
  v_webhook_secret TEXT;
  v_webhook_url TEXT := 'https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/send-dm-notification-email';
BEGIN
  SELECT participants
    INTO v_participants
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  IF v_participants IS NULL OR array_length(v_participants, 1) <> 2 THEN
    RAISE LOG '[DM_EMAIL_QUEUE] Skip message %: not a one-to-one conversation', NEW.id;
    RETURN NEW;
  END IF;

  SELECT participant_id
    INTO v_recipient_id
  FROM unnest(v_participants) AS participant_id
  WHERE participant_id <> NEW.sender_id
  LIMIT 1;

  IF v_recipient_id IS NULL OR v_recipient_id = NEW.sender_id THEN
    RAISE LOG '[DM_EMAIL_QUEUE] Skip message %: recipient unresolved', NEW.id;
    RETURN NEW;
  END IF;

  INSERT INTO public.message_email_notifications (
    message_id,
    conversation_id,
    sender_id,
    recipient_id,
    status,
    metadata
  ) VALUES (
    NEW.id,
    NEW.conversation_id,
    NEW.sender_id,
    v_recipient_id,
    'pending',
    jsonb_build_object(
      'source', 'messages_trigger',
      'queued_at_iso', now()::text
    )
  )
  ON CONFLICT (message_id, recipient_id) DO NOTHING;

  IF NOT FOUND THEN
    RAISE LOG '[DM_EMAIL_QUEUE] Duplicate queue skipped for message %, recipient %', NEW.id, v_recipient_id;
    RETURN NEW;
  END IF;

  v_webhook_secret := nullif(current_setting('app.settings.dm_email_webhook_secret', true), '');

  SELECT net.http_post(
    url := v_webhook_url,
    headers := jsonb_strip_nulls(jsonb_build_object(
      'Content-Type', 'application/json',
      'x-dm-webhook-secret', v_webhook_secret
    )),
    body := jsonb_build_object(
      'messageId', NEW.id,
      'conversationId', NEW.conversation_id,
      'senderId', NEW.sender_id,
      'recipientId', v_recipient_id
    )
  )
  INTO v_request_id;

  UPDATE public.message_email_notifications
  SET
    status = 'sending',
    net_request_id = v_request_id,
    metadata = metadata || jsonb_build_object(
      'dispatched_at_iso', now()::text,
      'has_webhook_secret', v_webhook_secret IS NOT NULL
    )
  WHERE message_id = NEW.id
    AND recipient_id = v_recipient_id;

  RAISE LOG '[DM_EMAIL_QUEUE] Queued email for message %, recipient %, request_id %', NEW.id, v_recipient_id, v_request_id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    UPDATE public.message_email_notifications
    SET
      status = 'failed',
      last_error = SQLERRM,
      metadata = metadata || jsonb_build_object(
        'queue_failed_at_iso', now()::text
      )
    WHERE message_id = NEW.id
      AND recipient_id = v_recipient_id;

    RAISE LOG '[DM_EMAIL_QUEUE] Failed for message %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_queue_dm_email_notification ON public.messages;
CREATE TRIGGER messages_queue_dm_email_notification
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.queue_dm_email_notification();
