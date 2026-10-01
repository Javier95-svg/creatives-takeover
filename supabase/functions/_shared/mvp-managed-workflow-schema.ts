// Reviewed existing workflow schema, bundled for managed provisioning.
export const MANAGED_WORKFLOW_SCHEMA = String.raw`-- Run in the CONNECTED APP database and in a SEPARATE test Supabase project.
-- This is not a migration for CT's platform database.
BEGIN;
CREATE TABLE IF NOT EXISTS public.ct_mvp_workflow_owners(project_key uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS public.ct_mvp_records(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_key uuid NOT NULL REFERENCES public.ct_mvp_workflow_owners(project_key) ON DELETE CASCADE,
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, email text NOT NULL DEFAULT '', body text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','done')), created_at timestamptz NOT NULL DEFAULT now()
);
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
CREATE POLICY submit ON public.ct_mvp_records FOR INSERT TO anon,authenticated WITH CHECK(status='new' AND (user_id=auth.uid() OR (user_id IS NULL AND length(email)>3)));
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
