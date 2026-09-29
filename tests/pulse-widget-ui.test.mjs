import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
const require = createRequire(import.meta.url);
try { require.cache[require.resolve('canvas')] = { exports: {}, loaded: true }; } catch { /* optional */ }
const { JSDOM } = await import('jsdom');
const mocks = {
  '@/contexts/AuthContext': `export const useAuth=()=>({user:window.signedIn?{id:window.userId,user_metadata:{}}:null,isAuthenticated:window.signedIn,loading:false});`,
  '@/hooks/useProjects': `export const useProjects=()=>({activeProjectId:window.project,activeProject:{title:window.projectName}});`,
  '@/hooks/useAccountContext': `export const useAccountContext=()=>({userType:window.role,hasCategoryAccess:window.categoryAccess});`,
  'react-router-dom': `export const useLocation=()=>({pathname:window.page});export const useNavigate=()=>()=>{};`,
  '@/lib/analytics': `const log=(event)=>(properties)=>(window.events=window.events||[]).push({event,...properties});export const trackPulseGuestOpened=log('pulse_guest_opened');export const trackPulseGuestQuestionAsked=log('pulse_guest_question_asked');export const trackPulseGuestLinkClicked=log('pulse_guest_link_clicked');export const trackPulseInvestorsRecommended=log('pulse_investors_recommended');export const trackPulseInvestorProfileClicked=log('pulse_investor_profile_clicked');export const trackPulseAnswerRated=log('pulse_answer_rated');`,
  '@/hooks/useStreamingChat': `export const streamChat=async(...args)=>{window.guestCalls++;window.guestChunk=args[9];};`,
  '@/services/pulseHomeStream': `export const streamPulseHome=args=>{window.streams.push(args);if(window.failStream)return Promise.reject(new Error('Synthetic interruption'));return new Promise((resolve,reject)=>{window.finish=resolve;args.signal.addEventListener('abort',()=>reject(new Error('aborted')));});};`,
  '@/integrations/supabase/client': `export const supabase={schema:()=>({from(table){
    let scope,conversation;
    const q={select:()=>q,eq:(key,value)=>{if(key==='conversation_id')conversation=value;return q;},contains:(_key,value)=>{scope=value.pulseScope;window.scopes.push(scope);return q;},order:()=>q,limit:()=>q,abortSignal:()=>q,
      maybeSingle:async()=>({data:window.failRestore?null:{id:scope.userType+':'+scope.projectId,session_id:'11111111-1111-4111-8111-111111111111'},error:window.failRestore?new Error('offline'):null}),
      then:resolve=>Promise.resolve({data:[{id:'message',role:'assistant',content:'History '+conversation,metadata:{}}]}).then(resolve)};return q;
  }})};`,
};
const tick = () => new Promise(resolve => setTimeout(resolve, 70));
async function waitFor(predicate, description) {
  const deadline = Date.now() + 10000;
  while (!predicate() && Date.now() < deadline) await tick();
  assert.ok(predicate(), description);
}
let bundle;
async function mount() {
  if (!bundle) {
    const result = await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {usePulseWidget} from './src/hooks/usePulseWidget';import {PulseSources} from './src/components/pulse/PulseSources';function Test(){window.widget=usePulseWidget();return <PulseSources sources={window.sources}/>;}window.root=createRoot(document.getElementById('root'));window.render=()=>window.root.render(<Test/>);window.render();`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"test"'},plugins:[{name:'pulse-widget-test',setup(b){
      b.onResolve({filter:/.*/},args=>mocks[args.path] ? {path:args.path,namespace:'mock'} : undefined);
      b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'js'}));
      b.onResolve({filter:/^@\//},args=>{const file=path.resolve('src',args.path.slice(2));return {path:file+(['.tsx','.ts'].find(ext=>existsSync(file+ext))??'')};});
    }}]}); bundle=result.outputFiles[0].text;
  }
  const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost',runScripts:'dangerously',pretendToBeVisual:true});
  const w=dom.window; w.crypto.randomUUID=randomUUID;
  Object.assign(w,{project:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',projectName:'Orchard',role:'founder',signedIn:true,userId:'owner',page:'/mvp-builder',scopes:[],streams:[],guestCalls:0});
  w.eval(bundle);await waitFor(()=>w.widget,'widget mounted');w.widget.openPanel();await waitFor(()=>w.widget.isOpen && !w.widget.loading,'widget history restored');return dom;
}
const close=dom=>{dom.window.root.unmount();dom.window.close();};
test('signed-in widget uses shared server context, separate history and page context; project switch blocks stale callbacks', async()=>{
  const dom=await mount(),w=dom.window;
  try {
    assert.equal(w.scopes.at(-1).channel,'widget');assert.equal(w.widget.contextLabel,'Project: Orchard');
    void w.widget.sendMessage('What should I build?');await tick();
    const first=w.streams[0];assert.equal(first.surface,'pulse_widget');assert.equal(first.pagePath,'/mvp-builder');assert.equal(w.guestCalls,0);
    first.onSources([{stage:'pmf',state:'unavailable'}]);await tick();assert.match(w.widget.contextNotice,/PMF Lab/);
    w.project='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';w.render();await tick();await tick();
    assert.equal(first.signal.aborted,true);first.onText('STALE RESPONSE');await tick();
    assert.doesNotMatch(JSON.stringify(w.widget.messages),/STALE RESPONSE|aaaaaaaa|What should I build/);
    assert.match(w.widget.messages[0].content,/bbbbbbbb/);
    w.role='mentor';w.render();await tick();await tick();
    assert.equal(w.scopes.at(-1).projectId,null);assert.match(w.widget.getQuickReplies()[0],/expertise/);
    assert.equal(w.widget.messages[0].content,'History mentor:null');
  } finally {close(dom);}
});
test('widget retries a failed turn with the same ID without duplicating the user message',async()=>{
  const dom=await mount(),w=dom.window;
  try {
    w.failStream=true;await w.widget.sendMessage('Help me');await tick();assert.match(w.widget.error,/interruption/);
    w.failStream=false;w.widget.onRetry();await tick();
    assert.equal(w.streams[0].turnId,w.streams[1].turnId);
    assert.equal(w.widget.messages.filter(message=>message.role==='user').length,1);
    w.streams[1].onText('Saved answer');w.finish();await tick();assert.equal(w.widget.error,'');
  } finally {close(dom);}
});
test('restore failure is visible, retry recovers, and logout does not expose signed-in history to guest chat',async()=>{
  const dom=await mount(),w=dom.window;
  try {
    w.failRestore=true;w.widget.closePanel();await waitFor(()=>!w.widget.isOpen,'widget closed');w.widget.openPanel();await waitFor(()=>w.widget.error.includes('restore'),'restore failure displayed');
    assert.match(w.widget.error,/restore/);assert.equal(w.widget.loading,false);
    w.failRestore=false;w.widget.onRetry();await waitFor(()=>!w.widget.error && !w.widget.loading,'retry restores history');assert.equal(w.widget.error,'');
    w.signedIn=false;w.render();await tick();assert.doesNotMatch(JSON.stringify(w.widget.messages),/History/);
    await w.widget.sendMessage('What is CT?');assert.equal(w.guestCalls,1);
    const late=w.guestChunk;w.signedIn=true;w.userId='other-user';w.render();await tick();await tick();late('PRIVATE GUEST TEXT');await tick();
    assert.doesNotMatch(JSON.stringify(w.widget.messages),/PRIVATE GUEST TEXT/);
  } finally {close(dom);}
});
test('visible source details distinguish failed/missing results and use canonical source links',async()=>{
  const dom=await mount(),w=dom.window;
  try {
    w.sources=[{stage:'pmf',state:'available',id:w.project,updatedAt:'2026-09-26T12:00:00Z',basis:'Provisional evidence',route:'javascript:alert(1)'},{stage:'gtm',state:'missing'},{stage:'icp',state:'unavailable'}];w.render();await tick();
    assert.match(w.document.body.textContent,/Context provided to Pulse/);assert.match(w.document.body.textContent,/No current saved result/);assert.match(w.document.body.textContent,/Could not load this result/);
    assert.equal(w.document.querySelector('a').getAttribute('href'),'/pmf-lab?outcome='+w.project);
  } finally {close(dom);}
});

test('approved role shortcuts and activity source links use the matching workspace; pending roles keep general guidance',async()=>{
  const dom=await mount(),w=dom.window;
  try {
    for (const [role,stage,route,reply] of [['mentor','bookings','/mentor/bookings',/bookings/],['marketplace','enquiries','/marketplace/enquiries',/reached out/],['investor','matches','/investors/matches',/matches/]]) {
      w.role=role;w.categoryAccess=true;
      w.sources=[{stage,state:'available',id:w.project,basis:'Authorized account activity',route:'https://evil.invalid'}];
      w.render();await waitFor(()=>reply.test(w.widget.getQuickReplies()[0]),'approved role shortcut');
      assert.equal(w.document.querySelector('a').getAttribute('href'),route);
    }
    w.role='mentor';w.categoryAccess=false;w.render();await waitFor(()=>/expertise/.test(w.widget.getQuickReplies()[0]),'pending mentor guidance');
    assert.doesNotMatch(w.widget.getQuickReplies().join(' '),/bookings/);
  } finally {close(dom);}
});

test('signed-out Pulse answers starter questions at once, offers follow-ups, and keeps the chat across pages', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost', runScripts: 'dangerously', pretendToBeVisual: true });
  const w = dom.window; w.crypto.randomUUID = randomUUID;
  Object.assign(w, { signedIn: false, page: '/', scopes: [], streams: [], guestCalls: 0, events: [] });
  if (!bundle) { const first = await mount(); close(first); }
  w.eval(bundle); await waitFor(() => w.widget && !w.widget.loading, 'guest widget mounted');
  w.widget.openPanel();
  await waitFor(() => w.widget.isOpen, 'panel open');
  assert.equal(JSON.stringify(w.widget.getQuickReplies()), JSON.stringify(['Who is Creatives Takeover for?', 'I have an idea. Where do I start?', 'I already have a product. How can it help?', 'Is it free? What does it cost?']));
  await w.widget.sendMessage('I have an idea. Where do I start?');
  await waitFor(() => w.widget.messages.length === 2, 'written answer shown');
  assert.equal(w.guestCalls, 0, 'a starter question makes no model call');
  const reply = w.widget.messages[1];
  assert.equal(reply.guest, true);
  assert.equal(JSON.stringify(reply.links.map(link => link.destination)), JSON.stringify(['/start?return=%2Ficp-builder', '/start?return=%2Fdemo-studio%2Ftry']));
  assert.equal(JSON.stringify(w.widget.getQuickReplies()), JSON.stringify(['How do I get started?', 'Is it free? What does it cost?']));
  assert.equal(JSON.stringify(w.events.map(event => event.event)), JSON.stringify(['pulse_guest_opened', 'pulse_guest_question_asked']));
  assert.equal(w.events[1].question_id, 'idea');
  await w.widget.sendMessage('Do you work with agencies?');
  assert.equal(w.guestCalls, 1, 'a typed question goes to the model');
  assert.equal(w.events[2].question_id, 'typed');
  w.root.unmount();
  // Pulse is hidden on some pages (the quiz); coming back restores the chat.
  const again = w.document.createElement('div'); again.id = 'root'; w.document.body.replaceChildren(again);
  w.widget = null; w.eval(bundle);
  await waitFor(() => w.widget && w.widget.messages.length >= 2 && w.widget.messages[1].links?.length === 2, 'guest chat restored');
  assert.equal(w.widget.messages[0].content, 'I have an idea. Where do I start?');
  w.root.unmount(); w.close();
});
