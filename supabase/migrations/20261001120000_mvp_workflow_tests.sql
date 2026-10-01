-- Immutable test inputs and published artifacts. Apply before deploying the new functions.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE IF NOT EXISTS public.mvp_workflow_worker_health(id boolean PRIMARY KEY DEFAULT true CHECK(id),last_seen timestamptz NOT NULL);
ALTER TABLE public.mvp_workflow_worker_health ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mvp_workflow_worker_health FROM anon,authenticated;
GRANT ALL ON public.mvp_workflow_worker_health TO service_role;
CREATE TABLE IF NOT EXISTS public.mvp_build_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES public.mvp_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, revision text NOT NULL,
  snapshot jsonb NOT NULL, status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','passed','failed')),
  assertions jsonb NOT NULL DEFAULT '{}', failure_details text, artifact_files jsonb,
  lease uuid, lease_until timestamptz, created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS mvp_build_tests_queue ON public.mvp_build_tests(status,created_at);
ALTER TABLE public.mvp_build_tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS owner_read ON public.mvp_build_tests;
CREATE POLICY owner_read ON public.mvp_build_tests FOR SELECT TO authenticated USING(user_id=auth.uid());
REVOKE ALL ON public.mvp_build_tests FROM anon,authenticated;
GRANT SELECT(id,project_id,user_id,revision,status,assertions,failure_details,created_at,finished_at) ON public.mvp_build_tests TO authenticated;
GRANT ALL ON public.mvp_build_tests TO service_role;
CREATE TABLE IF NOT EXISTS public.mvp_published_releases (
  project_id uuid PRIMARY KEY REFERENCES public.mvp_projects(id) ON DELETE CASCADE,
  test_run_id uuid REFERENCES public.mvp_build_tests(id), revision text NOT NULL, files jsonb NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mvp_published_releases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mvp_published_releases FROM anon,authenticated;
GRANT ALL ON public.mvp_published_releases TO service_role;
-- Freeze what existing URLs currently serve before drafts can change again.
INSERT INTO public.mvp_published_releases(project_id,revision,files)
SELECT p.id,'legacy',coalesce((SELECT v->'files' FROM jsonb_array_elements(coalesce(p.versions,'[]')) v ORDER BY coalesce((v->>'version_number')::int,0) DESC LIMIT 1),p.project_files,'[]')
FROM public.mvp_projects p WHERE p.subdomain_slug IS NOT NULL AND p.deployment_status='deployed'
ON CONFLICT(project_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.mvp_workflow_snapshot(p public.mvp_projects) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT jsonb_build_object('files',p.project_files,'workflow',p.metadata#>'{setupInput,workflow}','publicKey',p.metadata#>'{setupInput,workflowPublicKey}','projectType',p.project_type,'connectionId',p.supabase_connection_id,'projectId',p.id,'backend',p.metadata#>'{integrations,supabase,project}');
$$;
CREATE OR REPLACE FUNCTION public.mvp_workflow_revision(p public.mvp_projects) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path=public,extensions AS $$ SELECT encode(digest(public.mvp_workflow_snapshot(p)::text,'sha256'),'hex'); $$;

CREATE OR REPLACE FUNCTION public.request_mvp_workflow_test(p_project_id uuid) RETURNS uuid
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
 IF p.supabase_connection_id IS NULL THEN RAISE EXCEPTION 'Connect a database for this saved workflow'; END IF;
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
REVOKE ALL ON FUNCTION public.request_mvp_workflow_test(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_mvp_workflow_test(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_mvp_workflow_test() RETURNS SETOF public.mvp_build_tests
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE job uuid;
BEGIN
 SELECT id INTO job FROM public.mvp_build_tests WHERE status='queued' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1;
 RETURN QUERY UPDATE public.mvp_build_tests SET status='running',lease=gen_random_uuid(),lease_until=now()+interval '10 minutes' WHERE id=job RETURNING *;
END $$;
REVOKE ALL ON FUNCTION public.claim_mvp_workflow_test() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_mvp_workflow_test() TO service_role;

CREATE OR REPLACE FUNCTION public.finish_mvp_workflow_test(p_id uuid,p_lease uuid,p_assertions jsonb,p_files jsonb,p_failure text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE passed boolean;
BEGIN
 passed:=p_failure IS NULL AND p_assertions @> '{"customer_task":true,"database_write":true,"persisted_after_reload":true,"access_control":true,"no_runtime_errors":true,"responsive_ui":true,"cleanup":true}'::jsonb;
 IF passed AND (jsonb_typeof(p_files) IS DISTINCT FROM 'array' OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_files) f WHERE f->>'filename'='index.html') OR octet_length(p_files::text)>8000000) THEN RAISE EXCEPTION 'Invalid built artifact'; END IF;
 UPDATE public.mvp_build_tests SET status=CASE WHEN passed THEN 'passed' ELSE 'failed' END,assertions=p_assertions,artifact_files=CASE WHEN passed THEN p_files ELSE NULL END,failure_details=left(p_failure,2000),finished_at=now(),lease_until=NULL
 WHERE id=p_id AND lease=p_lease AND status='running' AND lease_until>now();
 IF NOT FOUND THEN RAISE EXCEPTION 'Test lease expired or result already recorded'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.finish_mvp_workflow_test(uuid,uuid,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_mvp_workflow_test(uuid,uuid,jsonb,jsonb,text) TO service_role;

CREATE OR REPLACE FUNCTION public.publish_tested_mvp(p_project_id uuid,p_user_id uuid,p_test_id uuid,p_slug text,p_url text,p_reservation_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.mvp_projects; t public.mvp_build_tests; charged jsonb;
BEGIN
 SELECT * INTO p FROM public.mvp_projects WHERE id=p_project_id AND user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
 SELECT * INTO t FROM public.mvp_build_tests WHERE id=p_test_id AND project_id=p.id AND user_id=p.user_id AND status='passed';
 IF NOT FOUND OR t.revision IS DISTINCT FROM public.mvp_workflow_revision(p) THEN RAISE EXCEPTION 'Test the current saved revision before publishing'; END IF;
 IF p.subdomain_slug IS NOT NULL AND p.subdomain_slug<>p_slug THEN RAISE EXCEPTION 'Published address cannot change'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.mvp_builder_credit_reservations WHERE id=p_reservation_id AND user_id=p_user_id AND action_feature='APP_BUILDER_DEPLOY' AND idempotency_key='workflow-publish:'||p_project_id::text||':'||p_test_id::text) THEN RAISE EXCEPTION 'Invalid publication reservation'; END IF;
 charged:=public.finalize_mvp_builder_credit_reservation(p_reservation_id,jsonb_build_object('projectId',p_project_id,'testRunId',p_test_id));
 IF NOT coalesce((charged->>'success')::boolean,false) THEN RAISE EXCEPTION 'Could not finalize publication credits'; END IF;
 INSERT INTO public.mvp_published_releases(project_id,test_run_id,revision,files) VALUES(p.id,t.id,t.revision,t.artifact_files)
 ON CONFLICT(project_id) DO UPDATE SET test_run_id=excluded.test_run_id,revision=excluded.revision,files=excluded.files,published_at=now();
 UPDATE public.mvp_projects SET subdomain_slug=p_slug,deployment_url=p_url,deployment_status='deployed',metadata=jsonb_set(coalesce(metadata,'{}'),'{lastPublishValidation}',jsonb_build_object('testRunId',t.id,'revision',t.revision,'assertions',t.assertions,'validatedAt',t.finished_at)) WHERE id=p.id;
END $$;
REVOKE ALL ON FUNCTION public.publish_tested_mvp(uuid,uuid,uuid,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.publish_tested_mvp(uuid,uuid,uuid,text,text,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.get_published_mvp_file_v2(p_slug text, p_path text)
RETURNS TABLE(
  content text,
  filename text,
  seo_indexable boolean,
  seo_title text,
  seo_description text,
  seo_image_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project public.mvp_projects;
  v_files jsonb;
  v_norm text;
  v_validation jsonb;
BEGIN
  IF p_slug IS NULL OR btrim(p_slug) = '' THEN
    RETURN;
  END IF;

  SELECT * INTO v_project
  FROM public.mvp_projects
  WHERE subdomain_slug = lower(btrim(p_slug))
    AND deployment_status = 'deployed'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT files INTO v_files FROM public.mvp_published_releases WHERE project_id=v_project.id;

  IF v_files IS NULL OR jsonb_typeof(v_files) <> 'array' THEN
    RETURN;
  END IF;

  v_norm := lower(regexp_replace(COALESCE(NULLIF(btrim(p_path), ''), 'index.html'), '^(\./|/)+', ''));
  IF v_norm = '' THEN v_norm := 'index.html'; END IF;
  v_validation := COALESCE(v_project.metadata -> 'lastPublishValidation', '{}'::jsonb);

  RETURN QUERY
  SELECT
    f.value ->> 'content',
    COALESCE(f.value ->> 'filename', f.value ->> 'path'),
    (
      v_norm = 'index.html'
      AND v_project.project_type = 'html_single'
      AND v_project.search_indexing_requested
      AND v_project.search_indexing_review_status = 'approved'
      AND char_length(btrim(COALESCE(v_project.seo_title, ''))) BETWEEN 10 AND 60
      AND char_length(btrim(COALESCE(v_project.seo_description, ''))) BETWEEN 50 AND 160
      AND (COALESCE((v_validation #>> '{smokeTest,passed}')::boolean, false) OR COALESCE((v_validation #>> '{assertions,customer_task}')::boolean,false))
    ),
    v_project.seo_title,
    v_project.seo_description,
    v_project.seo_image_url
  FROM jsonb_array_elements(v_files) f
  WHERE lower(regexp_replace(COALESCE(f.value ->> 'filename', f.value ->> 'path', ''), '^(\./|/)+', '')) = v_norm
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_published_mvp_file_v2(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_published_mvp_file_v2(text, text) TO anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION public.get_published_mvp_file(p_slug text,p_path text) RETURNS TABLE(content text,filename text)
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT v.content,v.filename FROM public.get_published_mvp_file_v2(p_slug,p_path) v; $$;
CREATE OR REPLACE FUNCTION public.inspect_mvp_workflow_test(p_project_id uuid,p_user_id uuid,p_test_id uuid) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('id',t.id,'revision',t.revision,'alreadyPublished',coalesce(r.test_run_id=t.id,false))
 FROM public.mvp_projects p JOIN public.mvp_build_tests t ON t.project_id=p.id AND t.user_id=p.user_id
 LEFT JOIN public.mvp_published_releases r ON r.project_id=p.id
 WHERE p.id=p_project_id AND p.user_id=p_user_id AND t.id=p_test_id AND t.status='passed' AND t.revision=public.mvp_workflow_revision(p);
$$;
REVOKE ALL ON FUNCTION public.inspect_mvp_workflow_test(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.inspect_mvp_workflow_test(uuid,uuid,uuid) TO service_role;
-- Owner edits cannot bypass publication by updating a protected column directly.
CREATE OR REPLACE FUNCTION public.guard_mvp_publication() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.role() IN ('anon','authenticated') AND (NEW.subdomain_slug IS DISTINCT FROM OLD.subdomain_slug OR NEW.deployment_status IS DISTINCT FROM OLD.deployment_status OR NEW.deployment_url IS DISTINCT FROM OLD.deployment_url) THEN
 RAISE EXCEPTION 'Use the tested publication endpoint'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_mvp_publication ON public.mvp_projects;
CREATE TRIGGER guard_mvp_publication BEFORE UPDATE ON public.mvp_projects FOR EACH ROW EXECUTE FUNCTION public.guard_mvp_publication();
CREATE TABLE IF NOT EXISTS public.mvp_edit_checkpoints(project_id uuid PRIMARY KEY REFERENCES public.mvp_projects(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,snapshot jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.mvp_edit_checkpoints ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mvp_edit_checkpoints FROM anon,authenticated;
CREATE OR REPLACE FUNCTION public.mvp_edit_checkpoint(p_project_id uuid,p_restore boolean DEFAULT false) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.mvp_projects; s jsonb;
BEGIN
 SELECT * INTO p FROM public.mvp_projects WHERE id=p_project_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
 IF p_restore THEN
  SELECT snapshot INTO s FROM public.mvp_edit_checkpoints WHERE project_id=p.id AND user_id=auth.uid();
  IF s IS NULL THEN RAISE EXCEPTION 'No checkpoint exists yet'; END IF;
  UPDATE public.mvp_projects SET project_files=s->'project_files',generated_code=s->>'generated_code',versions=s->'versions',metadata=s->'metadata',project_type=s->>'project_type',updated_at=now() WHERE id=p.id;
 ELSE
  INSERT INTO public.mvp_edit_checkpoints(project_id,user_id,snapshot) VALUES(p.id,p.user_id,to_jsonb(p)) ON CONFLICT(project_id) DO UPDATE SET snapshot=excluded.snapshot,created_at=now();
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.mvp_edit_checkpoint(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mvp_edit_checkpoint(uuid,boolean) TO authenticated;
COMMIT;
