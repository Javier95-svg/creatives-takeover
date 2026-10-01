BEGIN;
SET LOCAL lock_timeout='5s';

CREATE FUNCTION public.mvp_source_fingerprint(files jsonb) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public,extensions AS $$
 SELECT encode(digest(coalesce(jsonb_agg(jsonb_build_object('filename',f->>'filename','content',f->>'content') ORDER BY f->>'filename'),'[]')::text,'sha256'),'hex') FROM jsonb_array_elements(files) f;
$$;
CREATE TABLE public.mvp_repair_budgets(
 reservation_id uuid PRIMARY KEY REFERENCES public.mvp_builder_credit_reservations(id),
 project_id uuid NOT NULL,user_id uuid NOT NULL REFERENCES auth.users(id),source_hash text NOT NULL,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 2),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.mvp_outcome_repairs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),test_id uuid UNIQUE NOT NULL REFERENCES public.mvp_build_tests(id),
 reservation_id uuid NOT NULL REFERENCES public.mvp_repair_budgets(reservation_id),
 project_id uuid NOT NULL,user_id uuid NOT NULL,revision text NOT NULL,status text NOT NULL DEFAULT 'running' CHECK(status IN ('running','applied','failed')),
 failure text,changed_files jsonb NOT NULL DEFAULT '[]',created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mvp_repair_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvp_outcome_repairs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mvp_repair_budgets,public.mvp_outcome_repairs FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.mvp_repair_budgets,public.mvp_outcome_repairs TO service_role;
CREATE POLICY owner_read ON public.mvp_outcome_repairs FOR SELECT TO authenticated USING(user_id=auth.uid());
GRANT SELECT ON public.mvp_outcome_repairs TO authenticated;

CREATE FUNCTION public.register_mvp_repair_budget(p_reservation uuid,p_files jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.mvp_builder_credit_reservations;
BEGIN
 SELECT * INTO r FROM public.mvp_builder_credit_reservations WHERE id=p_reservation AND status='finalized';
 IF NOT FOUND OR r.action_feature='APP_BUILDER_CHAT' OR coalesce(r.metadata->>'projectId','') !~* '^[0-9a-f-]{36}$' THEN RETURN; END IF;
 INSERT INTO public.mvp_repair_budgets(reservation_id,project_id,user_id,source_hash) VALUES(r.id,(r.metadata->>'projectId')::uuid,r.user_id,public.mvp_source_fingerprint(p_files)) ON CONFLICT DO NOTHING;
END $$;
CREATE FUNCTION public.claim_mvp_outcome_repair(p_test uuid,p_user uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.mvp_build_tests;p public.mvp_projects;b public.mvp_repair_budgets;repair uuid;
BEGIN
 SELECT * INTO t FROM public.mvp_build_tests WHERE id=p_test AND user_id=p_user;
 IF NOT FOUND OR t.status<>'failed' OR t.assertions='{}' OR t.assertions->>'cleanup' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Retry the check after restoring the test service; no code repair was started'; END IF;
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
CREATE FUNCTION public.apply_mvp_outcome_repair(p_repair uuid,p_files jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.mvp_outcome_repairs;p public.mvp_projects;changes jsonb;
BEGIN
 SELECT * INTO r FROM public.mvp_outcome_repairs WHERE id=p_repair FOR UPDATE;
 IF NOT FOUND OR r.status<>'running' OR r.created_at<now()-interval '3 minutes' THEN RAISE EXCEPTION 'Repair expired or already completed'; END IF;
 SELECT * INTO p FROM public.mvp_projects WHERE id=r.project_id AND user_id=r.user_id FOR UPDATE;
 IF NOT FOUND OR public.mvp_workflow_revision(p)<>r.revision THEN RAISE EXCEPTION 'The app changed during repair. Original files were preserved'; END IF;
 IF jsonb_typeof(p_files) IS DISTINCT FROM 'array' OR jsonb_array_length(p_files)=0 OR octet_length(p_files::text)>4000000 THEN RAISE EXCEPTION 'Invalid repaired files'; END IF;
 SELECT coalesce(jsonb_agg(f->>'filename'),'[]') INTO changes FROM jsonb_array_elements(p_files) f WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p.project_files) old WHERE old->>'filename'=f->>'filename' AND old->>'content'=f->>'content');
 IF changes='[]' THEN RAISE EXCEPTION 'Repair made no changes'; END IF;
 INSERT INTO public.mvp_edit_checkpoints(project_id,user_id,snapshot) VALUES(p.id,p.user_id,to_jsonb(p)) ON CONFLICT(project_id) DO UPDATE SET snapshot=excluded.snapshot,created_at=now();
 UPDATE public.mvp_projects SET project_files=p_files,generated_code=(SELECT f->>'content' FROM jsonb_array_elements(p_files) f WHERE f->>'filename'='index.html' LIMIT 1),updated_at=now() WHERE id=p.id;
 UPDATE public.mvp_repair_budgets SET source_hash=public.mvp_source_fingerprint(p_files) WHERE reservation_id=r.reservation_id;
 UPDATE public.mvp_outcome_repairs SET status='applied',changed_files=changes WHERE id=r.id;
 RETURN changes;
END $$;
REVOKE ALL ON FUNCTION public.register_mvp_repair_budget(uuid,jsonb),public.claim_mvp_outcome_repair(uuid,uuid),public.apply_mvp_outcome_repair(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.register_mvp_repair_budget(uuid,jsonb),public.claim_mvp_outcome_repair(uuid,uuid),public.apply_mvp_outcome_repair(uuid,jsonb) TO service_role;

ALTER TABLE public.mvp_managed_apps ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT now();
CREATE OR REPLACE FUNCTION public.claim_mvp_managed_app(p_project uuid) RETURNS SETOF public.mvp_managed_apps LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.mvp_managed_apps SET status='review',failure='Setup needs an operator check after repeated retries. Your draft and existing database are preserved.' WHERE project_id=p_project AND attempts>=40 AND status NOT IN ('ready','review','failed') AND (lease_until IS NULL OR lease_until<now());
 RETURN QUERY UPDATE public.mvp_managed_apps SET lease=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=attempts+1,next_attempt_at=now()+interval '1 minute'*least(10,1+attempts/5),updated_at=now()
 WHERE project_id=p_project AND status NOT IN ('ready','review','failed') AND next_attempt_at<=now() AND (lease_until IS NULL OR lease_until<now()) RETURNING *;
END $$;
COMMIT;
