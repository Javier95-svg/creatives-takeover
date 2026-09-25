import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
// This suite exercises form controls, not canvas. Some Windows installs carry
// the optional canvas package without its native binary; keep it optional here.
const require = createRequire(import.meta.url);
try { require.cache[require.resolve('canvas')] = { exports: { createCanvas: undefined }, loaded: true }; } catch { /* optional dependency */ }
const { JSDOM } = await import('jsdom');
import path from 'node:path';

const mocks = {
  '@/contexts/AuthContext': `export const useAuth=()=>({user:{id:'test-user',email:'test@example.invalid',user_metadata:{full_name:'Test'}}});`,
  '@/hooks/useCredits': `export const useCredits=()=>({totalAvailable:100,loading:false});`,
  '@/hooks/useSubscription': `export const useSubscription=()=>({subscriptionData:{subscription_tier:'rookie'}});`,
  '@/hooks/useFeatureGating': `export const useFeatureGating=()=>({checkFeatureAccess:()=>({hasAccess:true})});`,
  '@/hooks/usePosthogFeatureFlag': `export const useFeatureFlagEnabled=()=>false;`,
  '@/lib/publishProofRollout': `export const PUBLISH_PROOF_FIRST_FLAG='test';export const isPublishProofFirstEnabled=()=>false;`,
  '@tanstack/react-query': `export const useQueryClient=()=>({invalidateQueries:async()=>{}});`,
  '@/integrations/supabase/client': `export const supabase={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{user_preferences:{}}})})})})};`,
  '@/lib/analytics': `export const trackOnboardingStepCompleted=()=>{};`,
  '@/lib/retentionSystem': `export const trackRetentionEvent=async(name,data)=>window.events.push({name,data}); export const trackActivationJourneyEvent=async()=>{}; export const ensureActivationGateVariant=async()=> 'control'; export const startActivationJourney=async()=>{};`,
  '@/lib/onboardingMentorRecommendations': `export const refreshOnboardingMentorRecommendations=async()=>{};`,
  '@/lib/accountApplications': `export const getMyAccountInvitationTypes=async()=>window.invitationTypes; export const submitAccountApplication=async(value)=>{window.applications.push(value);};`,
  '@/lib/onboardingSession': `export const saveOnboardingProgress=async(value)=>{window.saved=value;}; export const abandonOnboardingSession=async()=>{window.abandoned=true;}; export const completeOnboardingSession=async()=>{};`,
  '@/lib/activationJourneyV2': `export const ACTIVATION_CATALOG={find_mentor:{label:'Find a mentor',steps:['Find support'],output:'A useful introduction'}};export const getStageAvailableIntents=()=>['find_mentor'];export const recommendActivation=()=>({intent:'find_mentor',reason:'Relevant support'});export const createActivationJourney=()=>({});export const buildActivationJourneyUrl=()=>'/';`,
  'sonner': `export const toast={info:()=>{},success:()=>{},error:()=>{}};`,
};
let bundle;
async function mount(storage={}) {
  if (!bundle) {
    const result=await build({stdin:{contents:`import React from 'react'; import {createRoot} from 'react-dom/client'; import {AdaptiveOnboardingForm} from './src/components/AdaptiveOnboardingForm';
      window.root=createRoot(document.getElementById('root'));window.root.render(<AdaptiveOnboardingForm session={{id:'test-session',user_id:'test-user',status:'in_progress',flow_version:'adaptive_v1',rollout_variant:'adaptive_v1',current_step:0,answers:{},started_at:'2026-09-25T00:00:00Z',updated_at:'2026-09-25T00:00:00Z'}} onComplete={(route)=>window.completedRoute=route}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"test"'},plugins:[{
      name:'onboarding-test-boundaries',setup(b){
        b.onResolve({filter:/.*/},args=>mocks[args.path] ? {path:args.path,namespace:'mock'} : undefined);
        b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'js'}));
        b.onResolve({filter:/^@\//},args=>({path:path.resolve('src',args.path.slice(2))+(['.tsx','.ts'].find(ext=>exists(path.resolve('src',args.path.slice(2))+ext))??'')}));
      }
    }]});bundle=result.outputFiles[0].text;
  }
  const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true});
  dom.window.events=[];dom.window.applications=[];dom.window.invitationTypes=['mentor','marketplace'];
  for(const [key,value] of Object.entries(storage))dom.window.localStorage.setItem(key,value);
  dom.window.eval(bundle);await tick();return dom;
}
import { existsSync as exists } from 'node:fs';
const tick=()=>new Promise(resolve=>setTimeout(resolve,45));
const text=dom=>dom.window.document.body.textContent;
async function click(dom,label){const button=[...dom.window.document.querySelectorAll('button')].find(b=>b.textContent.trim()===label || b.textContent.includes(label));assert.ok(button,`Missing button ${label}`);button.click();await tick();}
async function type(dom,input,value){assert.ok(input);const setter=Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set;input.focus();for(const char of value){setter.call(input,input.value+char);input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));await tick();}}
function field(dom,label){const el=[...dom.window.document.querySelectorAll('label')].find(x=>x.textContent.startsWith(label));return el&&dom.window.document.getElementById(el.htmlFor);}
const statements={Founder:'I already have a project',Builder:'I am starting from scratch',Mentor:'I want to advise', 'Service provider':'I want to deliver services',Investor:'I want to explore projects to invest'};
async function choose(dom,role){role=statements[role]??role;const button=[...dom.window.document.querySelectorAll('button')].find(b=>b.textContent.includes(role));assert.ok(button);button.click();await tick();await click(dom,'Continue');}
function close(dom){dom.window.root.unmount();dom.window.close();}

test('uninvited advice and services answers cannot reach application details',async()=>{
  for(const role of ['Mentor','Service provider']) {
    const dom=await mount();try{
      dom.window.invitationTypes=[];
      await choose(dom,role);
      assert.ok(text(dom).includes('requires an invitation for your verified sign-in email'));
      assert.equal(dom.window.applications.length,0);
      assert.ok(text(dom).includes('What brings you here today?'));
      await choose(dom,'Builder');
      assert.ok(text(dom).includes('Where are you starting?'));
    }finally{close(dom);}
  }
});

test('situation question precedes project questions for all five account types',async()=>{
  for(const role of ['Founder','Builder','Mentor','Service provider','Investor']){
    const dom=await mount();try{
      assert.ok(text(dom).includes('What brings you here today?'));
      assert.equal(dom.window.document.querySelectorAll('textarea').length,0);
      await choose(dom,role);
      if(['Founder','Builder'].includes(role)) assert.equal(dom.window.document.querySelectorAll('textarea').length,1);
      else {assert.equal(dom.window.document.querySelectorAll('textarea').length,0);assert.ok(text(dom).includes('2 of 2'));assert.ok(!text(dom).includes('Founder launchpad'));}
    }finally{close(dom);}
  }
});

test('old drafts must answer the first situation question before continuing',async()=>{
  const draft=JSON.stringify({sessionId:'test-session',currentStep:4,updatedAt:Date.now(),answers:{founderSegment:'mentor',entryStage:'details',projectName:'Existing draft'}});
  const dom=await mount({'adaptive_onboarding_test-session':draft});try{
    assert.ok(text(dom).includes('What brings you here today?'));
    await click(dom,'Continue');
    assert.ok(text(dom).includes('Choose the option that describes your situation'));
    assert.equal(dom.window.applications.length,0);
  }finally{close(dom);}
});

test('mentor typing, draft reload, submission and workspace continuation',async()=>{
  let dom=await mount();try{
    await choose(dom,'Mentor');
    await type(dom,field(dom,'Areas of expertise'),'Go to market, Pricing');
    assert.equal(field(dom,'Areas of expertise').value,'Go to market, Pricing');
    await click(dom,'Validation');await type(dom,field(dom,'Relevant experience'),'Built a profitable business');await click(dom,'Both');
    const stored=dom.window.localStorage.getItem('adaptive_onboarding_test-session');
    assert.ok(stored);close(dom);dom=await mount({'adaptive_onboarding_test-session':stored});
    assert.ok(text(dom).includes('2 of 2'));assert.equal(field(dom,'Areas of expertise').value,'Go to market, Pricing');
    await click(dom,'Send my request');assert.equal(dom.window.applications.length,1);
    assert.deepEqual([...dom.window.applications[0].roleProfile.expertise],['Go to market','Pricing']);
    assert.equal(dom.window.localStorage.getItem('adaptive_onboarding_test-session'),null);
    await click(dom,'Open my workspace');assert.equal(dom.window.completedRoute,'/');
    assert.equal(dom.window.applications.length,1);dom.window.root.unmount();await tick();
    assert.equal(dom.window.abandoned,undefined);
  }finally{dom.window.close();}
});

test('builder accepts no working title and offers uncertainty in business model',async()=>{
  const dom=await mount();try{
    await choose(dom,'Builder');await click(dom,'Exploring problems');
    const area=dom.window.document.querySelector('textarea');
    const setter=Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype,'value').set;
    setter.call(area,'I want to explore tools for local small business owners.');area.dispatchEvent(new dom.window.Event('input',{bubbles:true}));await tick();
    await click(dom,'Continue');assert.ok(text(dom).includes('How does this business make money?'));assert.ok(text(dom).includes('Not sure yet'));
  }finally{close(dom);}
});
