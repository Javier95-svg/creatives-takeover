import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getUserFromAuth } from '../_shared/credit-deduction.ts';
import { publicKeyError } from '../_shared/mvp-workflow.ts';
import { workflowWorkerAvailable } from '../_shared/mvp-worker-health.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,x-worker-key'};
const response=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json'}});
async function equalSecret(a:string,b:string){
  if(!a || b.length<32)return false;
  const digest=async(s:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
  const [x,y]=await Promise.all([digest(a),digest(b)]);let mismatch=0;for(let i=0;i<x.length;i++)mismatch|=x[i]^y[i];return mismatch===0;
}
serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{headers:cors});
  if(req.method!=='POST')return response({error:'POST required'},405);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  try{
    const body=await req.json();
    if(await equalSecret(req.headers.get('x-worker-key')||'',Deno.env.get('MVP_WORKFLOW_WORKER_SECRET')||'')){
      if(body.action==='claim' || body.action==='heartbeat'){
        const {error:healthError}=await db.from('mvp_workflow_worker_health').upsert({id:true,last_seen:new Date().toISOString()});
        if(healthError)throw healthError;
        if(body.action==='heartbeat')return response({ok:true});
        const {data,error}=await db.rpc('claim_mvp_workflow_test');if(error)throw error;
        return response({job:data?.[0] || null});
      }
      if(body.action==='finish'){
        const {error}=await db.rpc('finish_mvp_workflow_test',{p_id:body.id,p_lease:body.lease,p_assertions:body.assertions || {},p_files:body.files || null,p_failure:body.failure || null});
        if(error)throw error;return response({ok:true});
      }
      return response({error:'Unknown worker action'},400);
    }
    const user=await getUserFromAuth(req);if(!user)return response({error:'Sign in first'},401);
    const {data:health}=await db.from('mvp_workflow_worker_health').select('last_seen').eq('id',true).maybeSingle();
    const available=workflowWorkerAvailable(Deno.env.get('MVP_WORKFLOW_WORKER_SECRET')||'',health?.last_seen);
    if(body.action==='status')return response({available});
    if(body.action!=='request')return response({error:'Unknown action'},400);
    if(!available)return response({error:'Workflow testing and new publishing are temporarily unavailable. Existing apps remain editable and exportable. No credits were charged.'},503);
    const {data:project}=await db.from('mvp_projects').select('metadata,supabase_connection_id').eq('id',body.projectId).eq('user_id',user.id).maybeSingle();
    if(!project)return response({error:'Project not found'},404);
    const keyError=publicKeyError(project.metadata?.setupInput?.workflowPublicKey);
    if(keyError)return response({error:keyError},400);
    const {data:connection}=await db.from('mvp_builder_supabase_connections').select('status,supabase_account_id').eq('id',project.supabase_connection_id).eq('user_id',user.id).maybeSingle();
    if(connection?.status!=='connected' || connection.supabase_account_id!==project.metadata?.integrations?.supabase?.project?.projectUrl)return response({error:'Reconnect the database selected for this product.'},409);
    if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(connection.supabase_account_id))return response({error:'Unsupported database address.'},400);
    const readiness=await fetch(connection.supabase_account_id+'/rest/v1/rpc/ct_mvp_workflow_health',{method:'POST',headers:{apikey:project.metadata.setupInput.workflowPublicKey,'Content-Type':'application/json'},body:JSON.stringify({p_project_key:body.projectId}),signal:AbortSignal.timeout(10000),redirect:'error'});
    if(!readiness.ok || await readiness.json()!==true)return response({error:'Install the workflow schema and register the owner account in your connected database. Open Review scope → Database setup.'},409);
    // Run the owner-scoped RPC under the caller's JWT, never service_role.
    const caller=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('authorization')!}},auth:{persistSession:false}});
    const {data,error}=await caller.rpc('request_mvp_workflow_test',{p_project_id:body.projectId});if(error)throw error;
    return response({id:data});
  }catch(e){return response({error:e instanceof Error?e.message:(e as {message?:string})?.message || 'Workflow test request failed'},400);}
});
