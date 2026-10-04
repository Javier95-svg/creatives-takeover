import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shippingGuidance,completedCheckLabels} from '../src/lib/mvp-builder/shippingGuidance.ts';
import {planFromPrompt} from '../supabase/functions/_shared/mvp-builder-journey.ts';

const connected=()=>({...planFromPrompt('A customer request tracker'),delivery:'connected' as const});
const state=()=>({brief:connected(),hasFiles:true,saveError:null,workerAvailable:true,canPublish:false});
test('save failures outrank publication and offline checks',()=>{
  const guidance=shippingGuidance({...state(),saveError:'Save failed',canPublish:true,workerAvailable:false});
  assert.equal(guidance.action,'save');assert.equal(guidance.disabled,false);
});
test('offline connected journeys offer a recoverable availability action',()=>{
  const guidance=shippingGuidance({...state(),workerAvailable:false});
  assert.equal(guidance.action,'availability');assert.equal(guidance.disabled,false);
  assert.equal(shippingGuidance({...state(),hasFiles:false,workerAvailable:null}).disabled,true);
});
test('invalid scope cannot build or publish and gives actionable validation',()=>{
  const guidance=shippingGuidance({...state(),canPublish:true,brief:{...connected(),customer:''}});
  assert.equal(guidance.disabled,true);assert.deepEqual(guidance.issues,['Tell us who will use this app.']);
  const paid=shippingGuidance({...state(),hasFiles:false,brief:{...connected(),features:['Accept payments']}});
  assert.equal(paid.disabled,true);assert.match(paid.issues.join(' '),/deferred/);
});
test('preview-only data apps cannot offer publication even with a stale passing claim',()=>{
  const guidance=shippingGuidance({...state(),canPublish:true,brief:{...connected(),delivery:'preview'}});
  assert.equal(guidance.action,'check');assert.equal(guidance.disabled,true);assert.match(guidance.launchBlocker!,/preview data/);
});
test('a tested connected app offers publication; static apps require the supplied CTA',()=>{
  assert.equal(shippingGuidance({...state(),canPublish:true}).action,'publish');
  const landing=planFromPrompt('A portfolio website');
  assert.equal(shippingGuidance({...state(),brief:landing}).disabled,true);
  assert.equal(shippingGuidance({...state(),brief:{...landing,ctaUrl:'https://example.com'}}).disabled,false);
});
test('check summary never treats infrastructure or false assertions as completed tasks',()=>{
  assert.deepEqual(completedCheckLabels({database_write:true,access_control:false,infrastructure_failure:true}),['Records saved to the database']);
});
