import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {PGlite} from '@electric-sql/pglite';
import {checkCustomerWorkflow} from '../workers/mvp-workflow/outcomes.mjs';
import {buildArtifact} from '../workers/mvp-workflow/build.mjs';

// Browser behavior + actual PostgreSQL persistence. No production service or customer data.
test('outcome checks exercise all starters and reject no-op, fake success and failed writes',async t=>{
 const browser=await chromium.launch({headless:true});const db=new PGlite();
 await db.exec('CREATE TABLE records(email text,body text,status text DEFAULT \'new\');');
 try{
 for(const [starter,behavior] of [['lead_capture','working'],['request_management','working'],['customer_portal','working'],['lead_capture','noop'],['lead_capture','fake'],['request_management','write-fails']]){
  await t.test(starter+' / '+behavior,async()=>{
   await db.exec('DELETE FROM records');let wrote=false;
   const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const html=`<!doctype html><meta name="viewport" content="width=device-width"><style>body{overflow-wrap:anywhere}input{max-width:90vw}form{display:flex;flex-wrap:wrap}</style><form id="login"><input data-testid="ct-login-email"><input data-testid="ct-login-password"><button data-testid="ct-login-submit">Sign in</button></form><form id="form"><input data-testid="ct-email"><input data-testid="ct-body"><button data-testid="ct-submit">Save</button></form><p data-testid="ct-success" hidden>Saved</p><main id="list"></main><script>
    const mode=${JSON.stringify(behavior)};const field=id=>document.querySelector('[data-testid="'+id+'"]');
    function draw(rows){list.replaceChildren();for(const row of rows){const d=document.createElement('div');d.dataset.testid='ct-record';d.append(document.createTextNode(row.email+' '+row.body));const select=document.createElement('select');select.dataset.testid='ct-status';select.innerHTML='<option>new</option><option>done</option>';select.value=row.status;const button=document.createElement('button');button.dataset.testid='ct-save-status';button.textContent='Update';button.onclick=async()=>{await fetch('/records',{method:'PATCH',body:JSON.stringify({status:select.value})});};d.append(select,button);list.append(d);}}
    async function load(){if(mode==='fake' && window.fakeRecord){draw([window.fakeRecord]);return;}draw(await (await fetch('/records')).json());}
    login.onsubmit=e=>{e.preventDefault();load();};
    form.onsubmit=async e=>{e.preventDefault();if(mode==='noop')return;const record={email:field('ct-email').value,body:field('ct-body').value,status:'new'};if(mode==='fake'){window.fakeRecord=record;field('ct-success').hidden=false;draw([record]);return;}const r=await fetch('/records',{method:'POST',body:JSON.stringify(record)});if(!r.ok)return;field('ct-success').hidden=false;await load();};load();
    </script>`;
   await context.route('http://ct-app.test/**',async route=>{
    if(new URL(route.request().url()).pathname!=='/records')return route.fulfill({contentType:'text/html',body:html});
    const request=route.request();const data=request.postDataJSON();
    if(request.method()==='POST'){
     if(behavior==='write-fails')return route.fulfill({status:500,body:'Database unavailable'});
     await db.query('INSERT INTO records(email,body) VALUES($1,$2)',[data.email,data.body]);wrote=true;
    }
    if(request.method()==='PATCH')await db.query('UPDATE records SET status=$1',[data.status]);
    return route.fulfill({contentType:'application/json',body:JSON.stringify((await db.query('SELECT * FROM records')).rows)});
   });
   const assertions={};const account={email:'test@example.invalid',password:'test',token:'owner'};
   const run=()=>checkCustomerWorkflow({page,starter,accounts:{owner:account,customer:account,other:{token:'other'}},readRows:async(token,field,value)=>token==='other'?[]:(await db.query('SELECT * FROM records WHERE '+field+'=$1',[value])).rows,writeConfirmed:()=>wrote,assertions,errors,timeout:behavior==='working'?5000:600});
   if(behavior==='working'){await run();assert.equal(assertions.persisted_after_reload,true);assert.equal(assertions.database_write,true);}else if(behavior==='fake')await assert.rejects(run(),/No confirmed database record/);else await assert.rejects(run());
   await context.close();
  });
 }
 }finally{await browser.close();await db.close();}
});

test('React artifact is built from the saved revision without executing project scripts',async()=>{
 const files=await buildArtifact({projectType:'react_vite',files:[{filename:'index.html',content:'<html><head></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>'},{filename:'src/main.tsx',content:'import React from "react";import {createRoot} from "react-dom/client";createRoot(document.getElementById("root")).render(<button>Saved revision</button>);'},{filename:'package.json',content:'{"scripts":{"build":"exit 99","postinstall":"exit 99"}}'}]});
 assert.ok(files.some(f=>f.filename==='index.html' && f.content.includes('/assets/')));assert.ok(files.some(f=>f.filename.endsWith('.js') && f.content.includes('Saved revision')));
 await assert.rejects(buildArtifact({files:[{filename:'../secret',content:'no'}]}),/Invalid project/);
});
