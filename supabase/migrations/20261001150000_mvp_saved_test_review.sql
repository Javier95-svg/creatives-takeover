BEGIN;
SET LOCAL lock_timeout='5s';

ALTER TABLE public.mvp_managed_apps ADD COLUMN public_runtime jsonb;
-- Browser-supplied database keys never override the managed connection.
ALTER FUNCTION public.mvp_workflow_snapshot(public.mvp_projects) RENAME TO mvp_workflow_snapshot_before_managed;
CREATE FUNCTION public.mvp_workflow_snapshot(p public.mvp_projects) RETURNS jsonb LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT public.mvp_workflow_snapshot_before_managed(p) || CASE WHEN p.metadata#>>'{setupInput,managedApp}'='true' THEN coalesce((SELECT jsonb_build_object('publicKey',a.public_runtime->>'publicKey','backend',jsonb_build_object('projectUrl',a.public_runtime->>'url'),'managedApp',true) FROM public.mvp_managed_apps a WHERE a.project_id=p.id AND a.user_id=p.user_id AND a.status='ready'),'{}'::jsonb) ELSE '{}'::jsonb END;
$$;

CREATE OR REPLACE FUNCTION public.request_mvp_workflow_test_legacy(p_project_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.mvp_projects; w jsonb; r text; existing uuid;
BEGIN
 SELECT * INTO p FROM public.mvp_projects WHERE id=p_project_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
 w:=p.metadata#>'{setupInput,workflow}';
 IF w IS NULL OR w->>'version'<>'1' OR coalesce(w->>'starter','') NOT IN ('lead_capture','request_management','customer_portal')
 OR length(btrim(coalesce(w->>'customer','')))=0 OR length(btrim(coalesce(w->>'task','')))=0 OR length(btrim(coalesce(w->>'outcome','')))=0
 OR jsonb_typeof(w->'features') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Define a supported customer workflow first'; END IF;
 IF octet_length(w::text)>4096 OR jsonb_array_length(w->'features') NOT BETWEEN 1 AND 3 OR EXISTS(SELECT 1 FROM jsonb_array_elements(w->'features') f WHERE jsonb_typeof(f)<>'string' OR length(btrim(f#>>'{}')) NOT BETWEEN 1 AND 200) THEN RAISE EXCEPTION 'Choose one to three essential features'; END IF;
 IF p.metadata#>>'{setupInput,managedApp}'='true' THEN
   IF NOT EXISTS(SELECT 1 FROM public.mvp_managed_apps a WHERE a.project_id=p.id AND a.user_id=p.user_id AND a.status='ready' AND jsonb_typeof(a.public_runtime)='object'
     AND ((a.manifest->>'profile'='private_records' AND w->>'starter'='customer_portal' AND p.metadata#>>'{setupInput,buildBrief,kind}'='app')
       OR (a.manifest->>'profile'='lead_capture_v2' AND w->>'starter'='lead_capture' AND p.metadata#>>'{setupInput,buildBrief,kind}'='landing')))
   THEN RAISE EXCEPTION 'Finish managed app setup for the selected workflow'; END IF;
 ELSIF p.supabase_connection_id IS NULL THEN RAISE EXCEPTION 'Connect a database for this saved workflow'; END IF;
 IF jsonb_typeof(p.project_files) IS DISTINCT FROM 'array' OR octet_length(p.project_files::text)>4000000 THEN RAISE EXCEPTION 'Missing or oversized project files'; END IF;
 r:=public.mvp_workflow_revision(p);
 IF octet_length(public.mvp_workflow_snapshot(p)::text)>5000000 THEN RAISE EXCEPTION 'Project snapshot is too large'; END IF;
 UPDATE public.mvp_build_tests SET status='failed',failure_details='Worker timed out. Run the test again.',finished_at=now()
 WHERE project_id=p.id AND ((status='running' AND lease_until<now()) OR (status='queued' AND created_at<now()-interval '15 minutes'));
 SELECT id INTO existing FROM public.mvp_build_tests WHERE project_id=p.id AND revision=r AND status IN ('queued','running','passed') ORDER BY created_at DESC LIMIT 1;
 IF existing IS NOT NULL THEN RETURN existing; END IF;
 IF (SELECT count(*) FROM public.mvp_build_tests WHERE user_id=auth.uid() AND created_at>now()-interval '1 hour')>=12 THEN RAISE EXCEPTION 'Hourly test limit reached. Try later.'; END IF;
 INSERT INTO public.mvp_build_tests(project_id,user_id,revision,snapshot) VALUES(p.id,p.user_id,r,public.mvp_workflow_snapshot(p)) RETURNING id INTO existing;
 RETURN existing;
END $$;

-- Restore the current saved revision's check after a browser reload. No snapshot,
-- credentials, source or another owner's results are exposed by this RPC.
CREATE OR REPLACE FUNCTION public.current_mvp_workflow_test(p_project uuid)
RETURNS TABLE(id uuid,revision text,status text,assertions jsonb,failure_details text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.mvp_projects;
BEGIN
 SELECT * INTO p FROM public.mvp_projects WHERE mvp_projects.id=p_project AND user_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
 RETURN QUERY SELECT t.id,t.revision,t.status,t.assertions,t.failure_details FROM public.mvp_build_tests t
 WHERE t.project_id=p.id AND t.user_id=auth.uid() AND t.revision=public.mvp_workflow_revision(p)
 ORDER BY t.created_at DESC LIMIT 1;
END $$;
REVOKE ALL ON FUNCTION public.current_mvp_workflow_test(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.current_mvp_workflow_test(uuid) TO authenticated;

-- A checked artifact can be inspected without WebContainers. Only the owner can
-- fetch it, and the frontend renders it in an isolated frame without service access.
CREATE OR REPLACE FUNCTION public.review_mvp_test_artifact(p_test uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 SELECT t.artifact_files INTO result FROM public.mvp_build_tests t
 JOIN public.mvp_projects p ON p.id=t.project_id
 WHERE t.id=p_test AND t.user_id=auth.uid() AND p.user_id=auth.uid() AND t.status='passed'
 AND t.revision=public.mvp_workflow_revision(p);
 IF result IS NULL THEN RAISE EXCEPTION 'Check the current saved app before opening its reviewed preview'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.review_mvp_test_artifact(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_mvp_test_artifact(uuid) TO authenticated;
COMMIT;
