import {test} from 'node:test';
import assert from 'node:assert/strict';
import {APP_RUNTIME_V1} from '../supabase/functions/_shared/mvp-app-runtime.ts';
const {createAppClient}=await import('data:text/javascript;base64,'+Buffer.from(APP_RUNTIME_V1).toString('base64'));
test('reviewed browser runtime rejects privileged keys and never turns failed writes into success',async()=>{
 const originalFetch=globalThis.fetch,originalStorage=globalThis.localStorage;
 const stored=new Map();globalThis.localStorage={getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)};
 try{
  assert.throws(()=>createAppClient({url:'https://app.supabase.co',publicKey:'sb_secret_no',appId:'app'}),/public/);
  const config={url:'https://app.supabase.co',publicKey:'sb_publishable_test0000',appId:'app'};
  const app=createAppClient(config);
  await assert.rejects(app.records.create({title:'Private note'}),/Sign in/);
  globalThis.fetch=async()=>new Response(JSON.stringify({access_token:'test-session',refresh_token:'refresh',user:{id:'user'}}),{status:200});
  await app.auth.signIn('test@example.invalid','password');
  assert.ok(createAppClient(config).auth.session().access_token);
  assert.equal(createAppClient({...config,appId:'other'}).auth.session(),null);
  globalThis.fetch=async()=>new Response(JSON.stringify({message:'Write rejected'}),{status:403});
  await assert.rejects(app.records.create({title:'Private note'}),/Write rejected/);
  globalThis.fetch=async()=>new Response('[]',{status:200});
  await assert.rejects(app.records.update('unknown',{status:'done'}),/not saved/);
  globalThis.fetch=async()=>new Response(JSON.stringify({message:'Session expired'}),{status:401});
  await assert.rejects(app.records.list(),/Session expired/);
  assert.equal(app.auth.session(),null);
 }finally{globalThis.fetch=originalFetch;if(originalStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=originalStorage;}
});
