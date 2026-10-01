import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EditorSaveQueue } from '../src/lib/demoStudio/saveQueue.ts';
import { getDemoReadiness } from '../src/lib/demoStudio/readiness.ts';
import { workflowErrors, publicKeyError } from '../supabase/functions/_shared/mvp-workflow.ts';
import { workflowWorkerAvailable } from '../supabase/functions/_shared/mvp-worker-health.ts';
import { readFileSync } from 'node:fs';

test('worker availability fails closed for missing credentials and stale or invalid heartbeats',()=>{
  const now=Date.parse('2026-10-01T12:00:00Z'),secret='x'.repeat(32);
  assert.equal(workflowWorkerAvailable(secret,new Date(now-1000).toISOString(),now),true);
  for(const lastSeen of [null,'invalid',new Date(now-120001).toISOString(),new Date(now+60000).toISOString()])assert.equal(workflowWorkerAvailable(secret,lastSeen,now),false);
  assert.equal(workflowWorkerAvailable('',new Date(now).toISOString(),now),false);
});

test('new workflow availability is enforced before credit reservation',()=>{
  const source=readFileSync(new URL('../supabase/functions/mvp-builder-generate/index.ts',import.meta.url),'utf8');
  const guard=source.indexOf("code:'WORKFLOW_UNAVAILABLE'");
  assert.ok(guard>0 && guard<source.indexOf('const reservation = await reserveMVPBuilderCredits('));
});
const step:any={id:'screen',title:'Welcome',caption:'Choose your next step',asset_url:'https://example.com/screen.png',speaker_notes:'',hotspots:[]};
const theme={endCtaLabel:'Try it',endCtaHref:'https://example.com/try'};
test('a single screen publishes without narration or hotspots; broken destinations fail',()=>{
  assert.equal(getDemoReadiness([step],theme).ready,true);
  assert.equal(getDemoReadiness([step],{...theme,endCtaHref:'javascript:alert(1)'}).ready,false);
  assert.equal(getDemoReadiness([step,{...step,id:'two'}],theme).ready,true);
  for(const hotspot of [{action:'next'},{action:'goto',action_target:'missing'},{action:'url',action_target:'javascript:alert(1)'}])assert.equal(getDemoReadiness([{...step,hotspots:[{x:0,y:0,w:.2,h:.2,label:'Next',...hotspot}]}],theme).ready,false);
});
test('save queue merges fields, retains a failed save, and retries the latest input',async()=>{
  const writes:any[]=[];let fail=true;
  const q=new EditorSaveQueue(()=>{},60_000);
  const write=async(p:any)=>{writes.push(p);if(fail)throw new Error('offline');};
  q.enqueue('hotspot',{label:'Next'},write);q.enqueue('hotspot',{x:.25},write);
  await assert.rejects(q.flush(),/offline/);assert.equal(q.status,'failed');
  q.enqueue('hotspot',{label:'Continue'},write);fail=false;await q.flush();
  assert.deepEqual(writes.at(-1),{label:'Continue',x:.25});assert.equal(q.status,'saved');
});
test('an edit arriving during an in-flight save is written afterwards',async()=>{
  let release!:()=>void;const gate=new Promise<void>(r=>release=r);const writes:any[]=[];
  const q=new EditorSaveQueue(()=>{},60_000);
  q.enqueue('step',{caption:'old'},async p=>{writes.push(p);await gate;});
  const flush=q.flush();q.enqueue('step',{caption:'new'},async p=>{writes.push(p);});release();await flush;
  assert.deepEqual(writes,[{caption:'old'},{caption:'new'}]);assert.equal(q.status,'saved');
});
test('workflow scope is versioned and bounded; secret keys never qualify as browser keys',()=>{
  const w={version:1,starter:'lead_capture',customer:'Homeowners',task:'Request a call',outcome:'Owner finds the lead',features:['Form','Owner view']};
  assert.deepEqual(workflowErrors(w),[]);assert.ok(workflowErrors({...w,features:['1','2','3','4']}).length);
  assert.ok(workflowErrors({...w,version:2}).length);
  const jwt=(role:string)=>'e30.'+Buffer.from(JSON.stringify({role})).toString('base64url')+'.signature';
  assert.equal(publicKeyError(jwt('anon')),null);assert.ok(publicKeyError(jwt('service_role')));assert.ok(publicKeyError('sb_secret_bad'));
});
