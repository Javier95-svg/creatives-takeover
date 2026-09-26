import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
const require = createRequire(import.meta.url);
try { require.cache[require.resolve('canvas')] = { exports: {}, loaded: true }; } catch { /* optional */ }
const { JSDOM } = await import('jsdom');
const mocks = {
  '@/contexts/AuthContext': `export const useAuth=()=>({user:{id:'owner',user_metadata:{}}});`,
  '@/contexts/DashboardDataContext': `export const DashboardDataProvider=({children})=>children; export const useDashboardData=()=>({refresh(){}});`,
  '@/hooks/useStartupCommandCenter': `export const useStartupCommandCenter=()=>({refresh(){}});`,
  '@/hooks/useAssignedStage': `export const useAssignedStage=()=>1;`,
  '@/hooks/useProjects': `export const useProjects=()=>({activeProjectId:window.project});`,
  '@/hooks/useAccountContext': `export const useAccountContext=()=>({userType:window.role});`,
  '@/hooks/useAccountHomeDigest': `export const useAccountHomeDigest=()=>({});`,
  '@/lib/personaHome': `export const personaHome=()=>null; export const personaChips=()=>[];export const personaFocus=()=>[];export const personaInterestSummary=()=>'';`,
  '@/config/dashboardToolRegistry': `export const getDashboardTool=()=>null;`,
  '@/lib/analytics': `export const captureEvent=()=>{};`,
  '@/services/pulseHomeStream': `export const streamPulseHome=args=>{window.stream=args;return new Promise((_resolve,reject)=>args.signal.addEventListener('abort',()=>reject(new Error('aborted'))));};`,
  './PulseHomeView': `export const PulseHomeView=props=>{window.props=props;return null;};`,
  '@/integrations/supabase/client': `export const supabase={schema:()=>({from(table){
    let scope,conversation;
    const q={select:()=>q,eq:(key,value)=>{if(key==='conversation_id')conversation=value;return q;},contains:(_key,value)=>{scope=value.pulseScope;window.scopes.push(scope);return q;},or:(value)=>{window.historyFilter=value;return q;},order:()=>q,limit:()=>q,abortSignal:()=>q,
      maybeSingle:async()=>({data:{id:scope.userType+':'+scope.projectId,session_id:'11111111-1111-4111-8111-111111111111'}}),
      then:resolve=>Promise.resolve({data:[{id:'message',role:'assistant',content:'History '+conversation,metadata:{}}]}).then(resolve)};return q;
  }})};`,
};
const tick = () => new Promise(resolve => setTimeout(resolve, 60));
test('switching projects or account type restores only matching history and aborts the previous stream', async () => {
  const result = await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Pulse from './src/components/pulse/PulseHomeLive';window.root=createRoot(document.getElementById('root'));window.render=()=>window.root.render(<Pulse concept="founder-guide"/>);window.render();`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"test"'},plugins:[{name:'pulse-test',setup(b){
    b.onResolve({filter:/.*/},args=>mocks[args.path] ? {path:args.path,namespace:'mock'} : undefined);
    b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'js'}));
    b.onResolve({filter:/^@\//},args=>{const file=path.resolve('src',args.path.slice(2));return {path:file+(['.tsx','.ts'].find(ext=>existsSync(file+ext))??'')};});
  }}]});
  const dom = new JSDOM('<div id="root"></div>',{url:'http://localhost',runScripts:'dangerously',pretendToBeVisual:true});
  const w = dom.window;
  w.crypto.randomUUID = randomUUID;
  w.project='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';w.role='founder';w.scopes=[];
  try {
    w.eval(result.outputFiles[0].text);await tick();await tick();
    assert.match(w.props.messages[0].content, /aaaaaaaa/);
    w.props.onSend('Help me');await tick();
    const previous = w.stream;
    assert.equal(previous.projectId, w.project);
    w.project='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';w.render();await tick();await tick();
    assert.equal(previous.signal.aborted,true);
    assert.match(w.props.messages[0].content,/bbbbbbbb/);
    assert.doesNotMatch(JSON.stringify(w.props.messages),/aaaaaaaa|Help me/);
    w.role='mentor';w.render();await tick();await tick();
    assert.equal(w.scopes.at(-1).projectId,null);
    assert.equal(w.props.messages[0].content,'History mentor:null');
  } finally { w.root.unmount();w.close(); }
});
