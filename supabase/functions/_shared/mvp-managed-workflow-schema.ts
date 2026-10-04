// Install only in a customer app or the separate test database.
export const MANAGED_WORKFLOW_SCHEMA = String.raw`-- Run in the CONNECTED APP database and in a SEPARATE test Supabase project.
-- This is not a migration for CT's platform database.
BEGIN;
CREATE TABLE IF NOT EXISTS public.ct_mvp_workflow_owners(project_key uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS public.ct_mvp_records(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_key uuid NOT NULL REFERENCES public.ct_mvp_workflow_owners(project_key) ON DELETE CASCADE,
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, email text NOT NULL DEFAULT '', body text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','done')), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ct_mvp_workflow_owners ADD COLUMN IF NOT EXISTS starter text NOT NULL DEFAULT 'lead_capture' CHECK(starter IN ('lead_capture','request_management','customer_portal'));
CREATE OR REPLACE FUNCTION public.ct_mvp_can_submit(p_project uuid,p_user uuid,p_email text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM ct_mvp_workflow_owners WHERE project_key=p_project AND
 ((starter='lead_capture' AND p_user IS NULL AND length(btrim(p_email)) BETWEEN 4 AND 320)
 OR (starter IN ('request_management','customer_portal') AND auth.uid() IS NOT NULL AND p_user=auth.uid())));
$$;
REVOKE ALL ON FUNCTION public.ct_mvp_can_submit(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ct_mvp_can_submit(uuid,uuid,text) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.ct_mvp_guard_record_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.role()='service_role' THEN RETURN NEW; END IF;
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.project_key IS DISTINCT FROM OLD.project_key OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'Record ownership cannot change'; END IF;
 IF NEW.status IS DISTINCT FROM OLD.status AND NOT EXISTS(SELECT 1 FROM ct_mvp_workflow_owners WHERE project_key=OLD.project_key AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Only the owner can change request status'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.ct_mvp_guard_record_update() FROM PUBLIC;
DROP TRIGGER IF EXISTS guard_record_update ON public.ct_mvp_records;
CREATE TRIGGER guard_record_update BEFORE UPDATE ON public.ct_mvp_records FOR EACH ROW EXECUTE FUNCTION public.ct_mvp_guard_record_update();
ALTER TABLE public.ct_mvp_workflow_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct_mvp_records ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.ct_mvp_workflow_owners TO authenticated;
REVOKE ALL ON public.ct_mvp_workflow_owners FROM anon;
GRANT SELECT,INSERT,UPDATE ON public.ct_mvp_records TO authenticated;
GRANT INSERT ON public.ct_mvp_records TO anon;
GRANT ALL ON public.ct_mvp_records,public.ct_mvp_workflow_owners TO service_role;
DROP POLICY IF EXISTS owner_self ON public.ct_mvp_workflow_owners;
CREATE POLICY owner_self ON public.ct_mvp_workflow_owners FOR SELECT TO authenticated USING(user_id=auth.uid());
DROP POLICY IF EXISTS submit ON public.ct_mvp_records;
CREATE POLICY submit ON public.ct_mvp_records FOR INSERT TO anon,authenticated WITH CHECK(status='new' AND length(body)<=10000 AND public.ct_mvp_can_submit(project_key,user_id,email));
DROP POLICY IF EXISTS own_records ON public.ct_mvp_records;
CREATE POLICY own_records ON public.ct_mvp_records FOR SELECT TO authenticated USING(user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.ct_mvp_workflow_owners o WHERE o.project_key=ct_mvp_records.project_key AND o.user_id=auth.uid()));
DROP POLICY IF EXISTS manage_records ON public.ct_mvp_records;
CREATE POLICY manage_records ON public.ct_mvp_records FOR UPDATE TO authenticated USING(user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.ct_mvp_workflow_owners o WHERE o.project_key=ct_mvp_records.project_key AND o.user_id=auth.uid())) WITH CHECK(user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.ct_mvp_workflow_owners o WHERE o.project_key=ct_mvp_records.project_key AND o.user_id=auth.uid()));
CREATE OR REPLACE FUNCTION public.ct_mvp_workflow_health(p_project_key uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.ct_mvp_workflow_owners WHERE project_key=p_project_key)
 AND (SELECT relrowsecurity FROM pg_class WHERE oid='public.ct_mvp_records'::regclass)
 AND (SELECT relrowsecurity FROM pg_class WHERE oid='public.ct_mvp_workflow_owners'::regclass)
 AND (SELECT count(*)=3 FROM pg_policies WHERE schemaname='public' AND tablename='ct_mvp_records' AND policyname IN ('submit','own_records','manage_records'));
$$;
REVOKE ALL ON FUNCTION public.ct_mvp_workflow_health(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ct_mvp_workflow_health(uuid) TO anon,authenticated,service_role;
COMMIT;
-- After creating an owner account in the app's Supabase Authentication panel:
-- INSERT INTO public.ct_mvp_workflow_owners(project_key,user_id)
-- SELECT 'CT_PROJECT_UUID'::uuid,id FROM auth.users WHERE email='YOUR_OWNER_EMAIL';
`;
