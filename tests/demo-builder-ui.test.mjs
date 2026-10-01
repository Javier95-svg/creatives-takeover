import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
test('mobile workflow setup and demo navigation work with real components',async()=>{
 const bundle=await build({stdin:{loader:'tsx',resolveDir:process.cwd(),contents:`
 import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
 import {MVPWorkflowPanel} from './src/components/mvp-builder/MVPWorkflowPanel';
 import Player from './src/components/demo-studio/player/DemoPlayer';
 function App(){const [setup,setSetup]=useState({productName:'Test',template:'blank'});const [single,setSingle]=useState(false);
 const screen={asset_url:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="%23eeeeee"/></svg>',asset_type:'image',caption:'A useful screen',hotspots:[]};
 const steps=single?[{...screen,id:'a'}]:[{...screen,id:'a',hotspots:[{id:'h',step_id:'a',x:0,y:0,w:.5,h:.5,label:'Jump to result',action:'goto',action_target:'c'}]},{...screen,id:'b'},{...screen,id:'c'}];
 return <main className="mx-auto max-w-4xl p-3"><MVPWorkflowPanel setup={setup} onChange={v=>{setSetup(v);window.scope=v;}} hasFiles={false} connected={true} onBuild={()=>window.built=true} onTest={()=>{}} testing={false} result={null} dirty={false} fallback={false} projectId="10000000-0000-0000-0000-000000000001"/><button onClick={()=>setSingle(true)}>Use one screen</button><Player key={String(single)} steps={steps} theme={{endCtaLabel:'Try product',endCtaHref:'https://example.com/try'}} mode="preview"/></main>};createRoot(document.getElementById('root')).render(<App/>);
 `},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"test"'},plugins:[{name:'test-boundaries',setup(b){
  b.onResolve({filter:/schema\.sql\?raw$/},a=>({path:path.resolve(a.resolveDir,a.path.replace('?raw','')),namespace:'raw'}));
  b.onLoad({filter:/.*/,namespace:'raw'},a=>({contents:'export default '+JSON.stringify(readFileSync(a.path,'utf8')),loader:'js'}));
  b.onResolve({filter:/demoStudio\/(events|demoExport)$/},a=>({path:a.path,namespace:'mock'}));
  b.onResolve({filter:/^sonner$/},a=>({path:a.path,namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const toast={success(){},error(){}};export const trackDemoEvent=async()=>{};export const submitDemoResponse=async()=>{};export const exportDemoGif=async()=>{};export const exportDemoVideo=async()=>{};export const exportNarratedDemoVideo=async()=>{};export const downloadBlob=()=>{};'}));
  b.onResolve({filter:/^@\//},a=>{const f=path.resolve('src',a.path.slice(2));return {path:f+(['.tsx','.ts'].find(e=>existsSync(f+e))||'')};});
 }}]});
 const browser=await chromium.launch({headless:true});try{
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://ct-ui.test/**',r=>r.fulfill({contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div></body></html>'}));
  await page.goto('http://ct-ui.test');for(const f of readdirSync('dist/assets').filter(f=>f.endsWith('.css')))await page.addStyleTag({content:readFileSync('dist/assets/'+f,'utf8')});await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForSelector('select',{timeout:3000}).catch(()=>{throw new Error('UI did not mount: '+errors.join(' | '));});
  await page.getByLabel('Starter').selectOption('customer_portal');await page.getByLabel('Who uses it?').fill('Freelance designers');
  await page.getByLabel('Essential features').fill('Sign in\nSave a task\nMy tasks\nA fourth feature');
  assert.equal(await page.evaluate(()=>window.scope.workflow.features.length),3);
  await page.getByRole('button',{name:'Review scope and build price'}).click();assert.equal(await page.evaluate(()=>window.built),true);
  await page.getByRole('button',{name:'Jump to result'}).click();assert.ok(await page.getByText('3 of 3',{exact:true}).isVisible());
  await page.keyboard.press('ArrowLeft');assert.ok(await page.getByText('2 of 3',{exact:true}).isVisible());
  await page.getByRole('button',{name:'Use one screen'}).click();await page.getByRole('button',{name:'Next',exact:true}).click();
  assert.equal(await page.getByRole('link',{name:'Try product'}).getAttribute('href'),'https://example.com/try');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
