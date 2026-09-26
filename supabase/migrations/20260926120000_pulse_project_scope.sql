-- Keep previous Home history intact, but never silently assign it to a project.
-- New clients use business_context.pulseScope; old unscoped threads remain readable.
BEGIN;

CREATE INDEX IF NOT EXISTS chatbot_home_scoped_latest
  ON public.chatbot_conversations (user_id, (business_context->'pulseScope'->>'userType'),
    (business_context->'pulseScope'->>'projectId'), created_at DESC)
  WHERE purpose = 'pulse_home';

CREATE OR REPLACE FUNCTION public.guard_pulse_home_scope()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (OLD.purpose = 'pulse_home' OR NEW.purpose = 'pulse_home') AND
     (OLD.purpose IS DISTINCT FROM NEW.purpose OR
      OLD.user_id IS DISTINCT FROM NEW.user_id OR
      OLD.session_id IS DISTINCT FROM NEW.session_id OR
      OLD.id IS DISTINCT FROM NEW.id OR
      (OLD.business_context->'pulseScope') IS DISTINCT FROM (NEW.business_context->'pulseScope')) THEN
    RAISE EXCEPTION 'Pulse Home conversation scope is immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_pulse_home_project_owner()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE scope jsonb; project_uuid uuid;
BEGIN
  IF NEW.purpose IS DISTINCT FROM 'pulse_home' THEN RETURN NEW; END IF;
  scope := NEW.business_context->'pulseScope';
  -- Permit old clients during rollout. The new handler refuses to use unscoped history.
  IF scope IS NULL THEN RETURN NEW; END IF;
  IF jsonb_typeof(scope) IS DISTINCT FROM 'object' OR
     scope->>'version' IS DISTINCT FROM '1' OR
     COALESCE(scope->>'userType', '') NOT IN ('founder','builder','mentor','marketplace','investor') OR
     NOT (scope ? 'projectId') THEN
    RAISE EXCEPTION 'Invalid Pulse scope' USING ERRCODE = '22023';
  END IF;
  IF scope->>'projectId' IS NOT NULL THEN
    IF scope->>'userType' NOT IN ('founder','builder') THEN
      RAISE EXCEPTION 'Invalid Pulse account scope' USING ERRCODE = '42501';
    END IF;
    project_uuid := (scope->>'projectId')::uuid;
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = project_uuid
      AND user_id = NEW.user_id AND archived_at IS NULL) THEN
      RAISE EXCEPTION 'Pulse project is unavailable' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER check_pulse_home_project_owner BEFORE INSERT ON public.chatbot_conversations
FOR EACH ROW EXECUTE FUNCTION public.check_pulse_home_project_owner();
REVOKE ALL ON FUNCTION public.check_pulse_home_project_owner() FROM PUBLIC;
COMMIT;
