// Trusted host process. Docker receives only saved source and disposable TEST credentials.
import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {fileURLToPath} from 'node:url';
import { CleanupJournal } from './journal.mjs';
const journal = new CleanupJournal(process.env.CT_WORKER_STATE || '/var/lib/ct-mvp-worker');
const concurrency = Number(process.env.CT_WORKER_CONCURRENCY || 2);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 2) throw new Error('Pilot supports one or two workers');
let stopping = false;
process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });
const profile=fileURLToPath(new URL('./seccomp_profile.json',import.meta.url));
const limits=['--rm','--init','--cap-drop=ALL','--security-opt=no-new-privileges','--security-opt=seccomp='+profile,'--memory=1g','--cpus=1','--pids-limit=256','--read-only','--tmpfs','/tmp:rw,nosuid,size=512m','--shm-size=256m'];
const required=['CT_TEST_QUEUE_URL','CT_TEST_QUEUE_KEY','TEST_SUPABASE_URL','TEST_SUPABASE_SERVICE_KEY','TEST_SUPABASE_ANON_KEY'];
for(const name of required)if(!process.env[name])throw new Error('Missing '+name);
if(process.env.CT_TEST_QUEUE_KEY.length<32)throw new Error('The worker credential must contain at least 32 characters');
const queueUrl=new URL(process.env.CT_TEST_QUEUE_URL);
const testUrl=new URL(process.env.TEST_SUPABASE_URL);
if(queueUrl.protocol!=='https:' || testUrl.protocol!=='https:' || queueUrl.origin===testUrl.origin)throw new Error('Use a separate disposable test project');
const queue=async body=>{const r=await fetch(queueUrl,{method:'POST',headers:{'Content-Type':'application/json','x-worker-key':process.env.CT_TEST_QUEUE_KEY},body:JSON.stringify({...body,profiles:['lead_capture','request_management','customer_portal','static_landing']}),signal:AbortSignal.timeout(30000)});const data=await r.json();if(!r.ok)throw new Error(data.error || 'Queue failed');return data;};
const admin=async(path,method='GET',body)=>{
 const r=await fetch(testUrl.origin+path,{method,headers:{apikey:process.env.TEST_SUPABASE_SERVICE_KEY,Authorization:'Bearer '+process.env.TEST_SUPABASE_SERVICE_KEY,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 if(method==='DELETE'&&r.status===404)return null;
 if(!r.ok)throw new Error('Isolated database setup/cleanup failed ('+r.status+')');return r.status===204?null:r.json().catch(()=>null);
};
async function cleanEntry(entry){
 await admin('/rest/v1/ct_mvp_workflow_owners?project_key=eq.'+entry.id,'DELETE');
 const users=new Set(entry.users);
 for(let page=1;;page++){
  const result=await admin('/auth/v1/admin/users?page='+page+'&per_page=100');
  const rows=result.users || [];
  for(const user of rows)if(entry.emails.includes(user.email))users.add(user.id);
  if(rows.length<100)break;
 }
 for(const id of users)await admin('/auth/v1/admin/users/'+id,'DELETE');
 await journal.remove(entry.id);
}
async function execute(job,fixture){
 const name='ct-test-'+fixture.projectKey;
 return new Promise((resolve,reject)=>{
  const child=spawn('docker',['run',...limits,'--name',name,'-i','ct-mvp-workflow:1'],{stdio:['pipe','pipe','pipe']});
  let out='',limited=false;const timer=setTimeout(()=>{spawn('docker',['kill',name],{stdio:'ignore'});child.kill();reject(new Error('Isolated worker timed out'));},360000);
  child.stdout.on('data',c=>{out+=c;if(out.length>10_000_000){limited=true;spawn('docker',['kill',name],{stdio:'ignore'});child.kill();}});
  // Do not forward generated source or credentials through container logs.
  child.stderr.resume();child.on('error',e=>{clearTimeout(timer);reject(e);});
  child.on('close',()=>{clearTimeout(timer);try{if(limited)throw new Error('Artifact exceeds output limit');resolve(JSON.parse(out));}catch{reject(new Error('Isolated worker could not complete. Check Docker sandbox support.'));}});
  child.stdin.end(JSON.stringify({snapshot:job.snapshot,fixture}));
 });
}
async function run(job){
 if(job.snapshot.manifest?.profile==='static_landing'){
  const fixture={projectKey:randomUUID()};
  let result;
  try{result=await execute(job,fixture);}catch{result={assertions:{},files:null,failure:'Landing-page check could not complete. Retry when the worker is available.'};}
  result.assertions.cleanup=true;
  await queue({action:'finish',id:job.id,lease:job.lease,...result});return;
 }
 const ids=[];let result={assertions:{},files:null,failure:null};
 const fixture={url:testUrl.origin,anonKey:process.env.TEST_SUPABASE_ANON_KEY,projectKey:randomUUID()};
 const entry={id:fixture.projectKey,jobId:job.id,emails:[],users:[]};
 await journal.save(entry);
 const heartbeat=setInterval(()=>{void queue({action:'heartbeat'}).catch(()=>undefined);},30000);
 try{
  if(job.snapshot.backend?.projectUrl===testUrl.origin)throw new Error('The connected customer project cannot be the worker test project');
  for(const role of ['owner','customer','other']){
   const email='ct-'+fixture.projectKey+'-'+role+'@example.invalid',password=randomUUID()+randomUUID();
   entry.emails.push(email);await journal.save(entry);
   const user=await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true});ids.push(user.id);
   entry.users.push(user.id);await journal.save(entry);
   const login=await fetch(testUrl.origin+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:fixture.anonKey,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
   const session=await login.json();if(!login.ok || !session.access_token)throw new Error('Unable to create test session');
   fixture[role]={email,password,id:user.id,token:session.access_token};
  }
  await admin('/rest/v1/ct_mvp_workflow_owners','POST',{project_key:fixture.projectKey,user_id:fixture.owner.id,starter:job.snapshot.workflow.starter});
  result=await execute(job,fixture);
 }catch(e){result.failure=e.message || 'Isolated workflow failed';}
 finally{
  let cleaned=true;
  try{await cleanEntry(entry);}catch{cleaned=false;}
  result.assertions.cleanup=cleaned;
  if(!cleaned)stopping=true;
  if(!cleaned)result.failure='Test cleanup failed. An operator must remove the isolated test records before retrying.';
 }
 try{await queue({action:'finish',id:job.id,lease:job.lease,...result});}finally{clearInterval(heartbeat);}
}
// Verify test schema before advertising worker readiness.
execFileSync('docker',['run',...limits,'ct-mvp-workflow:1','--health'],{stdio:'pipe',timeout:60000});
await admin('/rest/v1/ct_mvp_records?select=id&limit=0');
await admin('/rest/v1/ct_mvp_workflow_owners?select=project_key&limit=0');
// Recover interrupted jobs before admitting new work. The journal records emails
// before user creation, covering a crash between provider success and local save.
for(const entry of await journal.entries()){
 try{execFileSync('docker',['rm','-f','ct-test-'+entry.id],{stdio:'ignore',timeout:15000});}catch{}
 await cleanEntry(entry);
}
async function consume(){
 while(!stopping){try{
  const {job}=await queue({action:'claim'});
  if(job)await run(job);else await new Promise(r=>setTimeout(r,10000));
 }catch{console.error('Workflow operation failed; retrying in 15 seconds. Inspect queue status for details.');await new Promise(r=>setTimeout(r,15000));}}
}
const healthTimer=setInterval(()=>{if(!stopping)void queue({action:'heartbeat'}).catch(()=>undefined);},30000);
try{await Promise.all(Array.from({length:concurrency},()=>consume()));}finally{clearInterval(healthTimer);}
if((await journal.entries()).length)process.exitCode=1;
