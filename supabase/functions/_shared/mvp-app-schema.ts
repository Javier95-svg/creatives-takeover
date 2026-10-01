// Reviewed module source, installed ONLY into managed customer/test databases.
// Kept as a literal so Edge deployment bundles it; no remote/generated SQL.
export const APP_SCHEMA_V1 = String.raw`
BEGIN;
CREATE TABLE IF NOT EXISTS public.ct_app_config(app_id uuid PRIMARY KEY, schema_version text NOT NULL, modules text[] NOT NULL);
CREATE TABLE IF NOT EXISTS public.ct_app_members(app_id uuid REFERENCES public.ct_app_config ON DELETE CASCADE,user_id uuid REFERENCES auth.users ON DELETE CASCADE,role text NOT NULL CHECK(role IN ('owner','staff')),PRIMARY KEY(app_id,user_id));
CREATE OR REPLACE FUNCTION public.ct_app_role(p_app uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT role FROM ct_app_members WHERE app_id=p_app AND user_id=auth.uid() $$;
CREATE OR REPLACE FUNCTION public.ct_has_module(p_app uuid,p_module text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT coalesce(p_module=ANY(modules),false) FROM ct_app_config WHERE app_id=p_app $$;
CREATE TABLE IF NOT EXISTS public.ct_app_records(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),app_id uuid NOT NULL REFERENCES public.ct_app_config ON DELETE CASCADE,user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,title text NOT NULL CHECK(length(title) BETWEEN 1 AND 200),body text NOT NULL DEFAULT '' CHECK(length(body)<=10000),status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','active','done')),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.ct_app_history(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,app_id uuid NOT NULL REFERENCES public.ct_app_config ON DELETE CASCADE,record_id uuid NOT NULL,actor uuid,old_status text,new_status text,created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.ct_app_leads(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),app_id uuid NOT NULL REFERENCES public.ct_app_config ON DELETE CASCADE,email text NOT NULL,referral text,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(app_id,email));
CREATE TABLE IF NOT EXISTS public.ct_app_checkins(app_id uuid REFERENCES public.ct_app_config ON DELETE CASCADE,record_id uuid REFERENCES public.ct_app_records ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,day date NOT NULL,timezone text NOT NULL,created_at timestamptz DEFAULT now(),PRIMARY KEY(app_id,record_id,user_id,day));
CREATE TABLE IF NOT EXISTS public.ct_app_slots(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),app_id uuid NOT NULL REFERENCES public.ct_app_config ON DELETE CASCADE,starts_at timestamptz NOT NULL,ends_at timestamptz NOT NULL,timezone text NOT NULL,capacity int NOT NULL CHECK(capacity BETWEEN 1 AND 1000),CHECK(ends_at>starts_at));
CREATE TABLE IF NOT EXISTS public.ct_app_bookings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),app_id uuid NOT NULL REFERENCES public.ct_app_config ON DELETE CASCADE,slot_id uuid NOT NULL REFERENCES public.ct_app_slots ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,status text NOT NULL CHECK(status IN ('confirmed','cancelled')),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(slot_id,user_id));
CREATE TABLE IF NOT EXISTS public.ct_app_metrics(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),app_id uuid NOT NULL REFERENCES public.ct_app_config ON DELETE CASCADE,user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,source_key text NOT NULL CHECK(length(source_key) BETWEEN 1 AND 200),day date NOT NULL,category text NOT NULL CHECK(length(category) BETWEEN 1 AND 100),amount numeric(16,4) NOT NULL CHECK(amount BETWEEN -999999999999 AND 999999999999),created_at timestamptz DEFAULT now(),UNIQUE(app_id,user_id,source_key));
CREATE INDEX IF NOT EXISTS ct_records_owner ON public.ct_app_records(app_id,user_id);
CREATE INDEX IF NOT EXISTS ct_metrics_period ON public.ct_app_metrics(app_id,user_id,day);
CREATE INDEX IF NOT EXISTS ct_bookings_slot ON public.ct_app_bookings(slot_id,status);

ALTER TABLE public.ct_app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct_app_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct_app_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct_app_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct_app_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct_app_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct_app_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct_app_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct_app_metrics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ct_app_config,public.ct_app_members,public.ct_app_records,public.ct_app_history,public.ct_app_leads,public.ct_app_checkins,public.ct_app_slots,public.ct_app_bookings,public.ct_app_metrics FROM anon,authenticated;
GRANT SELECT ON public.ct_app_config,public.ct_app_slots TO anon,authenticated;
GRANT SELECT ON public.ct_app_members,public.ct_app_history,public.ct_app_leads,public.ct_app_checkins,public.ct_app_bookings TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.ct_app_records TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.ct_app_metrics TO authenticated;
GRANT INSERT,UPDATE,DELETE ON public.ct_app_slots TO authenticated;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ct_app_records') THEN
 CREATE POLICY config_read ON public.ct_app_config FOR SELECT USING(true);
 CREATE POLICY members_read ON public.ct_app_members FOR SELECT USING(user_id=auth.uid() OR public.ct_app_role(app_id)='owner');
 CREATE POLICY records_read ON public.ct_app_records FOR SELECT USING(public.ct_has_module(app_id,'records') AND CASE WHEN public.ct_has_module(app_id,'team') THEN public.ct_app_role(app_id) IN ('owner','staff') ELSE user_id=auth.uid() END);
 CREATE POLICY records_insert ON public.ct_app_records FOR INSERT WITH CHECK(public.ct_has_module(app_id,'records') AND user_id=auth.uid() AND (NOT public.ct_has_module(app_id,'team') OR public.ct_app_role(app_id) IN ('owner','staff')));
 CREATE POLICY records_update ON public.ct_app_records FOR UPDATE USING(public.ct_has_module(app_id,'records') AND CASE WHEN public.ct_has_module(app_id,'team') THEN public.ct_app_role(app_id) IN ('owner','staff') ELSE user_id=auth.uid() END) WITH CHECK(public.ct_has_module(app_id,'records') AND CASE WHEN public.ct_has_module(app_id,'team') THEN public.ct_app_role(app_id) IN ('owner','staff') ELSE user_id=auth.uid() END);
 CREATE POLICY records_delete ON public.ct_app_records FOR DELETE USING(user_id=auth.uid() AND (NOT public.ct_has_module(app_id,'team') OR public.ct_app_role(app_id)='owner'));
 CREATE POLICY history_read ON public.ct_app_history FOR SELECT USING(public.ct_has_module(app_id,'team') AND public.ct_app_role(app_id) IN ('owner','staff'));
 CREATE POLICY leads_read ON public.ct_app_leads FOR SELECT USING(public.ct_app_role(app_id)='owner');
 CREATE POLICY checkins_read ON public.ct_app_checkins FOR SELECT USING(user_id=auth.uid());
 CREATE POLICY slots_read ON public.ct_app_slots FOR SELECT USING(public.ct_has_module(app_id,'booking'));
 CREATE POLICY slots_write ON public.ct_app_slots FOR ALL USING(public.ct_app_role(app_id)='owner' AND public.ct_has_module(app_id,'booking')) WITH CHECK(public.ct_app_role(app_id)='owner' AND public.ct_has_module(app_id,'booking'));
 CREATE POLICY bookings_read ON public.ct_app_bookings FOR SELECT USING(user_id=auth.uid() OR public.ct_app_role(app_id)='owner');
 CREATE POLICY metrics_owner ON public.ct_app_metrics FOR ALL USING(user_id=auth.uid() AND public.ct_has_module(app_id,'dashboard')) WITH CHECK(user_id=auth.uid() AND public.ct_has_module(app_id,'dashboard'));
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.ct_record_history() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.app_id<>OLD.app_id OR NEW.user_id<>OLD.user_id THEN RAISE EXCEPTION 'Record ownership cannot change'; END IF;
 NEW.updated_at:=now();
 IF NEW.status<>OLD.status THEN INSERT INTO ct_app_history(app_id,record_id,actor,old_status,new_status) VALUES(NEW.app_id,NEW.id,auth.uid(),OLD.status,NEW.status); END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ct_record_history ON public.ct_app_records;
CREATE TRIGGER ct_record_history BEFORE UPDATE ON public.ct_app_records FOR EACH ROW EXECUTE FUNCTION public.ct_record_history();
CREATE OR REPLACE FUNCTION public.ct_validate_slot() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=NEW.timezone) THEN RAISE EXCEPTION 'Invalid time zone'; END IF;
 IF TG_OP='UPDATE' AND (NEW.app_id<>OLD.app_id OR NEW.id<>OLD.id) THEN RAISE EXCEPTION 'Slot ownership cannot change'; END IF;
 IF NEW.capacity<(SELECT count(*) FROM ct_app_bookings WHERE slot_id=NEW.id AND status='confirmed') THEN RAISE EXCEPTION 'Capacity cannot be lower than confirmed bookings'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ct_validate_slot ON public.ct_app_slots;
CREATE TRIGGER ct_validate_slot BEFORE INSERT OR UPDATE ON public.ct_app_slots FOR EACH ROW EXECUTE FUNCTION public.ct_validate_slot();
REVOKE ALL ON FUNCTION public.ct_validate_slot() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.ct_capture_lead(p_app uuid,p_email text,p_referral text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT coalesce(ct_has_module(p_app,'leads'),false) OR p_email IS NULL OR length(p_email)>254 OR p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR length(p_referral)>200 THEN RAISE EXCEPTION 'Invalid lead'; END IF;
 -- First attribution wins; retries cannot inflate counts or overwrite source.
 INSERT INTO ct_app_leads(app_id,email,referral) VALUES(p_app,lower(btrim(p_email)),nullif(btrim(p_referral),'')) ON CONFLICT(app_id,email) DO NOTHING;
END $$;
CREATE OR REPLACE FUNCTION public.ct_checkin(p_app uuid,p_record uuid,p_timezone text) RETURNS date LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE today date;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(ct_has_module(p_app,'habits'),false) OR NOT EXISTS(SELECT 1 FROM ct_app_records WHERE id=p_record AND app_id=p_app AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Habit not found'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=p_timezone) THEN RAISE EXCEPTION 'Invalid time zone'; END IF;
 today:=(now() AT TIME ZONE p_timezone)::date;
 INSERT INTO ct_app_checkins(app_id,record_id,user_id,day,timezone) VALUES(p_app,p_record,auth.uid(),today,p_timezone) ON CONFLICT DO NOTHING;
 RETURN today;
END $$;
CREATE OR REPLACE FUNCTION public.ct_book_slot(p_app uuid,p_slot uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE slot ct_app_slots; booking uuid; current_status text;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(ct_has_module(p_app,'booking'),false) THEN RAISE EXCEPTION 'Sign in to book'; END IF;
 SELECT * INTO slot FROM ct_app_slots WHERE id=p_slot AND app_id=p_app FOR UPDATE;
 IF NOT FOUND OR slot.starts_at<=now() THEN RAISE EXCEPTION 'Slot unavailable'; END IF;
 SELECT id,status INTO booking,current_status FROM ct_app_bookings WHERE slot_id=p_slot AND user_id=auth.uid();
 IF current_status='confirmed' THEN RETURN booking; END IF;
 IF (SELECT count(*) FROM ct_app_bookings WHERE slot_id=p_slot AND status='confirmed')>=slot.capacity THEN RAISE EXCEPTION 'Slot is full'; END IF;
 INSERT INTO ct_app_bookings(app_id,slot_id,user_id,status) VALUES(p_app,p_slot,auth.uid(),'confirmed') ON CONFLICT(slot_id,user_id) DO UPDATE SET status='confirmed' RETURNING id INTO booking;
 RETURN booking;
END $$;
CREATE OR REPLACE FUNCTION public.ct_cancel_booking(p_app uuid,p_booking uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE slot uuid;
BEGIN
 SELECT slot_id INTO slot FROM ct_app_bookings WHERE id=p_booking AND app_id=p_app AND (user_id=auth.uid() OR ct_app_role(p_app)='owner');
 IF slot IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
 PERFORM 1 FROM ct_app_slots WHERE id=slot FOR UPDATE;
 UPDATE ct_app_bookings SET status='cancelled' WHERE id=p_booking;
END $$;
-- Only callers with authenticated sessions can execute private operations.
REVOKE ALL ON FUNCTION public.ct_app_role(uuid),public.ct_has_module(uuid,text),public.ct_record_history(),public.ct_capture_lead(uuid,text,text),public.ct_checkin(uuid,uuid,text),public.ct_book_slot(uuid,uuid),public.ct_cancel_booking(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ct_app_role(uuid),public.ct_has_module(uuid,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ct_capture_lead(uuid,text,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ct_checkin(uuid,uuid,text),public.ct_book_slot(uuid,uuid),public.ct_cancel_booking(uuid,uuid) TO authenticated;
GRANT ALL ON public.ct_app_config,public.ct_app_members,public.ct_app_records,public.ct_app_history,public.ct_app_leads,public.ct_app_checkins,public.ct_app_slots,public.ct_app_bookings,public.ct_app_metrics TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.ct_app_history_id_seq TO service_role;
COMMIT;
`;
