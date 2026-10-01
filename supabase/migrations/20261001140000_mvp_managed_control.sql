-- CT PLATFORM DATABASE ONLY. Customer application tables live in separate projects.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE public.mvp_managed_pilot (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), enabled boolean NOT NULL DEFAULT false,
 base_monthly_cents integer NOT NULL CHECK(base_monthly_cents>=0), app_monthly_cents integer NOT NULL DEFAULT 1000 CHECK(app_monthly_cents>=1000),
 cost_observed_at timestamptz NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
-- Disabled until an operator supplies a complete, current provider cost forecast.
INSERT INTO public.mvp_managed_pilot VALUES(true,false,9000,1000,now(),now());
CREATE TABLE public.mvp_managed_invites(user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE);
CREATE TABLE public.mvp_managed_apps (
 project_id uuid PRIMARY KEY REFERENCES public.mvp_projects(id) ON DELETE RESTRICT,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 provider_ref text UNIQUE, organization_id text NOT NULL,
 manifest jsonb NOT NULL, config_version integer NOT NULL DEFAULT 1,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','creating','waiting','schema','auth','owner','ready','review','failed')),
 stage text NOT NULL DEFAULT 'Preparing your app', failure text,
 reserved_monthly_cents integer NOT NULL CHECK(reserved_monthly_cents>=1000),
 create_started_at timestamptz, owner_auth_id uuid,
 lease uuid, lease_until timestamptz, attempts integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.mvp_managed_secrets(project_id uuid PRIMARY KEY REFERENCES public.mvp_managed_apps(project_id) ON DELETE CASCADE, sealed text NOT NULL);
CREATE TABLE public.mvp_managed_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,project_id uuid REFERENCES public.mvp_managed_apps(project_id),kind text NOT NULL,detail text NOT NULL,created_at timestamptz DEFAULT now());
ALTER TABLE public.mvp_managed_pilot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvp_managed_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvp_managed_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvp_managed_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvp_managed_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mvp_managed_pilot,public.mvp_managed_invites,public.mvp_managed_apps,public.mvp_managed_secrets,public.mvp_managed_events FROM anon,authenticated;
GRANT ALL ON public.mvp_managed_pilot,public.mvp_managed_invites,public.mvp_managed_apps,public.mvp_managed_secrets,public.mvp_managed_events TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.mvp_managed_events_id_seq TO service_role;
CREATE POLICY owner_read ON public.mvp_managed_apps FOR SELECT TO authenticated USING(user_id=auth.uid());
GRANT SELECT(project_id,user_id,status,stage,failure,manifest,config_version,updated_at) ON public.mvp_managed_apps TO authenticated;

-- Called by the service after deriving a manifest from the owner's saved brief.
CREATE FUNCTION public.admit_mvp_managed_app(p_project uuid,p_user uuid,p_org text,p_manifest jsonb) RETURNS public.mvp_managed_apps
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE settings public.mvp_managed_pilot; app public.mvp_managed_apps; total bigint; count_apps int;
BEGIN
 SELECT * INTO settings FROM public.mvp_managed_pilot WHERE id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.mvp_projects WHERE id=p_project AND user_id=p_user) THEN RAISE EXCEPTION 'Project not found'; END IF;
 SELECT * INTO app FROM public.mvp_managed_apps WHERE project_id=p_project;
 IF FOUND THEN RETURN app; END IF;
 IF NOT settings.enabled OR NOT EXISTS(SELECT 1 FROM public.mvp_managed_invites WHERE user_id=p_user) THEN RAISE EXCEPTION 'Managed hosting is available to invited pilot accounts'; END IF;
 IF settings.cost_observed_at<now()-interval '1 day' OR settings.cost_observed_at>now()+interval '1 minute' THEN RAISE EXCEPTION 'Infrastructure forecast needs an operator refresh'; END IF;
 IF coalesce(p_manifest->>'version','')<>'1' OR coalesce(p_manifest->>'persistence','')<>'true' THEN RAISE EXCEPTION 'A supported data-backed manifest is required'; END IF;
 IF coalesce(length(p_org),0)<3 THEN RAISE EXCEPTION 'Managed organization is not configured'; END IF;
 SELECT count(*),coalesce(sum(reserved_monthly_cents),0) INTO count_apps,total FROM public.mvp_managed_apps;
 total:=total+settings.base_monthly_cents+settings.app_monthly_cents;
 IF count_apps>=10 OR total>=20000 THEN RAISE EXCEPTION 'Pilot infrastructure admission is paused'; END IF;
 INSERT INTO public.mvp_managed_apps(project_id,user_id,organization_id,manifest,reserved_monthly_cents)
 VALUES(p_project,p_user,p_org,p_manifest,settings.app_monthly_cents) RETURNING * INTO app;
 INSERT INTO public.mvp_managed_events(project_id,kind,detail) VALUES(p_project,CASE WHEN total>=17500 THEN 'budget_alert' ELSE 'admitted' END,'Projected monthly infrastructure cents: '||total);
 RETURN app;
END $$;
REVOKE ALL ON FUNCTION public.admit_mvp_managed_app(uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admit_mvp_managed_app(uuid,uuid,text,jsonb) TO service_role;

CREATE FUNCTION public.claim_mvp_managed_app(p_project uuid) RETURNS SETOF public.mvp_managed_apps
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 RETURN QUERY UPDATE public.mvp_managed_apps SET lease=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=attempts+1,updated_at=now()
 WHERE project_id=p_project AND status NOT IN ('ready','review','failed') AND (lease_until IS NULL OR lease_until<now()) RETURNING *;
END $$;
REVOKE ALL ON FUNCTION public.claim_mvp_managed_app(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_mvp_managed_app(uuid) TO service_role;

ALTER TABLE public.mvp_build_tests ADD COLUMN attempts integer NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.claim_mvp_workflow_test() RETURNS SETOF public.mvp_build_tests
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE job uuid;
BEGIN
 -- A lost worker gets at most two retries, never an unbounded queue loop.
 UPDATE public.mvp_build_tests SET status=CASE WHEN attempts<3 THEN 'queued' ELSE 'failed' END,
 lease=NULL,lease_until=NULL,failure_details='Worker interrupted. Retrying safely; contact support if this persists.',
 finished_at=CASE WHEN attempts>=3 THEN now() ELSE NULL END WHERE status='running' AND lease_until<now();
 SELECT id INTO job FROM public.mvp_build_tests WHERE status='queued' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1;
 RETURN QUERY UPDATE public.mvp_build_tests SET status='running',attempts=attempts+1,lease=gen_random_uuid(),lease_until=now()+interval '10 minutes' WHERE id=job RETURNING *;
END $$;
COMMIT;
