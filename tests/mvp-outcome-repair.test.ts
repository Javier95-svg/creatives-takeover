import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeRepairFiles,repairOutcome} from '../supabase/functions/_shared/mvp-outcome-repair.ts';
test('repair merge preserves unrelated files and rejects dependency, duplicate and invented paths',()=>{
 const files=[{filename:'index.html',content:'old'},{filename:'style.css',content:'retained'},{filename:'package.json',content:'{}'}];
 assert.equal(mergeRepairFiles(files,[{filename:'index.html',content:'new'}])[1].content,'retained');
 assert.equal(files[0].content,'old');
 for(const patch of [[{filename:'server.js',content:'new'}],[{filename:'package.json',content:'changed'}],[{filename:'index.html',content:'one'},{filename:'index.html',content:'two'}]])assert.throws(()=>mergeRepairFiles(files,patch));
});

test('provider outages return the repair slot while unusable code consumes an attempt',async()=>{
 const originalFetch=globalThis.fetch,originalDeno=(globalThis as any).Deno;const calls:string[]=[];
 (globalThis as any).Deno={env:{get:()=> 'test-key'}};
 const db={rpc:async(name:string)=>{calls.push(name);return {data:name==='claim_mvp_outcome_repair'?{id:'repair',snapshot:{files:[{filename:'index.html',content:'old'}]},attempt:1}:null,error:null};},from:()=>({update:()=>({eq:()=>({eq:async()=>{calls.push('failed-code');return {};}})})})};
 try{
  globalThis.fetch=async()=>new Response('',{status:503});
  await assert.rejects(repairOutcome(db,'owner','test'),/attempt is preserved/);
  assert.deepEqual(calls,['claim_mvp_outcome_repair','release_mvp_repair_attempt']);calls.length=0;
  globalThis.fetch=async()=>{throw Error('Network down');};
  await assert.rejects(repairOutcome(db,'owner','test'),/attempt is preserved/);
  assert.deepEqual(calls,['claim_mvp_outcome_repair','release_mvp_repair_attempt']);calls.length=0;
  globalThis.fetch=async()=>new Response(JSON.stringify({content:[{type:'text',text:'invalid repair JSON'}]}));
  await assert.rejects(repairOutcome(db,'owner','test'));
  assert.deepEqual(calls,['claim_mvp_outcome_repair','failed-code']);
 }finally{globalThis.fetch=originalFetch;(globalThis as any).Deno=originalDeno;}
});
