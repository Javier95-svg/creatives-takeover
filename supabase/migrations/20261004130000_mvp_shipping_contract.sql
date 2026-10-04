BEGIN;
SET LOCAL lock_timeout='5s';
CREATE OR REPLACE FUNCTION public.request_mvp_workflow_test_legacy(p_project_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.mvp_projects; w jsonb; r text; existing uuid; brief jsonb; words text; expected text;
BEGIN
 SELECT * INTO p FROM public.mvp_projects WHERE id=p_project_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
 w:=p.metadata#>'{setupInput,workflow}';
 IF w IS NULL OR w->>'version'<>'1' OR coalesce(w->>'starter','') NOT IN ('lead_capture','request_management','customer_portal')
 OR length(btrim(coalesce(w->>'customer','')))=0 OR length(btrim(coalesce(w->>'task','')))=0 OR length(btrim(coalesce(w->>'outcome','')))=0
 OR jsonb_typeof(w->'features') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Define a supported customer workflow first'; END IF;
 IF octet_length(w::text)>4096 OR jsonb_array_length(w->'features') NOT BETWEEN 1 AND 3 OR EXISTS(SELECT 1 FROM jsonb_array_elements(w->'features') f WHERE jsonb_typeof(f)<>'string' OR length(btrim(f#>>'{}')) NOT BETWEEN 1 AND 200) THEN RAISE EXCEPTION 'Choose one to three essential features'; END IF;
 brief:=p.metadata#>'{setupInput,buildBrief}';
 IF jsonb_typeof(brief)='object' THEN
  IF brief->>'delivery'<>'connected' THEN RAISE EXCEPTION 'Choose connected mode for this workflow'; END IF;
  words:=concat_ws(' ',brief->>'idea',brief->>'task',brief->>'features');
  expected:=CASE
   WHEN brief->>'kind'='landing' AND words ~* '\m(lead|waitlist|signup|sign.up|email|referr|contact form|newsletter)' THEN 'lead_capture'
   WHEN brief->>'kind' IN ('app','saas','internal') AND words ~* '\m(request|ticket|support inbox|status tracking)' AND words !~* '\m(subscription|paid access|billing)' THEN 'request_management'
   WHEN brief->>'kind' IN ('app','saas') AND words !~* '\m(book|reserv|appointment|capacity|habit|streak|check.in|subscription|paid access|billing)' THEN 'customer_portal'
   ELSE NULL END;
  IF expected IS NULL OR w->>'starter'<>expected THEN RAISE EXCEPTION 'Workflow does not match a supported connected product plan'; END IF;
 END IF;
 IF p.metadata#>>'{setupInput,managedApp}'='true' THEN
   IF NOT EXISTS(SELECT 1 FROM public.mvp_managed_apps a WHERE a.project_id=p.id AND a.user_id=p.user_id AND a.status='ready' AND jsonb_typeof(a.public_runtime)='object'
     AND ((a.manifest->>'profile'='private_records' AND w->>'starter'='customer_portal' AND p.metadata#>>'{setupInput,buildBrief,kind}' IN ('app','saas'))
       OR (a.manifest->>'profile'='request_management' AND w->>'starter'='request_management' AND p.metadata#>>'{setupInput,buildBrief,kind}' IN ('app','internal','saas'))
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

REVOKE ALL ON FUNCTION public.request_mvp_workflow_test_legacy(uuid) FROM PUBLIC,anon,authenticated;
-- Probe a checked artifact on its actual public hostname before charging or switching releases.
CREATE TABLE public.mvp_release_probes(
 token uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES public.mvp_projects(id) ON DELETE CASCADE,
 test_id uuid NOT NULL REFERENCES public.mvp_build_tests(id) ON DELETE CASCADE, slug text NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes'
);
ALTER TABLE public.mvp_release_probes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mvp_release_probes FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.mvp_release_probes TO service_role;
CREATE FUNCTION public.get_mvp_release_probe_file(p_token uuid,p_slug text,p_path text)
RETURNS TABLE(content text,filename text,revision text)
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT f->>'content',f->>'filename',t.revision FROM mvp_release_probes r
 JOIN mvp_build_tests t ON t.id=r.test_id AND t.project_id=r.project_id
 CROSS JOIN LATERAL jsonb_array_elements(t.artifact_files) f
 WHERE r.token=p_token AND r.slug=p_slug AND r.expires_at>now() AND t.status='passed'
 AND f->>'filename'=coalesce(nullif(regexp_replace(coalesce(p_path,''),'^/+',''),''),'index.html') LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_mvp_release_probe_file(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mvp_release_probe_file(uuid,text,text) TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.claim_mvp_outcome_repair(p_test uuid,p_user uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.mvp_build_tests;p public.mvp_projects;b public.mvp_repair_budgets;repair uuid;
BEGIN
 SELECT * INTO t FROM public.mvp_build_tests WHERE id=p_test AND user_id=p_user;
 IF NOT FOUND OR t.status<>'failed' OR t.assertions='{}' OR t.assertions->>'cleanup' IS DISTINCT FROM 'true' OR t.assertions->>'code_failure' IS DISTINCT FROM 'true' OR t.assertions->>'infrastructure_failure'='true' THEN RAISE EXCEPTION 'Retry the check after restoring the test service; no code repair was started'; END IF;
 SELECT * INTO p FROM public.mvp_projects WHERE id=t.project_id AND user_id=p_user FOR UPDATE;
 IF NOT FOUND OR public.mvp_workflow_revision(p)<>t.revision THEN RAISE EXCEPTION 'The app changed. Check the current saved version first'; END IF;
 IF EXISTS(SELECT 1 FROM public.mvp_outcome_repairs WHERE test_id=t.id) THEN RAISE EXCEPTION 'A repair was already attempted for this check. Run a fresh check'; END IF;
 IF EXISTS(SELECT 1 FROM public.mvp_outcome_repairs WHERE project_id=p.id AND status='running' AND created_at>now()-interval '3 minutes') THEN RAISE EXCEPTION 'A repair is already running'; END IF;
 UPDATE public.mvp_outcome_repairs SET status='failed',failure='Repair interrupted; original files were preserved' WHERE project_id=p.id AND status='running' AND created_at<=now()-interval '3 minutes';
 SELECT * INTO b FROM public.mvp_repair_budgets WHERE project_id=p.id AND user_id=p_user AND source_hash=public.mvp_source_fingerprint(p.project_files) AND attempts<2 ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'No included repairs remain for this source. Describe another change to review a new quote'; END IF;
 UPDATE public.mvp_repair_budgets SET attempts=attempts+1 WHERE reservation_id=b.reservation_id;
 INSERT INTO public.mvp_outcome_repairs(test_id,reservation_id,project_id,user_id,revision) VALUES(t.id,b.reservation_id,p.id,p_user,t.revision) RETURNING id INTO repair;
 RETURN jsonb_build_object('id',repair,'snapshot',t.snapshot,'failure',t.failure_details,'assertions',t.assertions,'attempt',b.attempts+1);
END $$;

ALTER FUNCTION public.finish_mvp_workflow_test(uuid,uuid,jsonb,jsonb,text) RENAME TO finish_mvp_workflow_test_before_shipping;
REVOKE ALL ON FUNCTION public.finish_mvp_workflow_test_before_shipping(uuid,uuid,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.finish_mvp_workflow_test(p_id uuid,p_lease uuid,p_assertions jsonb,p_files jsonb,p_failure text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE starter text;
BEGIN
 SELECT snapshot#>>'{workflow,starter}' INTO starter FROM mvp_build_tests WHERE id=p_id AND lease=p_lease AND status='running' AND lease_until>now();
 IF starter IS NOT NULL AND p_failure IS NULL AND p_assertions->>'failed_write' IS DISTINCT FROM 'true' THEN p_failure:='A rejected database write must be visibly handled'; END IF;
 IF starter='request_management' AND p_failure IS NULL AND NOT (p_assertions @> '{"requester_status":true,"owner_only_status":true}'::jsonb) THEN p_failure:='Verify requester visibility and owner-only status changes'; END IF;
 PERFORM public.finish_mvp_workflow_test_before_shipping(p_id,p_lease,p_assertions,p_files,p_failure);
END $$;
REVOKE ALL ON FUNCTION public.finish_mvp_workflow_test(uuid,uuid,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_mvp_workflow_test(uuid,uuid,jsonb,jsonb,text) TO service_role;

-- Preserve server-owned release metadata and refuse another session's newer draft.
CREATE FUNCTION public.save_mvp_project(p_project jsonb,p_expected_updated_at timestamptz DEFAULT NULL) RETURNS public.mvp_projects
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.mvp_projects; project_id uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 project_id:=(p_project->>'id')::uuid;
 IF jsonb_typeof(p_project->'project_files') IS DISTINCT FROM 'array' OR octet_length(p_project::text)>6000000 THEN RAISE EXCEPTION 'Invalid or oversized draft'; END IF;
 SELECT * INTO p FROM mvp_projects WHERE id=project_id AND user_id=auth.uid() FOR UPDATE;
 IF FOUND THEN
  IF p.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'Another session changed this app. Reopen it before replacing the saved draft'; END IF;
 ELSE
  INSERT INTO mvp_projects(id,user_id,title) VALUES(project_id,auth.uid(),coalesce(nullif(p_project->>'title',''),'My MVP')) ON CONFLICT(id) DO NOTHING RETURNING * INTO p;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project already exists. Reopen it before saving'; END IF;
 END IF;
 UPDATE mvp_projects SET title=p_project->>'title',prompt_history=coalesce(p_project->'prompt_history','[]'),generated_code=p_project->>'generated_code',
 project_type=p_project->>'project_type',template=p_project->>'template',project_files=p_project->'project_files',versions=coalesce(p_project->'versions','[]'),
 github_connection_id=nullif(p_project->>'github_connection_id','')::uuid,supabase_connection_id=nullif(p_project->>'supabase_connection_id','')::uuid,
 metadata=coalesce(p.metadata,'{}')||jsonb_build_object('setupInput',p_project#>'{metadata,setupInput}','integrations',p_project#>'{metadata,integrations}','framework',p_project#>'{metadata,framework}','phase','mvp_builder_shipping','buildCommand',p_project#>'{metadata,buildCommand}','devCommand',p_project#>'{metadata,devCommand}'),updated_at=clock_timestamp()
 WHERE id=project_id AND user_id=auth.uid() RETURNING * INTO p;
 RETURN p;
END $$;
REVOKE ALL ON FUNCTION public.save_mvp_project(jsonb,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_mvp_project(jsonb,timestamptz) TO authenticated;

-- Provider outages return a claimed repair slot exactly once.
CREATE FUNCTION public.release_mvp_repair_attempt(p_repair uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.mvp_outcome_repairs;
BEGIN
 SELECT * INTO r FROM public.mvp_outcome_repairs WHERE id=p_repair FOR UPDATE;
 IF NOT FOUND OR r.status<>'running' THEN RETURN; END IF;
 UPDATE public.mvp_outcome_repairs SET status='failed',failure='Repair service unavailable. Included attempt preserved; retry the check.' WHERE id=r.id;
 UPDATE public.mvp_repair_budgets SET attempts=greatest(0,attempts-1) WHERE reservation_id=r.reservation_id;
END $$;
REVOKE ALL ON FUNCTION public.release_mvp_repair_attempt(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_mvp_repair_attempt(uuid) TO service_role;

-- Reconcile the October rollback: freeze what legacy sites currently serve,
-- retain checked releases, restore immutable serving and the publication guard.
INSERT INTO public.mvp_published_releases(project_id,revision,files)
SELECT p.id,'legacy-reconciled-'||md5(live.files::text),live.files FROM public.mvp_projects p
CROSS JOIN LATERAL(SELECT coalesce((SELECT v->'files' FROM jsonb_array_elements(coalesce(p.versions,'[]')) v ORDER BY coalesce((v->>'version_number')::int,0) DESC LIMIT 1),p.project_files) files) live
WHERE p.deployment_status='deployed' AND p.subdomain_slug IS NOT NULL AND jsonb_typeof(live.files)='array'
AND p.metadata#>>'{lastPublishValidation,testRunId}' IS NULL
ON CONFLICT(project_id) DO UPDATE SET test_run_id=NULL,revision=excluded.revision,files=excluded.files,published_at=now();
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

CREATE OR REPLACE FUNCTION public.guard_mvp_publication() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.role() IN ('anon','authenticated') AND (NEW.subdomain_slug IS DISTINCT FROM OLD.subdomain_slug OR NEW.deployment_status IS DISTINCT FROM OLD.deployment_status OR NEW.deployment_url IS DISTINCT FROM OLD.deployment_url) THEN
 RAISE EXCEPTION 'Use the tested publication endpoint'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_mvp_publication ON public.mvp_projects;
CREATE TRIGGER guard_mvp_publication BEFORE UPDATE ON public.mvp_projects FOR EACH ROW EXECUTE FUNCTION public.guard_mvp_publication();

DO $$ BEGIN
 IF to_regnamespace('cron') IS NOT NULL AND to_regprocedure('public.trigger_mvp_setup_jobs()') IS NOT NULL THEN
  PERFORM cron.schedule('ct-mvp-setup-jobs','* * * * *','SELECT public.trigger_mvp_setup_jobs();');
 END IF;
END $$;

-- A released hold can be retried without changing the tested-revision charge identity.
CREATE FUNCTION public.reserve_mvp_publication_credits(p_user uuid,p_project uuid,p_test uuid,p_price integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE charge_key text:='workflow-publish:'||p_project::text||':'||p_test::text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(charge_key,0));
 IF public.inspect_mvp_workflow_test(p_project,p_user,p_test) IS NULL THEN RAISE EXCEPTION 'Check the current saved app before publishing'; END IF;
 UPDATE public.mvp_builder_credit_reservations SET idempotency_key=charge_key||':retry:'||id::text
 WHERE user_id=p_user AND idempotency_key=charge_key AND status IN ('released','expired');
 RETURN public.reserve_mvp_builder_credits(p_user,'APP_BUILDER_DEPLOY',p_price,charge_key,jsonb_build_object('projectId',p_project,'testId',p_test,'mvpBuilderActionType','publish','featureCode','APP_BUILDER_DEPLOY'));
END $$;
REVOKE ALL ON FUNCTION public.reserve_mvp_publication_credits(uuid,uuid,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_mvp_publication_credits(uuid,uuid,uuid,integer) TO service_role;

-- Observed customer records are context, never visitor-derived cohort retention.
CREATE TABLE public.mvp_app_activity(
 project_id uuid PRIMARY KEY REFERENCES public.mvp_projects(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 completed_records bigint NOT NULL CHECK(completed_records>=0),observed_at timestamptz NOT NULL
);
ALTER TABLE public.mvp_app_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY activity_owner_read ON public.mvp_app_activity FOR SELECT TO authenticated USING(user_id=auth.uid());
REVOKE ALL ON public.mvp_app_activity FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.mvp_app_activity TO authenticated;
GRANT ALL ON public.mvp_app_activity TO service_role;
CREATE FUNCTION public.get_mvp_workflow_activity() RETURNS TABLE(completed_records bigint,observed_at timestamptz)
LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$
 SELECT coalesce(sum(a.completed_records),0)::bigint,max(a.observed_at) FROM public.mvp_app_activity a WHERE a.user_id=auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_mvp_workflow_activity() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_mvp_workflow_activity() TO authenticated;
-- Browser error categories are unverified diagnostics, never outcome evidence.
CREATE TABLE public.mvp_app_error_counts(
 project_id uuid NOT NULL REFERENCES public.mvp_projects(id) ON DELETE CASCADE,
 hour_start timestamptz NOT NULL, kind text NOT NULL CHECK(kind IN ('runtime','write','auth','network')),
 reports integer NOT NULL CHECK(reports BETWEEN 1 AND 100),PRIMARY KEY(project_id,hour_start,kind)
);
ALTER TABLE public.mvp_app_error_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_errors_owner_read ON public.mvp_app_error_counts FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.mvp_projects p WHERE p.id=project_id AND p.user_id=auth.uid()));
REVOKE ALL ON public.mvp_app_error_counts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.mvp_app_error_counts TO authenticated;
GRANT ALL ON public.mvp_app_error_counts TO service_role;
CREATE FUNCTION public.report_mvp_app_error(p_slug text,p_kind text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pid uuid;
BEGIN
 IF p_kind NOT IN ('runtime','write','auth','network') OR length(p_slug)>64 THEN RETURN; END IF;
 SELECT p.id INTO pid FROM public.mvp_projects p JOIN public.mvp_published_releases r ON r.project_id=p.id WHERE p.subdomain_slug=p_slug AND p.deployment_status='deployed';
 IF pid IS NULL THEN RETURN; END IF;
 INSERT INTO public.mvp_app_error_counts VALUES(pid,date_trunc('hour',now()),p_kind,1)
 ON CONFLICT(project_id,hour_start,kind) DO UPDATE SET reports=least(100,mvp_app_error_counts.reports+1);
END $$;
REVOKE ALL ON FUNCTION public.report_mvp_app_error(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_mvp_app_error(text,text) TO anon,authenticated;
COMMIT;
