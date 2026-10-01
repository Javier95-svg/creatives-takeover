ALTER TABLE public.ct_connections ADD COLUMN refresh_requested_at timestamptz;
CREATE TABLE public.ct_connection_events (
 connection_id uuid NOT NULL REFERENCES public.ct_connections ON DELETE CASCADE,
 event_id text NOT NULL,event_type text NOT NULL,received_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(connection_id,event_id)
);
ALTER TABLE public.ct_connection_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ct_connection_events FROM anon,authenticated;
GRANT ALL ON public.ct_connection_events TO service_role;
CREATE FUNCTION public.ct_queue_connection_event(p_connection uuid,p_event text,p_type text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO ct_connection_events(connection_id,event_id,event_type) VALUES(p_connection,p_event,p_type) ON CONFLICT DO NOTHING;
 IF FOUND THEN UPDATE ct_connections SET refresh_requested_at=now() WHERE id=p_connection AND status<>'disconnected'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.ct_queue_connection_event(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ct_queue_connection_event(uuid,text,text) TO service_role;
