-- The deploy operator sets core_tools_cron_secret in private.service_config and
-- CORE_TOOLS_CRON_SECRET in Edge Function secrets to the same random value.
CREATE FUNCTION public.trigger_core_tools_worker(p_worker text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE base text; secret text; BEGIN
 IF p_worker NOT IN ('core-connections','validation-sessions') THEN RAISE EXCEPTION 'Unsupported worker'; END IF;
 SELECT value INTO base FROM private.service_config WHERE key='supabase_url';
 SELECT value INTO secret FROM private.service_config WHERE key='core_tools_cron_secret';
 IF base IS NULL OR secret IS NULL THEN RETURN; END IF;
 PERFORM net.http_post(url:=base||'/functions/v1/'||p_worker,headers:=jsonb_build_object('Content-Type','application/json','x-core-cron-secret',secret),body:=jsonb_build_object('action',CASE WHEN p_worker='core-connections' THEN 'daily_sync' ELSE 'worker' END));
END $$;
REVOKE ALL ON FUNCTION public.trigger_core_tools_worker(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_core_tools_worker(text) TO service_role;
SELECT cron.schedule('ct-connected-data-refresh','*/15 * * * *',$$SELECT public.trigger_core_tools_worker('core-connections');$$);
SELECT cron.schedule('ct-validation-session-worker','*/5 * * * *',$$SELECT public.trigger_core_tools_worker('validation-sessions');$$);
