BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE public.mvp_workflow_worker_health ADD COLUMN profiles text[] NOT NULL DEFAULT ARRAY['lead_capture','request_management','customer_portal'];
DROP FUNCTION public.claim_mvp_workflow_test();
CREATE FUNCTION public.claim_mvp_workflow_test(p_profiles text[] DEFAULT ARRAY['lead_capture','request_management','customer_portal']) RETURNS SETOF public.mvp_build_tests
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE job uuid;
BEGIN
 UPDATE public.mvp_build_tests SET status=CASE WHEN attempts<3 THEN 'queued' ELSE 'failed' END,lease=NULL,lease_until=NULL,
 failure_details='Worker interrupted. Retrying safely; contact support if this persists.',finished_at=CASE WHEN attempts>=3 THEN now() ELSE NULL END
 WHERE status='running' AND lease_until<now();
 SELECT id INTO job FROM public.mvp_build_tests WHERE status='queued' AND coalesce(snapshot#>>'{manifest,profile}',snapshot#>>'{workflow,starter}')=ANY(p_profiles) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1;
 RETURN QUERY UPDATE public.mvp_build_tests SET status='running',attempts=attempts+1,lease=gen_random_uuid(),lease_until=now()+interval '10 minutes' WHERE id=job RETURNING *;
END $$;
REVOKE ALL ON FUNCTION public.claim_mvp_workflow_test(text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_mvp_workflow_test(text[]) TO service_role;
-- Preserve legacy validation and extend it only for a genuine CTA-only landing page.
ALTER FUNCTION public.request_mvp_workflow_test(uuid) RENAME TO request_mvp_workflow_test_legacy;
REVOKE ALL ON FUNCTION public.request_mvp_workflow_test_legacy(uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.mvp_is_static_landing(p public.mvp_projects) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT coalesce(p.metadata#>>'{setupInput,buildBrief,kind}'='landing'
 AND p.metadata#>>'{setupInput,buildBrief,version}'='1'
 AND p.metadata#>'{setupInput,workflow}' IS NULL
 AND concat_ws(' ',p.metadata#>>'{setupInput,buildBrief,idea}',p.metadata#>>'{setupInput,buildBrief,task}',p.metadata#>>'{setupInput,buildBrief,features}') !~* '\m(lead|waitlist|signup|sign.up|email|referr|contact form|newsletter)'
 AND p.metadata#>>'{setupInput,buildBrief,ctaUrl}' ~ '^https://[^/@[:space:]]+([/?#]|$)',false);
$$;
CREATE OR REPLACE FUNCTION public.mvp_workflow_snapshot(p public.mvp_projects) RETURNS jsonb LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT jsonb_build_object('files',p.project_files,'workflow',p.metadata#>'{setupInput,workflow}','publicKey',p.metadata#>'{setupInput,workflowPublicKey}','projectType',p.project_type,'connectionId',p.supabase_connection_id,'projectId',p.id,'backend',p.metadata#>'{integrations,supabase,project}')
 || CASE WHEN jsonb_typeof(p.metadata#>'{setupInput,buildBrief}')='object' THEN jsonb_build_object('buildBrief',p.metadata#>'{setupInput,buildBrief}') ELSE '{}'::jsonb END
 || CASE WHEN public.mvp_is_static_landing(p) THEN jsonb_build_object('manifest',jsonb_build_object('version',1,'profile','static_landing','schemaVersion','1.0.0','runtimeVersion','1.0.0')) ELSE '{}'::jsonb END
 || coalesce((SELECT jsonb_build_object('managedBinding',jsonb_build_object('manifest',a.manifest,'configVersion',a.config_version,'providerRef',a.provider_ref,'status',a.status)) FROM public.mvp_managed_apps a WHERE a.project_id=p.id),'{}'::jsonb);
$$;
CREATE OR REPLACE FUNCTION public.mvp_workflow_revision(p public.mvp_projects) RETURNS text LANGUAGE sql STABLE SET search_path=public,extensions AS $$ SELECT encode(digest(public.mvp_workflow_snapshot(p)::text,'sha256'),'hex'); $$;
CREATE FUNCTION public.request_mvp_workflow_test(p_project_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.mvp_projects; r text; existing uuid;
BEGIN
 SELECT * INTO p FROM public.mvp_projects WHERE id=p_project_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
 IF NOT public.mvp_is_static_landing(p) THEN RETURN public.request_mvp_workflow_test_legacy(p_project_id); END IF;
 IF jsonb_typeof(p.project_files) IS DISTINCT FROM 'array' OR jsonb_array_length(p.project_files)=0 OR octet_length(p.project_files::text)>4000000 THEN RAISE EXCEPTION 'Save the current build before testing'; END IF;
 IF octet_length(public.mvp_workflow_snapshot(p)::text)>5000000 THEN RAISE EXCEPTION 'Project is too large to test'; END IF;
 r:=public.mvp_workflow_revision(p);
 SELECT id INTO existing FROM public.mvp_build_tests WHERE project_id=p.id AND revision=r AND (status IN ('queued','passed') OR status='running' AND lease_until>now()) ORDER BY created_at DESC LIMIT 1;
 IF existing IS NOT NULL THEN RETURN existing; END IF;
 IF (SELECT count(*) FROM public.mvp_build_tests WHERE user_id=auth.uid() AND created_at>now()-interval '1 hour')>=12 THEN RAISE EXCEPTION 'Hourly test limit reached. Try later.'; END IF;
 INSERT INTO public.mvp_build_tests(project_id,user_id,revision,snapshot) VALUES(p.id,p.user_id,r,public.mvp_workflow_snapshot(p)) RETURNING id INTO existing;
 RETURN existing;
END $$;
REVOKE ALL ON FUNCTION public.request_mvp_workflow_test(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_mvp_workflow_test(uuid) TO authenticated;
ALTER FUNCTION public.finish_mvp_workflow_test(uuid,uuid,jsonb,jsonb,text) RENAME TO finish_mvp_workflow_test_legacy;
REVOKE ALL ON FUNCTION public.finish_mvp_workflow_test_legacy(uuid,uuid,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.finish_mvp_workflow_test(p_id uuid,p_lease uuid,p_assertions jsonb,p_files jsonb,p_failure text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.mvp_build_tests; passed boolean;
BEGIN
 SELECT * INTO t FROM public.mvp_build_tests WHERE id=p_id AND lease=p_lease AND status='running' AND lease_until>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Test lease expired or result already recorded'; END IF;
 IF t.snapshot#>>'{manifest,profile}' IS DISTINCT FROM 'static_landing' THEN PERFORM public.finish_mvp_workflow_test_legacy(p_id,p_lease,p_assertions,p_files,p_failure); RETURN; END IF;
 passed:=p_failure IS NULL AND coalesce(p_assertions @> '{"customer_task":true,"cta_navigation":true,"no_runtime_errors":true,"responsive_ui":true,"cleanup":true}'::jsonb,false);
 IF passed AND (jsonb_typeof(p_files) IS DISTINCT FROM 'array' OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_files) f WHERE f->>'filename'='index.html') OR octet_length(p_files::text)>8000000) THEN RAISE EXCEPTION 'Invalid built artifact'; END IF;
 UPDATE public.mvp_build_tests SET status=CASE WHEN passed THEN 'passed' ELSE 'failed' END,assertions=p_assertions,artifact_files=CASE WHEN passed THEN p_files END,failure_details=left(p_failure,2000),finished_at=now(),lease_until=NULL WHERE id=p_id;
END $$;
REVOKE ALL ON FUNCTION public.finish_mvp_workflow_test(uuid,uuid,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_mvp_workflow_test(uuid,uuid,jsonb,jsonb,text) TO service_role;
COMMIT;
