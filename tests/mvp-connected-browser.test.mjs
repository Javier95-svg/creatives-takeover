import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {PGlite} from '@electric-sql/pglite';
import {workflowStarter} from '../supabase/functions/_shared/mvp-workflow-starter.ts';
import {MANAGED_WORKFLOW_SCHEMA} from '../supabase/functions/_shared/mvp-managed-workflow-schema.ts';
import {WORKFLOW_STARTERS} from '../supabase/functions/_shared/mvp-workflow.ts';
import {checkCustomerWorkflow} from '../workers/mvp-workflow/outcomes.mjs';
const project='10000000-0000-0000-0000-000000000001';
const accounts=Object.fromEntries(['owner','customer','other'].map((role,i)=>[role,{id:'20000000-0000-0000-0000-00000000000'+(i+1),email:role+'@example.invalid',password:'test-password',token:'token-'+role}]));

test('connected starters perform real relational writes, reloads and permission checks in a browser',async t=>{
 const browser=await chromium.launch({headless:true});
 try{for(const starter of ['lead_capture','request_management','customer_portal'])await t.test(starter,async()=>{
  const db=new PGlite();const context=await browser.newContext();let chain=Promise.resolve();
  const under=(token,task)=>{const next=chain.then(async()=>{const user=Object.values(accounts).find(a=>a.token===token);await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",[user?.id||'',user?'authenticated':'anon']);await db.exec('SET ROLE '+(user?'authenticated':'anon'));return task();});chain=next.catch(()=>{});return next;};
  try{
   await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;GRANT USAGE ON SCHEMA auth TO anon,authenticated;`);
   for(const a of Object.values(accounts))await db.query('INSERT INTO auth.users VALUES($1)',[a.id]);
   await db.exec(MANAGED_WORKFLOW_SCHEMA);await db.exec(MANAGED_WORKFLOW_SCHEMA);
   await db.query('INSERT INTO ct_mvp_workflow_owners(project_key,user_id,starter) VALUES($1,$2,$3)',[project,accounts.owner.id,starter]);
   const files=workflowStarter({version:1,starter,customer:'Test customers',...WORKFLOW_STARTERS[starter]},{url:'https://fixture.supabase.co',publicKey:'sb_publishable_fixture0000',projectId:project});
   let confirmed=false,rejectWrite=false;
   await context.route('**/*',async route=>{
    const req=route.request(),u=new URL(req.url());
    if(u.origin==='http://ct-app.test'){const filename=u.pathname==='/'?'index.html':u.pathname.slice(1);const f=files.find(f=>f.filename===filename);return route.fulfill({status:f?200:404,contentType:filename.endsWith('.js')?'application/javascript':'text/html',body:f?.content||'Missing'});}
    if(u.origin!=='https://fixture.supabase.co')return route.abort();
    const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PATCH,PUT'};
    if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
    if(u.pathname==='/auth/v1/token'){const input=req.postDataJSON(),user=Object.values(accounts).find(a=>a.email===input.email&&a.password===input.password);return route.fulfill({status:user?200:401,headers,body:JSON.stringify(user?{access_token:user.token,expires_at:Math.floor(Date.now()/1000)+3600,user:{id:user.id,email:user.email}}:{message:'Invalid login'})});}
    if(u.pathname==='/auth/v1/logout')return route.fulfill({status:204,headers});
    const token=req.headers().authorization?.replace(/^Bearer /i,'');
    try{
     let rows=[];
     if(u.pathname==='/rest/v1/ct_mvp_workflow_owners')rows=await under(token,async()=>(await db.query('SELECT user_id FROM ct_mvp_workflow_owners WHERE project_key=$1',[project])).rows);
     else if(u.pathname==='/rest/v1/ct_mvp_records'){
      if(req.method()==='POST'){
       if(rejectWrite){rejectWrite=false;return route.fulfill({status:503,headers,body:JSON.stringify({message:'Rejected test write'})});}
       const v=req.postDataJSON();await under(token,()=>db.query('INSERT INTO ct_mvp_records(project_key,user_id,email,body,status) VALUES($1,$2,$3,$4,$5)',[v.project_key,v.user_id,v.email,v.body,v.status]));confirmed=true;return route.fulfill({status:201,headers,body:''});
      }
      if(req.method()==='PATCH'){const v=req.postDataJSON(),id=u.searchParams.get('id').slice(3);rows=await under(token,async()=>(await db.query('UPDATE ct_mvp_records SET status=coalesce($1,status),body=coalesce($2,body) WHERE project_key=$3 AND id=$4 RETURNING *',[v.status??null,v.body??null,project,id])).rows);}
      else rows=await under(token,async()=>(await db.query('SELECT * FROM ct_mvp_records WHERE project_key=$1 ORDER BY created_at DESC',[project])).rows);
     }else return route.fulfill({status:404,headers,body:'{}'});
     return route.fulfill({status:200,headers,body:JSON.stringify(rows)});
    }catch(e){return route.fulfill({status:403,headers,body:JSON.stringify({message:e.message})});}
   });
   const page=await context.newPage(),errors=[],assertions={};page.on('pageerror',e=>errors.push(e.message));
   const readRows=(token,field,value)=>under(token,async()=>(await db.query('SELECT * FROM ct_mvp_records WHERE project_key=$1 AND '+field+'=$2',[project,value])).rows);
   const denyStatusWrite=async(token,id)=>{try{await under(token,()=>db.query("UPDATE ct_mvp_records SET status='new' WHERE id=$1",[id]));return false;}catch{return true;}};
   await checkCustomerWorkflow({page,starter,accounts,readRows,writeConfirmed:()=>confirmed,assertions,errors,denyStatusWrite,failNextWrite:()=>{rejectWrite=true;},timeout:5000});
   for(const name of ['customer_task','database_write','persisted_after_reload','access_control','responsive_ui','no_runtime_errors','failed_write'])assert.equal(assertions[name],true,name);
   if(starter==='request_management'){assert.equal(assertions.requester_status,true);assert.equal(assertions.owner_only_status,true);}
  }finally{await context.close();await db.close();}
 });}finally{await browser.close();}
});
