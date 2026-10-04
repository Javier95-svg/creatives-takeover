import { chromium } from 'playwright';
import { checkCustomerWorkflow } from './outcomes.mjs';
import { buildArtifact } from './build.mjs';
import { checkStaticLanding } from './static-outcome.mjs';
if(process.argv.includes('--health')){
  const browser=await chromium.launch({headless:true,chromiumSandbox:true});
  await browser.close();process.stdout.write('ready');process.exit(0);
}
const input=await new Promise((resolve,reject)=>{let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>{s+=c;if(s.length>6_000_000)reject(new Error('Job too large'));});process.stdin.on('end',()=>resolve(JSON.parse(s)));});
const {snapshot,fixture}=input;
const assertions={customer_task:false,database_write:false,persisted_after_reload:false,access_control:false,no_runtime_errors:false};
let browser,files,failure; let infrastructureFailure=false;
const deadline=setTimeout(()=>{process.stdout.write(JSON.stringify({assertions,failure:'Workflow exceeded its five-minute limit'}));process.exit(1);},300_000);
try{
  files=await buildArtifact(snapshot);
  if(snapshot.manifest?.profile==='static_landing'){
    browser=await chromium.launch({headless:true,chromiumSandbox:true});
    const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false});
    await context.routeWebSocket(/.*/,ws=>ws.close());
    await context.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.origin!=='http://ct-app.test')return route.abort();
      const name=url.pathname==='/'?'index.html':url.pathname.slice(1),file=files.find(f=>f.filename===name);
      return file?route.fulfill({status:200,contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html',body:file.content}):route.fulfill({status:404,body:'Not found'});
    });
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await checkStaticLanding({page,ctaUrl:snapshot.buildBrief.ctaUrl,assertions,errors});
  }else{
  const production=new URL(snapshot.backend?.projectUrl || '');
  const sandbox=new URL(fixture.url);
  if(production.protocol!=='https:' || !production.hostname.endsWith('.supabase.co') || sandbox.protocol!=='https:' || !sandbox.hostname.endsWith('.supabase.co') || production.origin===sandbox.origin)throw new Error('A separate Supabase test project is required');
  // The container has only short-lived TEST user credentials. No CT/service-role keys.
  browser=await chromium.launch({headless:true,chromiumSandbox:true,args:['--force-webrtc-ip-handling-policy=disable_non_proxied_udp']});
  const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false});
  const errors=[];let writeConfirmed=false, rejectNextWrite=false;
  const allowedTokens=new Set([fixture.owner.token,fixture.customer.token,fixture.other.token]);
  await context.routeWebSocket(/.*/,ws=>ws.close());
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin==='http://ct-app.test'){
      const filename=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
      const file=files.find(f=>f.filename===filename);
      return file?route.fulfill({status:200,contentType:filename.endsWith('.js')?'application/javascript':filename.endsWith('.css')?'text/css':filename.endsWith('.html')?'text/html':'text/plain',body:file.content}):route.fulfill({status:404,body:'Not found'});
    }
    if(url.origin!==production.origin)return route.abort('blockedbyclient');
    const isRecords=url.pathname==='/rest/v1/ct_mvp_records';
    if(rejectNextWrite && request.method()==='POST' && url.pathname==='/rest/v1/ct_mvp_records'){rejectNextWrite=false;return route.fulfill({status:503,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},body:JSON.stringify({message:'The database rejected this test write. Retry safely.'})});}
    const isOwners=url.pathname==='/rest/v1/ct_mvp_workflow_owners';
    const isLogout=url.pathname==='/auth/v1/logout';
    const isLogin=url.pathname==='/auth/v1/token' && url.searchParams.get('grant_type')==='password';
    const isUser=url.pathname==='/auth/v1/user';
    if(!isRecords && !isOwners && !isLogin && !isUser && !isLogout)return route.abort('blockedbyclient');
    if(!['GET','POST','PATCH','OPTIONS'].includes(request.method()))return route.abort();
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PATCH'}});
    if(request.headers().apikey!==snapshot.publicKey)return route.fulfill({status:401,body:'Incorrect database public key'});
    let body=request.postData();
    if(isLogin){const login=JSON.parse(body || '{}');if(![fixture.owner,fixture.customer,fixture.other].some(a=>a.email===login.email && a.password===login.password))return route.fulfill({status:401,body:'Invalid test credentials'});}
    if(isRecords || isOwners){
      if(upstream.status>=500)infrastructureFailure=true;
    if(isRecords && request.method()==='POST'){
        const data=JSON.parse(body || '{}');
        if(Array.isArray(data) || data.project_key!==snapshot.projectId)throw new Error('Record must belong to the selected product');
        data.project_key=fixture.projectKey;body=JSON.stringify(data);
      }else{
        if(url.searchParams.get('project_key')!=='eq.'+snapshot.projectId)return route.fulfill({status:400,body:'Filter records to this product'});
        url.searchParams.set('project_key','eq.'+fixture.projectKey);
      }
    }
    const headers=request.headers();
    // Only the actual test users' tokens may be forwarded; no generated headers escape to another service.
    const bearer=headers.authorization?.replace(/^Bearer /i,'');
    const token=allowedTokens.has(bearer)?bearer:fixture.anonKey;
    const upstream=await fetch(sandbox.origin+url.pathname+url.search,{method:request.method(),headers:{apikey:fixture.anonKey,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:headers.prefer || ''},body:request.method()==='GET'?undefined:body,signal:AbortSignal.timeout(15000),redirect:'error'}).catch(e=>{infrastructureFailure=true;throw e;});
    if(isRecords && request.method()==='POST' && upstream.ok)writeConfirmed=true;
    const text=await upstream.text();
    if(isLogin && upstream.ok){const session=JSON.parse(text);if(session.access_token)allowedTokens.add(session.access_token);}
    return route.fulfill({status:upstream.status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},body:text.replaceAll(fixture.projectKey,snapshot.projectId)});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const readRows=async(token,field,value)=>{
    const query=new URL(fixture.url+'/rest/v1/ct_mvp_records');
    query.searchParams.set('project_key','eq.'+fixture.projectKey);query.searchParams.set(field,'eq.'+value);
    const r=await fetch(query,{headers:{apikey:fixture.anonKey,Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});
    if(!r.ok){infrastructureFailure=true;throw new Error('Database read failed');}return r.json();
  };
  const denyStatusWrite=async(token,id)=>{
    const r=await fetch(sandbox.origin+'/rest/v1/ct_mvp_records?project_key=eq.'+fixture.projectKey+'&id=eq.'+id,{method:'PATCH',headers:{apikey:fixture.anonKey,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({status:'new'}),signal:AbortSignal.timeout(15000)});
    if(r.status>=500){infrastructureFailure=true;throw Error('Permission checks are unavailable');}
    return !r.ok;
  };
  await checkCustomerWorkflow({page,starter:snapshot.workflow.starter,accounts:fixture,readRows,writeConfirmed:()=>writeConfirmed,assertions,errors,denyStatusWrite,failNextWrite:()=>{rejectNextWrite=true;}});
  }
}catch(e){failure=e.message || 'Workflow failed';assertions.code_failure=!infrastructureFailure;assertions.infrastructure_failure=infrastructureFailure;}
finally{await browser?.close();clearTimeout(deadline);}
process.stdout.write(JSON.stringify({assertions,files:failure?null:files,failure:failure || null}));
