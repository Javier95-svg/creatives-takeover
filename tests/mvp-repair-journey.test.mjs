import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import path from 'node:path';
test('check repairs twice, reloads each source and publishes only the fresh passing test',async()=>{
 const bundle=await build({stdin:{loader:'tsx',resolveDir:process.cwd(),contents:`
 import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {useMvpWorkflowTest} from './src/hooks/useMvpWorkflowTest';
 window.calls=[];window.version=0;
 function App(){const [draft,setDraft]=useState('v0');const t=useMvpWorkflowTest('project',draft,async()=>true,false,false,async()=>{setDraft('v'+window.version);});return <><button disabled={!t.available||t.testing} onClick={()=>t.run()}>Check</button><p id="status">{t.progress}</p><p id="publish">{t.testRunId||''}</p></>};createRoot(document.getElementById('root')).render(<App/>);
 `},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"test"'},plugins:[{name:'mock-client',setup(b){b.onResolve({filter:/^@\/integrations\/supabase\/client$/},()=>({path:'client',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({loader:'js',contents:`
 const row=()=>({id:'test'+window.version,revision:'revision'+window.version,status:window.version<2?'failed':'passed',assertions:{cleanup:true,customer_task:window.version>=2}});
 export const supabase={functions:{invoke:async(name,{body})=>{window.calls.push(body.action);if(body.action==='status')return {data:{available:true,profiles:['customer_portal']}};if(body.action==='repair'){window.version++;return {data:{repaired:true,changedFiles:['index.html']}};}return {data:{id:'test'+window.version}};}},rpc:async()=>({data:window.version?[row()]:[]}),from:()=>({select:()=>({eq:()=>({single:async()=>({data:row()})})})})};
 `}));}}]});
 const browser=await chromium.launch({headless:true});
 try{const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setContent('<div id="root"></div>');await page.addScriptTag({content:bundle.outputFiles[0].text});await page.getByRole('button',{name:'Check',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#publish').textContent==='test2');assert.equal(await page.evaluate(()=>window.calls.filter(x=>x==='repair').length),2);assert.equal(await page.evaluate(()=>window.calls.filter(x=>x==='request').length),3);assert.deepEqual(errors,[]);}finally{await browser.close();}
});
