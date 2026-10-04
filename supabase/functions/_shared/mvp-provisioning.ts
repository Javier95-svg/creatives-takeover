import { APP_SCHEMA_V1 } from './mvp-app-schema.ts';
import { MANAGED_WORKFLOW_SCHEMA } from './mvp-managed-workflow-schema.ts';
import type { CapabilityManifest } from './mvp-capabilities.ts';
export type ManagedJob = {project_id:string;organization_id:string;provider_ref?:string|null;status:string;manifest:CapabilityManifest;owner_auth_id?:string|null};
type Project = {id:string;name:string;organization_id?:string;organization_slug?:string;status:string};
type Ports = {
 management:(path:string,method?:string,body?:unknown)=>Promise<any>;
 save:(patch:Record<string,unknown>)=>Promise<void>;
 storeCredentials:(value:{url:string;publicKey:string;serviceKey:string})=>Promise<void>;
 authConfig:Record<string,unknown>;
 ownerEmail:string;
 region:string;
};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const sqlText=(s:string)=>"'"+s.replaceAll("'","''")+"'";
/** One resumable stage per invocation; never repeat an ambiguous create request. */
export async function advanceManagedApp(job:ManagedJob,ports:Ports) {
 if(!uuid.test(job.project_id))throw Error('Invalid project identity');
 const name='ct-app-'+job.project_id;
 const orgMatches=(p:Project)=>p.organization_slug===job.organization_id||p.organization_id===job.organization_id;
 if(job.status==='queued'){
  const existing:Project[]=await ports.management('/v1/projects');
  if(existing.some(p=>orgMatches(p)&&p.name===name))throw Error('An existing provider project needs operator reconciliation');
  // Persist intent before making the non-idempotent external call. A timeout
  // moves to reconciliation; it must never automatically POST another project.
  await ports.save({status:'creating',stage:'Creating your app database',create_started_at:new Date().toISOString()});
  try{
   const project:Project=await ports.management('/v1/projects','POST',{name,organization_slug:job.organization_id,db_pass:crypto.randomUUID()+crypto.randomUUID(),region:ports.region,desired_instance_size:'micro'});
   if(!/^[a-z0-9]+$/.test(project.id))throw Error('Invalid provider response');
   await ports.save({provider_ref:project.id,status:'waiting',stage:'Waiting for your database'});
  }catch{await ports.save({status:'creating',stage:'Checking whether database creation completed',failure:'Setup was interrupted. Reconciliation will check the existing request.'});}
  return;
 }
 if(job.status==='creating'){
  const matches:Project[]=(await ports.management('/v1/projects')).filter((p:Project)=>orgMatches(p)&&p.name===name);
  if(matches.length===1)await ports.save({provider_ref:matches[0].id,status:'waiting',failure:null,stage:'Waiting for your database'});
  else await ports.save({status:'review',stage:'Setup needs an operator check',failure:'The provider did not confirm a unique database. No second project was requested.'});
  return;
 }
 if(!job.provider_ref||!/^[a-z0-9]+$/.test(job.provider_ref))throw Error('Provider identity is missing');
 const path='/v1/projects/'+job.provider_ref;
 const project:Project=await ports.management(path);
 if(project.name!==name||!orgMatches(project))throw Error('Managed organization or project identity does not match');
 if(job.status==='waiting'){
  if(project.status!=='ACTIVE_HEALTHY')return;
  await ports.save({status:'schema',stage:'Preparing your app data'});return;
 }
 if(job.status==='schema'){
  if(job.manifest.schemaVersion!=='1.0.0')throw Error('Unsupported module version');
  await ports.management(path+'/database/query','POST',{query:APP_SCHEMA_V1});
  await ports.management(path+'/database/query','POST',{query:MANAGED_WORKFLOW_SCHEMA});
  await ports.management(path+'/database/query','POST',{query:'INSERT INTO public.ct_app_config(app_id,schema_version,modules) VALUES ('+sqlText(job.project_id)+",'1.0.0',ARRAY["+job.manifest.modules.map(sqlText).join(',')+']::text[]) ON CONFLICT(app_id) DO NOTHING;'});
  await ports.save({status:'auth',stage:'Configuring sign-in and recovery'});return;
 }
 if(job.status==='auth'){
  await ports.management(path+'/config/auth','PATCH',{...ports.authConfig,disable_signup:true});
  const keys=await ports.management(path+'/api-keys');
  const publicKey=keys.find((k:any)=>k.name==='anon')?.api_key;
  const serviceKey=keys.find((k:any)=>k.name==='service_role')?.api_key;
  if(!publicKey||!serviceKey)throw Error('Provider keys are not ready');
  await ports.storeCredentials({url:'https://'+job.provider_ref+'.supabase.co',publicKey,serviceKey});
  await ports.save({status:'owner',stage:'Establishing your owner access'});return;
 }
 // Owner account uses a random password; the founder uses standard app recovery.
 // No password or service key is returned by this workflow.
 if(job.status==='owner'){
  const rows=await ports.management(path+'/database/query','POST',{query:'SELECT id,raw_app_meta_data->>\'ct_provision_project\' AS provision_project FROM auth.users WHERE lower(email)=lower('+sqlText(ports.ownerEmail)+') LIMIT 1;'});
  if(!rows[0]?.id)return {createOwner:true};
  if(!uuid.test(rows[0].id))throw Error('Invalid owner identity');
  if(rows[0].provision_project!==job.project_id)throw Error('An existing app account needs owner verification. No owner permissions were granted.');
  await ports.management(path+'/database/query','POST',{query:'INSERT INTO public.ct_app_members(app_id,user_id,role) VALUES('+sqlText(job.project_id)+','+sqlText(rows[0].id)+",'owner') ON CONFLICT(app_id,user_id) DO NOTHING;"});
  const starter=job.manifest.profile==='lead_capture_v2'?'lead_capture':job.manifest.profile==='request_management'?'request_management':'customer_portal';
  await ports.management(path+'/database/query','POST',{query:'INSERT INTO public.ct_mvp_workflow_owners(project_key,user_id,starter) VALUES('+sqlText(job.project_id)+','+sqlText(rows[0].id)+','+sqlText(starter)+') ON CONFLICT(project_key) DO NOTHING;'});
  await ports.management(path+'/config/auth','PATCH',{disable_signup:false});
  await ports.save({status:'ready',stage:'Your app data and sign-in are ready',owner_auth_id:rows[0].id,failure:null});
 }
}
