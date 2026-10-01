import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deriveCapabilities,requiredAssertions} from '../supabase/functions/_shared/mvp-capabilities.ts';
import {createBuildBrief} from '../supabase/functions/_shared/mvp-build-brief.ts';
import {admissionDecision} from '../supabase/functions/_shared/mvp-managed-budget.ts';
import {advanceManagedApp} from '../supabase/functions/_shared/mvp-provisioning.ts';
import {parseCsv,mapMetricRows,csvExport,habitStreak} from '../supabase/functions/_shared/mvp-data-utils.ts';
test('each category derives its own outcome; static sites have no database assertion',()=>{
 const profiles=['static_landing','private_records','dashboard','store','subscription','internal'];
 ['landing','app','dashboard','store','saas','internal'].forEach((kind,i)=>{
  const manifest=deriveCapabilities(createBuildBrief('A simple product',kind as any));assert.equal(manifest.profile,profiles[i]);
  assert.equal(requiredAssertions(manifest.profile).includes('database_write'),i!==0);
 });
 assert.equal(deriveCapabilities(createBuildBrief('A habit tracker','app')).profile,'habits');
 assert.equal(deriveCapabilities(createBuildBrief('Book a yoga class','app')).profile,'booking');
 assert.equal(deriveCapabilities(createBuildBrief('A waitlist','landing')).profile,'lead_capture_v2');
});
test('budget stops admissions at $200 and ten apps, and rejects stale forecasts',()=>{
 const budget={baseMonthlyCents:9000,reservedAppCents:7000,nextAppCents:1000,apps:7,observedAt:new Date().toISOString()};
 assert.equal(admissionDecision(budget).allowed,true);
 assert.equal(admissionDecision({...budget,reservedAppCents:9000}).alert,true);
 assert.equal(admissionDecision({...budget,reservedAppCents:10000}).allowed,false);
 assert.equal(admissionDecision({...budget,apps:10}).allowed,false);
 assert.equal(admissionDecision({...budget,observedAt:'2020-01-01'}).allowed,false);
});
test('ambiguous project creation is reconciled, never automatically issued twice',async()=>{
 const job:any={project_id:'10000000-0000-0000-0000-000000000001',organization_id:'managed-org',status:'queued',manifest:deriveCapabilities(createBuildBrief('Notes','app'))};
 let posts=0;
 const ports:any={region:'eu-west-2',ownerEmail:'owner@example.invalid',authConfig:{},storeCredentials:async()=>{},save:async(p:any)=>Object.assign(job,p),management:async(path:string,method:string)=>{if(method==='POST'){posts++;throw Error('Request timed out after provider accepted it');}return [];}};
 await advanceManagedApp(job,ports);assert.equal(job.status,'creating');assert.equal(posts,1);
 ports.management=async()=>[{id:'dedicatedref',organization_id:'managed-org',name:'ct-app-'+job.project_id,status:'COMING_UP'}];
 await advanceManagedApp(job,ports);assert.equal(job.provider_ref,'dedicatedref');assert.equal(posts,1);
});
test('missing or duplicated provider identity stops provisioning for operator review',async()=>{
 const job:any={project_id:'10000000-0000-0000-0000-000000000001',organization_id:'managed-org',status:'creating'};
 await advanceManagedApp(job,{management:async()=>[],save:async(p:any)=>Object.assign(job,p)} as any);
 assert.equal(job.status,'review');
});

test('owner provisioning refuses an unverified pre-existing identity, then enables signup after ownership',async()=>{
 const job:any={project_id:'10000000-0000-0000-0000-000000000001',organization_id:'managed-org',provider_ref:'dedicatedref',status:'owner'};
 const calls:{path:string;body:any}[]=[];
 let verified=false;
 const ports:any={ownerEmail:'owner@example.invalid',save:async(p:any)=>Object.assign(job,p),management:async(path:string,method:string,body:any)=>{
  calls.push({path,body});
  if(!method)return {name:'ct-app-'+job.project_id,organization_id:'managed-org'};
  if(body?.query?.startsWith('SELECT'))return [{id:'20000000-0000-0000-0000-000000000001',provision_project:verified?job.project_id:null}];
  return {};
 }};
 await assert.rejects(()=>advanceManagedApp(job,ports),/owner verification/);
 assert.equal(calls.some(c=>c.body?.query?.startsWith('INSERT')),false);
 verified=true;await advanceManagedApp(job,ports);
 assert.equal(job.status,'ready');
 assert.equal(calls.filter(c=>c.body?.query?.startsWith('INSERT')).length,2);
 assert.equal(calls.at(-1)?.body.disable_signup,false);
});

test('managed authentication disables public signup until the owner is installed',async()=>{
 const job:any={project_id:'10000000-0000-0000-0000-000000000001',organization_id:'managed-org',provider_ref:'dedicatedref',status:'auth'};
 let configured:any;
 await advanceManagedApp(job,{ownerEmail:'owner@example.invalid',authConfig:{site_url:'https://example.invalid'},storeCredentials:async()=>{},save:async(p:any)=>Object.assign(job,p),management:async(path:string,method:string,body:any)=>{
  if(path.endsWith('/api-keys'))return [{name:'anon',api_key:'public'},{name:'service_role',api_key:'secret'}];
  if(method==='PATCH'){configured=body;return {};}
  return {name:'ct-app-'+job.project_id,organization_id:'managed-org'};
 }} as any);
 assert.equal(configured.disable_signup,true);assert.equal(job.status,'owner');
});
test('CSV mapping rejects invalid dates, duplicate IDs and malformed quoting',()=>{
 const rows=parseCsv('id,date,category,value\r\na,2026-10-01,"Sales, retail",12.50\r\nb,2026-10-02,Sales,7.5');
 const mapped=mapMetricRows(rows,{id:0,day:1,category:2,amount:3});assert.equal(mapped.reduce((n,r)=>n+r.amount,0),20);
 assert.throws(()=>parseCsv('a,b\n"unfinished'),/not closed/);
 assert.throws(()=>mapMetricRows(parseCsv('id,date,category,value\na,2026-02-30,Sales,1'),{id:0,day:1,category:2,amount:3}),/Invalid date/);
 assert.throws(()=>mapMetricRows([...rows,rows[1]],{id:0,day:1,category:2,amount:3}),/duplicate/);
 assert.match(csvExport([{title:'=1+1'}],['title']),/'=1\+1/);
});
test('streaks use consecutive calendar dates and do not count duplicates or future days',()=>{
 assert.equal(habitStreak(['2026-09-29','2026-09-30','2026-09-30'],'2026-10-01'),2);
 assert.equal(habitStreak(['2026-09-28','2026-09-30','2026-10-02'],'2026-10-01'),1);
});
