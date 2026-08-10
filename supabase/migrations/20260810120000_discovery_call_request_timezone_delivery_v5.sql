-- Keep request audit/email snapshots aligned with the private mentor scheduling
-- timezone. The original V2 request RPC predates scheduling_timezone and may
-- still place mentors.timezone (or UTC) in its payload.

CREATE OR REPLACE FUNCTION public.align_discovery_call_mentor_timezone_v5()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_timezone TEXT;
BEGIN
  SELECT s.scheduling_timezone
  INTO v_timezone
  FROM public.discovery_calls dc
  JOIN public.mentor_discovery_call_settings s ON s.mentor_id = dc.mentor_id
  WHERE dc.id = NEW.discovery_call_id;

  IF NULLIF(v_timezone, '') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_timezone_names z WHERE z.name = v_timezone) THEN
    NEW.payload := jsonb_set(
      COALESCE(NEW.payload, '{}'::jsonb),
      '{mentorTimezone}',
      to_jsonb(v_timezone),
      true
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discovery_call_event_timezone_v5
  ON public.discovery_call_events;
CREATE TRIGGER discovery_call_event_timezone_v5
  BEFORE INSERT ON public.discovery_call_events
  FOR EACH ROW
  WHEN (NEW.event_type = 'request_created')
  EXECUTE FUNCTION public.align_discovery_call_mentor_timezone_v5();

DROP TRIGGER IF EXISTS discovery_call_outbox_timezone_v5
  ON public.discovery_call_notification_outbox;
CREATE TRIGGER discovery_call_outbox_timezone_v5
  BEFORE INSERT ON public.discovery_call_notification_outbox
  FOR EACH ROW
  WHEN (NEW.template_key = 'request_created')
  EXECUTE FUNCTION public.align_discovery_call_mentor_timezone_v5();

-- Correct only notifications that have not started delivery. Sent messages and
-- historical audit records remain immutable.
UPDATE public.discovery_call_notification_outbox o
SET payload = jsonb_set(
      COALESCE(o.payload, '{}'::jsonb),
      '{mentorTimezone}',
      to_jsonb(s.scheduling_timezone),
      true
    ),
    updated_at = now()
FROM public.discovery_calls dc
JOIN public.mentor_discovery_call_settings s ON s.mentor_id = dc.mentor_id
WHERE o.discovery_call_id = dc.id
  AND o.template_key = 'request_created'
  AND o.status = 'pending'
  AND EXISTS (
    SELECT 1 FROM pg_timezone_names z WHERE z.name = s.scheduling_timezone
  );

REVOKE ALL ON FUNCTION public.align_discovery_call_mentor_timezone_v5() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.align_discovery_call_mentor_timezone_v5() TO service_role;

COMMENT ON FUNCTION public.align_discovery_call_mentor_timezone_v5() IS
  'Aligns Discovery Call request audit and email payloads with the mentor private scheduling timezone.';
