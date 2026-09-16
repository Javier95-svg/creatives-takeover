-- Additive hardening: home identity cannot be changed to evade restrictive RLS.
-- Legacy non-home conversations remain untouched; no billing or content changes.
BEGIN;

CREATE OR REPLACE FUNCTION public.guard_pulse_home_scope()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (OLD.purpose = 'pulse_home' OR NEW.purpose = 'pulse_home') AND
     (OLD.purpose IS DISTINCT FROM NEW.purpose OR
      OLD.user_id IS DISTINCT FROM NEW.user_id OR
      OLD.session_id IS DISTINCT FROM NEW.session_id OR
      OLD.id IS DISTINCT FROM NEW.id) THEN
    RAISE EXCEPTION 'Pulse Home conversation scope is immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_pulse_home_scope BEFORE UPDATE ON public.chatbot_conversations
FOR EACH ROW EXECUTE FUNCTION public.guard_pulse_home_scope();

-- Clients may read their home messages, but only the owner-checked endpoint
-- writes them. This also prevents moving a home message to a legacy thread.
CREATE OR REPLACE FUNCTION public.guard_pulse_home_message_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_home boolean := false; new_home boolean := false;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT purpose = 'pulse_home' INTO old_home FROM public.chatbot_conversations WHERE id = OLD.conversation_id;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT purpose = 'pulse_home' INTO new_home FROM public.chatbot_conversations WHERE id = NEW.conversation_id;
  END IF;
  IF (coalesce(old_home, false) OR coalesce(new_home, false)) AND
     coalesce(auth.role(), '') IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'Pulse Home messages are written by the streaming service' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_pulse_home_message_write BEFORE INSERT OR UPDATE OR DELETE ON public.chatbot_messages
FOR EACH ROW EXECUTE FUNCTION public.guard_pulse_home_message_write();
REVOKE ALL ON FUNCTION public.guard_pulse_home_scope() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_pulse_home_message_write() FROM PUBLIC;
COMMIT;
