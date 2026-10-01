import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url);
try{require.cache[require.resolve('canvas')]={exports:{createCanvas:undefined},loaded:true};}catch{}
const {JSDOM}=await import('jsdom');
const tick=()=>new Promise(resolve=>setTimeout(resolve,60));
const mocks={
 '@/components/SEO':'export default ()=>null;',
 '@/contexts/AuthContext':'export const useAuth=()=>({user:null});',
 'react-router-dom':`export const useParams=()=>({slug:'survey'});export const useSearchParams=()=>[new URLSearchParams(window.location.search)];export const Link=()=>null;`,
 'sonner':`export const toast={success:()=>{},error:(m)=>window.errors.push(m)};`,
 '@/integrations/supabase/client':`const query={select(){return this},eq(){return this},maybeSingle:async()=>({data:{id:'survey',slug:'survey',product_name:'Product'}})};export const supabase={from:()=>query,functions:{invoke:async(name,{body})=>{window.requests.push({name,body});if(body.action==='guest_view')return{data:{session:window.guest}};return {data:{success:true}};}}};`,
};
async function mount(component,url='https://ct.test/',guest){
 const result=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Component from './${component}';window.root=createRoot(document.getElementById('root'));window.root.render(<Component/>);`,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"test"','import.meta.env.VITE_VALIDATION_SESSIONS_ENABLED':'"true"'},plugins:[{name:'mock-boundaries',setup(b){b.onResolve({filter:/.*/},a=>mocks[a.path]?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js'}));b.onResolve({filter:/^@\//},a=>{const file=path.resolve('src',a.path.slice(2));return{path:file+(['.tsx','.ts'].find(ext=>existsSync(file+ext))||'')};});}}]});
 const dom=new JSDOM('<div id="root"></div>',{url,runScripts:'dangerously',pretendToBeVisual:true});Object.defineProperty(dom.window.crypto,'randomUUID',{value:()=> '10000000-0000-0000-0000-000000000001'});dom.window.requests=[];dom.window.errors=[];dom.window.guest=guest;dom.window.eval(result.outputFiles[0].text);await tick();await tick();return dom;
}
function close(dom){dom.window.root.unmount();dom.window.close();}
test('survey keeps concept feedback outside the Sean Ellis question and requires usage screening',async()=>{
 const dom=await mount('src/pages/pmf/PMFSurveyPage.tsx');try{
  const doc=dom.window.document;
  assert.ok(!doc.body.textContent.includes('Very disappointed'));
  const concept=doc.querySelector('input[value="concept_only"]');assert.ok(concept);concept.click();await tick();
  assert.ok(!doc.body.textContent.includes('Very disappointed'));
  doc.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
  const request=dom.window.requests.find(r=>r.name==='pmf-survey-respond');assert.ok(request,dom.window.errors.join('; '));assert.equal(request.body.productUsage,'concept_only');assert.equal(request.body.seanEllisAnswer,'');
 }finally{close(dom);}
});
test('an external reviewer can open a private booking link without a CT account',async()=>{
 const guest={id:'s',status:'invited',offered_slots:['2026-10-15T15:00:00Z']};const dom=await mount('src/pages/ValidationSessionsPage.tsx','https://ct.test/validation-sessions?invite=private-token',guest);try{
  const text=dom.window.document.body.textContent;assert.ok(text.includes('No CT account is needed'));assert.ok(text.includes('Book session'));assert.ok(!text.includes('Sign in to book'));
  assert.equal(dom.window.document.querySelectorAll('select option').length,2);
  assert.equal(dom.window.requests[0].body.guestToken,'private-token');assert.equal(dom.window.errors.length,0);
 }finally{close(dom);}
});
