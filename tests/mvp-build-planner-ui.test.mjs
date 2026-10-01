import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';

test('prompt-first planner keeps categories internal and shows connection and price requirements',async()=>{
  const bundle=await build({stdin:{loader:'tsx',resolveDir:process.cwd(),contents:`
  import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
  import {MVPBuildPlanner} from './src/components/mvp-builder/MVPBuildPlanner';
  function App(){const [setup,setSetup]=useState({template:'blank'});return <MVPBuildPlanner setup={setup} onChange={v=>setSetup(p=>{const n={...p,...v};window.plan=n;return n;})} hasFiles={false} busy={false} workerAvailable={false} connected={false} onBuild={()=>window.quoted=window.plan}/>};createRoot(document.getElementById('root')).render(<App/>);
  `},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"test"'},plugins:[{name:'aliases',setup(b){b.onResolve({filter:/^@\//},a=>{const f=path.resolve('src',a.path.slice(2));return {path:f+(['.tsx','.ts'].find(e=>existsSync(f+e))||'')};});}}]});
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('http://ct-planner.test/**',r=>r.fulfill({contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div></body></html>'}));
    await page.goto('http://ct-planner.test');
    for(const f of readdirSync('dist/assets').filter(f=>f.endsWith('.css')))await page.addStyleTag({content:readFileSync('dist/assets/'+f,'utf8')});
    await page.addScriptTag({content:bundle.outputFiles[0].text});
    assert.equal(await page.getByRole('button',{name:'Online store',exact:true}).count(),0);
    await page.getByLabel('Describe your app').fill('A simple store for handmade ceramics');
    assert.equal(await page.getByRole('button',{name:'Review price and build'}).isEnabled(),true);
    await page.getByText('App details and connections',{exact:true}).click();
    await page.getByLabel('Hosted checkout link').fill('javascript:alert(1)');
    assert.equal(await page.getByRole('button',{name:'Review price and build'}).isDisabled(),true);
    await page.getByLabel('Hosted checkout link').fill('https://buy.stripe.com/example');
    await page.getByRole('button',{name:'Review price and build'}).click();
    assert.equal(await page.evaluate(()=>window.quoted.buildBrief.kind),'store');
    assert.equal(await page.evaluate(()=>window.quoted.buildBrief.delivery),'preview');
    await page.getByLabel('Use my connected app database').check();
    assert.equal(await page.getByRole('button',{name:'Review price and build'}).isDisabled(),true);
    assert.equal(await page.getByText(/Connect your app database under Advanced/).isVisible(),true);
    await page.getByLabel('Use my connected app database').uncheck();
    await page.getByLabel('Describe your app').fill('A multi-vendor marketplace');
    assert.equal(await page.getByRole('button',{name:'Review price and build'}).isDisabled(),true);
    assert.equal(await page.getByRole('alert').isVisible(),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});
