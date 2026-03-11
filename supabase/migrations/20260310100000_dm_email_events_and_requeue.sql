-- Add webhook lookup performance and a safe replay path for failed/stuck DM emails.

CREATE INDEX IF NOT EXISTS idx_message_email_notifications_resend_email_id
  ON public.message_email_notifications(resend_email_id)
  WHERE resend_email_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.requeue_failed_dm_email_notifications(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  message_id UUID,
  recipient_id UUID,
  previous_status TEXT,
  new_status TEXT,
  net_request_id BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_webhook_secret TEXT;
  v_webhook_url TEXT := 'https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/send-dm-notification-email';
  v_effective_limit INTEGER := GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
  v_request_id BIGINT;
  rec RECORD;
BEGIN
  v_webhook_secret := nullif(current_setting('app.settings.dm_email_webhook_secret', true), '');

  FOR rec IN
    SELECT
      q.message_id,
      q.conversation_id,
      q.sender_id,
      q.recipient_id,
      q.status
    FROM public.message_email_notifications q
    WHERE q.status IN ('failed', 'pending')
      OR (q.status = 'sending' AND q.updated_at < now() - interval '15 minutes')
    ORDER BY q.updated_at ASC
    LIMIT v_effective_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      SELECT net.http_post(
        url := v_webhook_url,
        headers := jsonb_strip_nulls(jsonb_build_object(
          'Content-Type', 'application/json',
          'x-dm-webhook-secret', v_webhook_secret
        )),
        body := jsonb_build_object(
          'messageId', rec.message_id,
          'conversationId', rec.conversation_id,
          'senderId', rec.sender_id,
          'recipientId', rec.recipient_id
        )
      )
      INTO v_request_id;

      UPDATE public.message_email_notifications
      SET
        status = 'sending',
        net_request_id = v_request_id,
        last_error = NULL,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'requeued_at_iso', now()::text,
          'requeue_previous_status', rec.status,
          'requeue_request_id', v_request_id,
          'has_webhook_secret', v_webhook_secret IS NOT NULL
        )
      WHERE message_id = rec.message_id
        AND recipient_id = rec.recipient_id;

      message_id := rec.message_id;
      recipient_id := rec.recipient_id;
      previous_status := rec.status;
      new_status := 'sending';
      net_request_id := v_request_id;
      RETURN NEXT;
    EXCEPTION
      WHEN OTHERS THEN
        UPDATE public.message_email_notifications
        SET
          status = 'failed',
          last_error = SQLERRM,
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'requeue_failed_at_iso', now()::text,
            'requeue_previous_status', rec.status
          )
        WHERE message_id = rec.message_id
          AND recipient_id = rec.recipient_id;

        message_id := rec.message_id;
        recipient_id := rec.recipient_id;
        previous_status := rec.status;
        new_status := 'failed';
        net_request_id := NULL;
        RETURN NEXT;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.requeue_failed_dm_email_notifications(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.requeue_failed_dm_email_notifications(INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.requeue_failed_dm_email_notifications(INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.requeue_failed_dm_email_notifications(INTEGER) TO service_role;

COMMENT ON FUNCTION public.requeue_failed_dm_email_notifications(INTEGER)
IS 'Replays failed/pending/stale-sending DM notification emails through the existing webhook pipeline.';
