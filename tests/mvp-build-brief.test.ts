import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BUILD_TYPES,createBuildBrief,inferBuildType,buildBriefErrors,buildBriefPrompt} from '../supabase/functions/_shared/mvp-build-brief.ts';
import {classifyMVPBuilderAction} from '../src/lib/mvp-builder/phase1.ts';

test('all six advertised product types have distinct usable starting briefs',()=>{
  assert.equal(Object.keys(BUILD_TYPES).length,6);
  for(const [kind,item] of Object.entries(BUILD_TYPES)){
    assert.equal(inferBuildType(item.example),kind);
    const b={...createBuildBrief(item.example),customer:'Independent business owners'};
    assert.deepEqual(buildBriefErrors(b),[]);
    assert.equal(b.features.length,3);
    assert.equal(classifyMVPBuilderAction(b.idea,false),'generation');
    assert.ok(buildBriefPrompt(b).includes(item.guidance));
  }
  assert.equal(inferBuildType('Build online stores'),'store');
  assert.equal(inferBuildType('Build dashboards'),'dashboard');
});

test('preview builds disclose simulation; connected builds prohibit fake persistence',()=>{
  const b={...createBuildBrief('Build a habit tracker'),customer:'Runners'};
  assert.match(buildBriefPrompt(b),/Saved on this device/);
  assert.match(buildBriefPrompt(b),/visible Preview badge/);
  assert.match(buildBriefPrompt({...b,delivery:'connected'}),/Never substitute sample data, localStorage/);
});

test('malformed briefs and unsafe checkout links cannot reach paid generation',()=>{
  const b={...createBuildBrief('Build an online store'),customer:'Potters'};
  for(const patch of [{kind:'__proto__'},{delivery:'live'},{customer:''},{features:['1','2','3','4']},{checkoutUrl:'javascript:alert(1)'},{checkoutUrl:'https://secret:password@example.com/pay'}])assert.ok(buildBriefErrors({...b,...patch}).length);
  assert.deepEqual(buildBriefErrors({...b,checkoutUrl:'https://buy.stripe.com/example'}),[]);
  assert.match(buildBriefPrompt(b),/Never accept card numbers/);
  assert.equal(classifyMVPBuilderAction('Add a Stripe payment link',true),'targeted_edit');
  assert.equal(classifyMVPBuilderAction('Build a React Native app',false),'unsupported');
});

test('deferred functionality in the feature list is rejected before a paid build',()=>{const b=createBuildBrief('Private customer notes','app');b.customer='Customers';b.features=['Sign-in','Stripe checkout'];assert.ok(buildBriefErrors(b).some(e=>/Payments/.test(e)));});
