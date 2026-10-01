import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';

test('mobile planner supports six categories, preview without connections, and clear launch restrictions',async()=>{
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
    for(const label of ['Landing page','Web & mobile app','Dashboard','Online store','SaaS MVP','Internal tool']){
      await page.getByRole('button',{name:label,exact:true}).click();
      await page.getByLabel('Who is it for?').fill('Independent founders');
      assert.equal(await page.getByRole('button',{name:'Review plan and price'}).isEnabled(),true);
    }
    await page.getByRole('button',{name:'Online store',exact:true}).click();
    await page.getByLabel('Hosted checkout URL').fill('javascript:alert(1)');
    assert.equal(await page.getByRole('button',{name:'Review plan and price'}).isDisabled(),true);
    await page.getByLabel('Hosted checkout URL').fill('https://buy.stripe.com/example');
    await page.getByRole('button',{name:'Review plan and price'}).click();
    assert.equal(await page.evaluate(()=>window.quoted.buildBrief.kind),'store');
    assert.equal(await page.evaluate(()=>window.quoted.buildBrief.delivery),'preview');
    await page.getByRole('radio',{name:/Build with my connected database/}).check();
    assert.equal(await page.getByRole('button',{name:'Review plan and price'}).isDisabled(),true);
    assert.equal(await page.getByText(/Open Database to connect/).isVisible(),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});
