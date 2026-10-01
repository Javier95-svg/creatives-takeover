BEGIN;
SET LOCAL lock_timeout='5s';
-- Reuse the existing operator-owned cron credential; never send a user JWT.
CREATE FUNCTION public.trigger_mvp_setup_jobs() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE base text;secret text;job record;
BEGIN
 SELECT value INTO base FROM private.service_config WHERE key='supabase_url';
 SELECT value INTO secret FROM private.service_config WHERE key='core_tools_cron_secret';
 IF base IS NULL OR length(coalesce(secret,''))<32 THEN RETURN; END IF;
 FOR job IN SELECT project_id FROM public.mvp_managed_apps WHERE status NOT IN ('ready','review','failed') AND next_attempt_at<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY next_attempt_at LIMIT 5 LOOP
  PERFORM net.http_post(url:=base||'/functions/v1/mvp-managed-app',headers:=jsonb_build_object('Content-Type','application/json','x-core-cron-secret',secret),body:=jsonb_build_object('action','advance','projectId',job.project_id));
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.trigger_mvp_setup_jobs() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_mvp_setup_jobs() TO service_role;
SELECT cron.schedule('ct-mvp-setup-jobs','* * * * *',$$SELECT public.trigger_mvp_setup_jobs();$$);
COMMIT;
