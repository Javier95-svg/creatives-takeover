-- Run stage guidance once daily. The Edge worker and claim RPC independently
-- require explicit consent, a confirmed stage and a pending stage action.
BEGIN;
CREATE OR REPLACE FUNCTION public.dispatch_stage_guidance_email_worker()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_url text := (SELECT value FROM private.service_config WHERE key='supabase_url');
  v_key text := (SELECT value FROM private.service_config WHERE key='supabase_service_key');
BEGIN
  IF v_url IS NULL OR v_key IS NULL THEN RETURN; END IF;
  PERFORM net.http_post(
    url := v_url || '/functions/v1/send-stage-guidance',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_key),
    body := '{"preview":false}'::jsonb
  );
END;
$$;
REVOKE ALL ON FUNCTION public.dispatch_stage_guidance_email_worker() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_stage_guidance_email_worker() TO service_role;
SELECT cron.schedule('stage-guidance-emails-daily','0 12 * * *',
  'SELECT public.dispatch_stage_guidance_email_worker()');
COMMIT;
