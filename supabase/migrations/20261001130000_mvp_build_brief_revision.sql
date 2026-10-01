BEGIN;
SET LOCAL lock_timeout = '5s';
-- Preserve legacy hashes; new product briefs participate in revision checks.
CREATE OR REPLACE FUNCTION public.mvp_workflow_snapshot(p public.mvp_projects)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT jsonb_build_object(
   'files',p.project_files,'workflow',p.metadata#>'{setupInput,workflow}',
   'publicKey',p.metadata#>'{setupInput,workflowPublicKey}',
   'projectType',p.project_type,'connectionId',p.supabase_connection_id,
   'projectId',p.id,'backend',p.metadata#>'{integrations,supabase,project}'
 ) || CASE WHEN jsonb_typeof(p.metadata#>'{setupInput,buildBrief}')='object'
   THEN jsonb_build_object('buildBrief',p.metadata#>'{setupInput,buildBrief}')
   ELSE '{}'::jsonb END;
$$;
COMMIT;
