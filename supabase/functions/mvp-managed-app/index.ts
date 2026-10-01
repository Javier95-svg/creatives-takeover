import {serve} from 'https://deno.land/std@0.168.0/http/server.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import {getUserFromAuth} from '../_shared/credit-deduction.ts';
import {sealSecret,openSecret} from '../_shared/connection-secrets.ts';
import {buildBriefErrors} from '../_shared/mvp-build-brief.ts';
import {deriveCapabilities,unsupportedRequest} from '../_shared/mvp-capabilities.ts';
import {advanceManagedApp} from '../_shared/mvp-provisioning.ts';
import {APP_SCHEMA_V1} from '../_shared/mvp-app-schema.ts';
import {MANAGED_WORKFLOW_SCHEMA} from '../_shared/mvp-managed-workflow-schema.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const required=['MVP_MANAGED_SUPABASE_TOKEN','MVP_MANAGED_ORG_ID','MVP_MANAGED_REGION','MVP_APP_SMTP_HOST','MVP_APP_SMTP_USER','MVP_APP_SMTP_PASS','MVP_APP_EMAIL_FROM'];
serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return json({error:'POST required'},405);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 try{
  const user=await getUserFromAuth(req);if(!user)return json({error:'Sign in first'},401);
  const {action,projectId}=await req.json();
  const configured=required.every(k=>!!Deno.env.get(k));
  const released=(Deno.env.get('MVP_MANAGED_RELEASE_PROFILES')||'').split(',').filter(p=>['private_records','lead_capture_v2'].includes(p));
  const {data:invite}=await db.from('mvp_managed_invites').select('user_id').eq('user_id',user.id).maybeSingle();
  const {data:pilot}=await db.from('mvp_managed_pilot').select('enabled').eq('id',true).maybeSingle();
  if(action==='availability')return json({available:configured&&released.length>0&&!!invite&&pilot?.enabled===true,profiles:released});
  const {data:project,error}=await db.from('mvp_projects').select('id,metadata,supabase_connection_id,subdomain_slug').eq('id',projectId).eq('user_id',user.id).maybeSingle();
  if(error||!project)return json({error:'Project not found'},404);
  let {data:app}=await db.from('mvp_managed_apps').select('*').eq('project_id',projectId).eq('user_id',user.id).maybeSingle();
  if(action==='setup'){
   if(!configured)return json({error:'Managed app setup is not configured yet. Your draft is safe.'},503);
   if(project.supabase_connection_id&&!app)return json({error:'This app uses your own database. Managed migration must be arranged explicitly to preserve your data.'},409);
   const brief=project.metadata?.setupInput?.buildBrief;
   if(buildBriefErrors(brief).length)return json({error:'Save a complete product plan first.'},400);
   const unsupported=unsupportedRequest(brief.idea);if(unsupported)return json({error:unsupported},400);
   const manifest=deriveCapabilities(brief);
   if(!manifest.persistence)return json({status:'static',stage:'This app does not need a database.'});
   if(!released.includes(manifest.profile))return json({error:'This application workflow has not passed its managed release checks yet. Your plan is saved and no infrastructure was created.'},409);
   // Payment modules stay gated until the payment and browser acceptance gates pass.
   if(manifest.payments)return json({error:'Managed payments are not yet released. No infrastructure or generation charge was made.'},409);
   const {data,error}=await db.rpc('admit_mvp_managed_app',{p_project:projectId,p_user:user.id,p_org:Deno.env.get('MVP_MANAGED_ORG_ID'),p_manifest:manifest});
   if(error)throw error;app=data;
  }
  if(!app)return json({status:'not_started'});
  if(action==='advance'){
   if(!configured)return json({error:'Managed setup credentials are unavailable. Retry after the operator restores them.'},503);
   const {data:claims,error}=await db.rpc('claim_mvp_managed_app',{p_project:projectId});if(error)throw error;
   const job=claims?.[0];
   if(job){
    const save=async(patch:Record<string,unknown>)=>{const {data,error}=await db.from('mvp_managed_apps').update({failure:null,...patch,updated_at:new Date().toISOString()}).eq('project_id',projectId).eq('lease',job.lease).gt('lease_until',new Date().toISOString()).select('project_id');if(error||!data?.length)throw Error('Setup lease expired. Reload its status.');};
    try{
     if(job.organization_id!==Deno.env.get('MVP_MANAGED_ORG_ID'))throw Error('Managed organization changed; operator review required');
     const management=async(path:string,method='GET',body?:unknown)=>{
      const r=await fetch('https://api.supabase.com'+path,{method,headers:{Authorization:'Bearer '+Deno.env.get('MVP_MANAGED_SUPABASE_TOKEN'),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(25000),redirect:'error'});
      if(!r.ok)throw Error('Provider operation failed ('+r.status+'). Retry this setup stage.');return r.json();
     };
     const origin='https://'+(project.subdomain_slug||'app-'+projectId)+'.creatives-takeover.com';
     const result=await advanceManagedApp(job,{management,save,region:Deno.env.get('MVP_MANAGED_REGION')!,ownerEmail:user.email!,
      authConfig:{site_url:origin,uri_allow_list:origin+'/**',external_email_enabled:true,mailer_autoconfirm:false,smtp_host:Deno.env.get('MVP_APP_SMTP_HOST'),smtp_port:'587',smtp_user:Deno.env.get('MVP_APP_SMTP_USER'),smtp_pass:Deno.env.get('MVP_APP_SMTP_PASS'),smtp_admin_email:Deno.env.get('MVP_APP_EMAIL_FROM'),smtp_sender_name:'Your app'},
      storeCredentials:async value=>{const {error}=await db.from('mvp_managed_secrets').upsert({project_id:projectId,sealed:await sealSecret(value)});if(error)throw error;await save({public_runtime:{url:value.url,publicKey:value.publicKey,projectId}});},
     });
     if(result?.createOwner){
      const {data:secret,error}=await db.from('mvp_managed_secrets').select('sealed').eq('project_id',projectId).single();if(error)throw error;
      const credentials=await openSecret(secret.sealed);
      const customerDb=createClient(credentials.url,credentials.serviceKey,{auth:{persistSession:false}});
      const {error:ownerError}=await customerDb.auth.admin.createUser({email:user.email,password:crypto.randomUUID()+crypto.randomUUID(),email_confirm:true,app_metadata:{ct_provision_project:projectId,ct_platform_owner:user.id}});
      if(ownerError)throw Error('Owner setup needs a retry. Existing accounts will be reconciled.');
      await save({stage:'Finishing your owner access'});
     }
    }catch(e){await save({failure:e instanceof Error?e.message:'Setup interrupted. Retry this stage.'});}
    finally{await db.from('mvp_managed_apps').update({lease:null,lease_until:null}).eq('project_id',projectId).eq('lease',job.lease);}
   }
   ({data:app}=await db.from('mvp_managed_apps').select('*').eq('project_id',projectId).single());
  }
  let runtime;
  if(app.status==='ready'){
   const {data:secret,error}=await db.from('mvp_managed_secrets').select('sealed').eq('project_id',projectId).single();if(error)throw error;
   const credentials=await openSecret(secret.sealed);
   runtime={url:credentials.url,publicKey:credentials.publicKey,appId:projectId};
   if(action==='export'){
    const customerDb=createClient(credentials.url,credentials.serviceKey,{auth:{persistSession:false}});
    const data:Record<string,unknown[]>={};
    for(const name of ['records','leads','metrics','slots','bookings','checkins','history','members']){
     const all:unknown[]=[];
     for(let from=0;;from+=1000){const {data:rows,error}=await customerDb.from('ct_app_'+name).select('*').eq('app_id',projectId).order(name==='checkins'?'record_id':name==='members'?'user_id':'id').range(from,from+999);if(error)throw error;all.push(...rows);if(rows.length<1000)break;if(all.length>=100000)return json({error:'Large export requires an operator-assisted database export.'},409);}
     data[name]=all;
    }
    const {data:workflowRows,error:workflowError}=await customerDb.from('ct_mvp_records').select('*').eq('project_key',projectId).limit(1000);if(workflowError)throw workflowError;
    if(workflowRows.length===1000)return json({error:'Large workflow export needs an operator-assisted database export to avoid truncation.'},409);
    data.workflowRecords=workflowRows;
    return json({schema:APP_SCHEMA_V1+'\n'+MANAGED_WORKFLOW_SCHEMA,manifest:app.manifest,data,exportedAt:new Date().toISOString(),note:'Authentication passwords and service credentials are excluded. Export during a quiet period; concurrent edits may affect pagination.'});
   }
  }
  return json({status:app.status,stage:app.stage,failure:app.failure,manifest:app.manifest,configVersion:app.config_version,runtime});
 }catch(e){return json({error:e instanceof Error?e.message:(e as {message?:string})?.message||'Managed app action failed'},400);}
});
